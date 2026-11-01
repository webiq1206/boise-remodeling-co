import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";
import { getUncachableEmailClient } from "@/server/services/emailTransport";
import { SITE_CONFIG } from "@/shared/siteConfig";
import {
  htmlToPlainText,
  getAdminRecipientEmails,
  formatFromAddress,
  getReplyToAddress,
} from "@/server/services/emailLayout";
import {
  buildAdminEmailHtml,
  buildCustomerEmailHtml,
  buildAdminSubject,
  buildCustomerSubject,
  formatLeadReplyTo,
  type VerifiedEstimate,
  type PropertyEnrichment,
  formatUsd,
} from "@/server/services/consultationEmail";
import type { PropertyProfile } from "@/shared/propertyProfile";
import { HOUSE_NUMBER_REGEX } from "@/shared/addressValidation";
import {
  EMPTY_REFINEMENTS,
  calculateEstimate,
  countVisibleUserRefinements,
  getProjectSizeConfig,
  getSetRefinementKeys,
  PROJECT_LABELS,
  type EstimateRefinements,
} from "@/shared/estimateEngine";
import { resolveQuotedRange } from "@/shared/costs/resolve";
import { IMPLAUSIBLE_QUOTE_CEILING, logPricingAlert } from "@/server/services/pricingAlerts";
import { dashboardEmail, forwardToLeadDashboardAsync } from "@/server/services/leadDashboardForward";
import { forwardConsultationToP5Intake } from "@/server/services/p5IntakeBridge";
import { issueRequestDetailsToken } from "@/server/services/requestDetailsToken";
import { absoluteStoredUrl } from "@/server/services/requestFiles";
import { MAX_REQUEST_FILES, checkRequestFile, safeRequestFileName } from "@/shared/requestFiles";
import { SHORT_REQUEST_PROJECT_TYPE, UNSPECIFIED_PROJECT_TYPE } from "@/shared/requestDetails";
import {
  acceptInquiry,
  InquiryRejectedError,
  recordDeliveryStatus,
} from "@/server/services/inquiryAcceptance";
import { readUnitCostOverrides } from "@/lib/unitCostOverrides";
import {attributionSchema,submissionAttribution,attributionCrmMetadata} from '@/lib/p5/marketingAttribution';
import {
  buildCrmIntakeFields,
  buildLeadPropertyRecord,
  buildLeadEstimateRecord,
  buildLeadNotes,
  resolveBudgetRange,
  buildProjectGoals,
} from "@/server/services/leadRecord";

const propertyProfileSchema = z
  .object({
    formattedAddress: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  })
  .passthrough()
  .optional()
  .nullable();

const refinementsSchema = z
  .object({
    layoutChanges: z.enum(["none", "moderate", "major"]).nullable().optional(),
    plumbingElectrical: z.enum(["cosmetic", "partial", "full"]).nullable().optional(),
    cabinetTier: z.enum(["standard", "semi-custom", "custom"]).nullable().optional(),
    fixtureCount: z.number().int().min(1).max(8).nullable().optional(),
    stories: z.number().int().min(1).max(2).nullable().optional(),
    roomCount: z.number().int().min(1).max(12).nullable().optional(),
    bathroomCount: z.number().int().min(0).max(12).nullable().optional(),
    kitchenIncluded: z.boolean().nullable().optional(),
    aduConfig: z.enum(["detached", "attached"]).nullable().optional(),
    // Partial-scope chips (kitchen/bathroom). Omitting this from the schema
    // meant zod STRIPPED it from the client payload, so the server recomputed
    // a full-scope price while the page showed a partial-scope one - the
    // email and CRM disagreed with the screen by up to 180%. Unknown ids are
    // harmless (scope rules ignore them); null/absent means full scope.
    upgradeScope: z.array(z.string().max(24)).max(8).nullable().optional(),
  })
  .optional()
  .nullable();

const estimateSchema = z
  .object({
    project: z.enum(["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"]),
    finish: z.enum(["refresh", "mid-range", "high-end", "luxury"]),
    sqft: z.number().int().positive(),
    priceLow: z.number().nonnegative(),
    priceHigh: z.number().nonnegative(),
    roi: z.number(),
    // Optional: the homeowner's own budget, typed after they saw the range.
    statedBudget: z.number().positive().max(50_000_000).nullable().optional(),
    confidence: z.string().max(80).optional(),
    refinements: refinementsSchema,
    // The visitor-facing labels for the layout card and upgrade chips they
    // chose. Length-capped here and escaped at render, so the emails can
    // restate every selection verbatim without trusting the client.
    layoutLabel: z.string().max(60).optional(),
    upgradeLabels: z.array(z.string().max(40)).max(12).optional(),
  })
  .optional()
  .nullable();

const bodySchema = z.object({
  attribution: attributionSchema.optional(),
  inquiryId: z.string().uuid(),
  formStartedAt: z.number().int().positive(),
  website: z.string().max(200).optional(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().refine((value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }, "Invalid phone"),
  /* Optional on the short request (and so on a callback request), required on the full
     consultation form below. The lead dashboard needs one, so a lead without it is forwarded
     with dashboardEmail()'s no-email placeholder, as chat leads always have been. */
  email: z.string().email().or(z.literal("")).optional(),
  address: z.string().trim().max(300).optional(),
  zip: z.string().optional(),
  projectType: z.string().min(1),
  message: z.string().max(8000).optional(),
  /* The short request (homepage #request-form and the contact page). Address stays required on
     the full consultation form. */
  requestKind: z.literal("short").optional(),
  /* Short request: how the visitor wants us to reach them. */
  contactPreference: z.enum(["call", "text", "email"]).optional(),
  /* Short request, "Have us call you": name and phone only, filed as a callback request. */
  callback: z.boolean().optional(),
  bestTime: z.string().trim().max(40).optional(),
  /* Short request: names of the files the browser uploads right after this lead is saved. */
  pendingFiles: z.array(z.string().max(120)).max(MAX_REQUEST_FILES).optional(),
  propertyProfile: propertyProfileSchema,
  estimate: estimateSchema,
  /* Set by the client when the visitor already submitted the estimate gate,
     which already sent admin + customer emails via /api/estimate-lead.
     Prevents duplicate email sends when the same person submits both forms. */
  skipEmail: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.requestKind === "short") {
    if (!data.callback && (data.message?.trim().length ?? 0) < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["message"],
        message: "Tell us what we should look at.",
      });
    }
    if (data.contactPreference === "email" && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Add your email so we can email you back.",
      });
    }
    return;
  }
  if (data.callback) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["callback"],
      message: "Callback requests use the short request.",
    });
  }
  if (!data.email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["email"],
      message: "Please enter a valid email",
    });
  }
  const address = data.address?.trim() ?? "";
  if (address.length < 5 || !HOUSE_NUMBER_REGEX.test(address)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["address"],
      message: "Please enter your property address",
    });
  }
});

/**
 * Recomputes the planning range server-side from the submitted inputs so a
 * stored lead never carries client-tampered or stale numbers. Returns null
 * (estimate rejected) if the inputs themselves are out of bounds.
 */
function verifyEstimate(
  estimate: NonNullable<z.infer<typeof estimateSchema>>
, alertKinds: string[]): VerifiedEstimate | null {
  const sizeConfig = getProjectSizeConfig(estimate.project);
  // CLAMP rather than bail. Returning null here made the route insert a lead
  // with every estimate field empty while still telling the visitor
  // "success" - reachable through a stale sessionStorage restore. The UI
  // slider enforces these same bounds, so a clamped value matches what any
  // legitimate client could have produced; the clamp is alerted on so a
  // drifted client build gets noticed.
  const requestedSqft = estimate.sqft;
  const sqft = Math.min(sizeConfig.max, Math.max(sizeConfig.min, estimate.sqft));
  if (sqft !== requestedSqft) {
    alertKinds.push("estimate-unresolvable");
    logPricingAlert("estimate-unresolvable", {
      route: "consultation",
      reason: "sqft-out-of-bounds-clamped",
      requestedSqft,
      clampedTo: sqft,
      project: estimate.project,
    });
  }
  estimate = { ...estimate, sqft };

  const refinements: EstimateRefinements = {
    ...EMPTY_REFINEMENTS,
    ...(estimate.refinements ?? {}),
  } as EstimateRefinements;

  const detailCount = countVisibleUserRefinements(estimate.project, getSetRefinementKeys(refinements));
  const guide = calculateEstimate(
    {
      project: estimate.project,
      finish: estimate.finish,
      sqft: estimate.sqft,
      refinements,
    },
    detailCount
  );
  // The quoted range comes from the line-item cost engine, via the same shared
  // resolver the calculator uses, so the page and the email can never disagree.
  const lineItemRange = resolveQuotedRange(
    estimate.project,
    estimate.finish,
    estimate.sqft,
    refinements,
  );
  const recomputed = { ...guide, ...(lineItemRange ?? {}) };

  if (
    estimate.priceLow !== recomputed.priceLow ||
    estimate.priceHigh !== recomputed.priceHigh
  ) {
    alertKinds.push("recompute-mismatch");
    logPricingAlert("recompute-mismatch", {
      route: "consultation",
      clientLow: estimate.priceLow,
      clientHigh: estimate.priceHigh,
      serverLow: recomputed.priceLow,
      serverHigh: recomputed.priceHigh,
      project: estimate.project,
      finish: estimate.finish,
      sqft: estimate.sqft,
    });
  }

  // The engine cannot produce these; if one appears, something upstream of
  // the price is broken and the lead must say so rather than look normal.
  if (recomputed.priceLow <= 0 || recomputed.priceHigh <= 0) {
    alertKinds.push("zero-total");
    logPricingAlert("zero-total", {
      route: "consultation",
      priceLow: recomputed.priceLow,
      priceHigh: recomputed.priceHigh,
      project: estimate.project,
      finish: estimate.finish,
      sqft: estimate.sqft,
    });
  } else if (recomputed.priceHigh > IMPLAUSIBLE_QUOTE_CEILING) {
    alertKinds.push("implausible-total");
    logPricingAlert("implausible-total", {
      route: "consultation",
      priceHigh: recomputed.priceHigh,
      ceiling: IMPLAUSIBLE_QUOTE_CEILING,
      project: estimate.project,
      finish: estimate.finish,
      sqft: estimate.sqft,
    });
  }

  return {
    project: estimate.project,
    finish: estimate.finish,
    sqft: estimate.sqft,
    priceLow: recomputed.priceLow,
    priceHigh: recomputed.priceHigh,
    roi: recomputed.roi,
    confidence: estimate.confidence || recomputed.confidenceLabel,
    statedBudget: estimate.statedBudget ?? null,
    refinements,
    included: recomputed.included,
    layoutLabel: estimate.layoutLabel,
    upgradeLabels: estimate.upgradeLabels,
  };
}

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  call: "Call me",
  text: "Text me",
  email: "Email me",
};

/**
 * The short request (homepage #request-form, contact page). Same lead record as /api/consultation
 * JSON. Photos and plans are optional and are not accepted on the long consultation form.
 *
 * Quote form v2: files no longer ride this request. The lead is saved first and answered with a
 * request id and a short-lived token; the browser then uploads each file to
 * /api/consultation/files and attaches them through /api/consultation/details, so a slow or
 * failed upload can never cost the lead. This request carries only the file NAMES
 * (pendingFiles), so the team can see what is on its way. A "files" part sent by a page loaded
 * before v2 is still stored here, and one that cannot be stored is named in the notes instead of
 * failing the request.
 *
 * "Have us call you" posts here too, as callback=1 with name, phone and an optional best time and
 * no description. Its notes open with a CALLBACK REQUEST line, so the team sees it in the
 * database row, the lead dashboard, the internal email and p5 intake alike.
 */
async function readShortMultipart(
  request: NextRequest,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const form = await request.formData();
  const note = String(form.get("message") ?? "").trim();
  const callback = String(form.get("callback") ?? "") === "1";
  const name = String(form.get("name") ?? "");
  const phone = String(form.get("phone") ?? "");
  const preference = String(form.get("contactPreference") ?? "").trim();
  const bestTime = String(form.get("bestTime") ?? "").trim().slice(0, 40);
  if (!callback && note.length < 8) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Tell us what we should look at." }, { status: 400 }),
    };
  }
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
    .slice(0, MAX_REQUEST_FILES);
  const links: string[] = [];
  const notStored: string[] = [];
  const batch = crypto.randomUUID();
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const check = checkRequestFile({ name: file.name, type: file.type, size: file.size });
    if (!check.ok) {
      notStored.push(file.name.slice(0, 120));
      continue;
    }
    const key = `requests/${batch}/${index}-${safeRequestFileName(file.name, check.ext)}`;
    try {
      const { uploadFile } = await import("@/lib/storage/blob");
      const stored = await uploadFile(key, Buffer.from(await file.arrayBuffer()), check.contentType);
      links.push(absoluteStoredUrl(stored));
    } catch (error) {
      console.error("[consultation] short-request upload failed", error instanceof Error ? error.message : error);
      notStored.push(file.name.slice(0, 120));
    }
  }
  let pendingFiles: string[] = [];
  try {
    const parsed = JSON.parse(String(form.get("pendingFiles") ?? "[]"));
    if (Array.isArray(parsed)) {
      pendingFiles = parsed
        .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
        .map((name) => name.trim().slice(0, 120))
        .slice(0, MAX_REQUEST_FILES);
    }
  } catch {
    pendingFiles = [];
  }
  let attribution: unknown;
  const rawAttribution = String(form.get("attribution") ?? "").trim();
  if (rawAttribution) {
    try {
      attribution = JSON.parse(rawAttribution);
    } catch {
      attribution = undefined;
    }
  }
  const parts: string[] = [];
  if (callback) {
    parts.push(`CALLBACK REQUEST: call ${name.trim()} at ${phone.trim()}. Best time: ${bestTime || "Any time"}.`);
  }
  if (note) parts.push(note);
  if (!callback && CONTACT_PREFERENCE_LABELS[preference]) {
    parts.push(`Preferred contact: ${CONTACT_PREFERENCE_LABELS[preference]}`);
  }
  if (links.length > 0) parts.push(`Photos and plans:\n${links.join("\n")}`);
  if (notStored.length > 0) parts.push(`Files that did not upload: ${notStored.join(", ")}`);
  if (pendingFiles.length > 0) {
    parts.push(
      `Photos and files on the way (${pendingFiles.length}): ${pendingFiles.join(", ")}. Links follow in a separate "Details added" update.`,
    );
  }
  const message = parts.join("\n\n");
  return {
    ok: true,
    body: {
      requestKind: "short",
      inquiryId: String(form.get("inquiryId") ?? ""),
      formStartedAt: Number(form.get("formStartedAt")),
      website: String(form.get("website") ?? ""),
      name,
      phone,
      email: String(form.get("email") ?? "").trim(),
      projectType: SHORT_REQUEST_PROJECT_TYPE,
      message,
      ...(pendingFiles.length ? { pendingFiles } : {}),
      ...(callback ? { callback: true, contactPreference: "call", ...(bestTime ? { bestTime } : {}) } : {}),
      ...(!callback && preference ? { contactPreference: preference } : {}),
      ...(String(form.get("skipEmail") ?? "") === "1" ? { skipEmail: true } : {}),
      ...(attribution ? { attribution } : {}),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let raw: unknown;
    if (contentType.includes("multipart/form-data")) {
      const read = await readShortMultipart(request);
      if (!read.ok) return read.response;
      raw = read.body;
    } else {
      raw = await request.json();
    }
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let attribution;try{attribution=submissionAttribution(data.attribution,request.headers);}catch{return NextResponse.json({message:'Invalid attribution metadata. Reload the page and retry.'},{status:400});}

    // Server-side verification: never trust client-supplied dollar amounts.
    const pricingAlertKinds: string[] = [];
    const estimate = data.estimate ? verifyEstimate(data.estimate, pricingAlertKinds) : null;

    let acceptance;
    try {
      const profile = data.propertyProfile as Record<string, unknown> | null | undefined;
      acceptance = await acceptInquiry(
        request,
        {
          inquiryId: data.inquiryId,
          stage: "consultation",
          name: data.name,
          email: data.email ?? "",
          phone: data.phone,
          address: data.address || "",
          // Duplicate key only: a callback and a written request from the same phone in the
          // same week are two requests, not one.
          projectType: data.callback ? "Callback request" : data.projectType,
          website: data.website,
          formStartedAt: data.formStartedAt,
        },
        {
          name: data.name,
          phone: data.phone,
          email: data.email ?? "",
          zip: data.zip || "",
          address: data.address || "",
          city: (profile?.city as string) || null,
          propertyProfile: (data.propertyProfile as PropertyProfile | null) ?? null,
          ...(attribution?{attribution}:{}),
          projectType: data.projectType,
          message: data.message || null,
          estimateProject: estimate?.project || null,
          estimateFinish: estimate?.finish || null,
          estimateLow: estimate?.priceLow?.toString() || null,
          estimateHigh: estimate?.priceHigh?.toString() || null,
          estimateSqft: estimate?.sqft ?? null,
          estimateConfidence: estimate?.confidence || null,
        },
      );
    } catch (err) {
      if (err instanceof InquiryRejectedError) {
        return NextResponse.json(
          { accepted: false, message: err.publicMessage },
          { status: err.status },
        );
      }
      console.error("[consultation] Persistence failed:", err);
      return NextResponse.json(
        {
          accepted: false,
          message: "We could not safely save your request. Please try again in a moment.",
        },
        { status: 503 },
      );
    }

    // Short request: the id and short-lived token that let this browser upload its files and
    // add step 2 details to this same lead (/api/consultation/files, /api/consultation/details).
    const followUp =
      data.requestKind === "short"
        ? (() => {
            const detailsToken = issueRequestDetailsToken(acceptance.rowId);
            return detailsToken ? { requestId: acceptance.rowId, detailsToken } : {};
          })()
        : {};

    if (acceptance.duplicate) {
      return NextResponse.json({
        accepted: true,
        inquiryId: acceptance.inquiryId,
        duplicate: true,
        conversionEligible: acceptance.conversionEligible,
        delivery: acceptance.needsDeliveryRetry ? "pending_retry" : "sent",
        ...followUp,
      });
    }

    // HubSpot contact, mapped deal, and lead_created mail live on p5 intake.
    // Started as soon as the lead is durable so it overlaps Resend, and kept
    // alive with after() so the visitor response does not wait on it.
    // Failures stay inside the bridge and cannot change this status.
    // Duplicate replays returned above, and InquiryRejectedError / 503 paths
    // never reach here. The short multipart form uses this same accept path.
    const location = (data.propertyProfile as { city?: string; zip?: string } | null) ?? null;
    try {
      const bridge = forwardConsultationToP5Intake({
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        city: location?.city,
        zip: data.zip || location?.zip,
        // A short request does not ask the project type: p5 files it as "Not sure" so step 2,
        // or the team, can set it (p5 fills a "Not sure" project type from a details post).
        projectType: data.requestKind === "short" ? UNSPECIFIED_PROJECT_TYPE : data.projectType,
        message: data.message,
        inquiryId: data.inquiryId,
        requestKind: data.callback ? "callback" : "quote",
        contactPreference: data.contactPreference ?? null,
        bestTime: data.callback ? data.bestTime || "Any time" : null,
        submissionKind: "initial",
      });
      after(() => bridge);
    } catch (bridgeErr) {
      console.error("[p5-intake] Could not schedule HubSpot bridge:", bridgeErr);
    }

    // Same complete record as the estimate-gate path, so a lead looks identical
    // in the CRM regardless of which form produced it. The address was being
    // dropped here even though this form requires it.
    const crmLead = {
      name: data.name,
      phone: data.phone,
      email: data.email ?? "",
      address: data.address || "",
      zip: data.zip || "",
      projectType: data.projectType,
      message: data.message,
    };
    // Real unit costs entered in the admin pricing panel, applied to every
    // breakdown this request renders so the panel, emails and CRM agree.
    const unitCostOverrides = await readUnitCostOverrides();

    const crmProfile = (data.propertyProfile as PropertyEnrichment | null) ?? null;

    const crmResult = await forwardToLeadDashboardAsync({
      fullName: data.name,
      email: dashboardEmail(data.email, data.phone, data.name),
      phone: data.phone,
      // Field names must match the dashboard's externalLeadSchema exactly; it
      // strips anything it does not recognise rather than erroring.
      propertyAddress: data.address || undefined,
      city: (data.propertyProfile as { city?: string; state?: string; zip?: string } | null)?.city || undefined,
      state: (data.propertyProfile as { city?: string; state?: string; zip?: string } | null)?.state || undefined,
      zip: data.zip || (data.propertyProfile as { city?: string; state?: string; zip?: string } | null)?.zip || undefined,
      projectTypes: data.projectType ? [data.projectType] : [],
      ...(data.contactPreference ? { preferredContactMethod: data.contactPreference } : {}),
      budgetRange: resolveBudgetRange(undefined, estimate),
      projectScope: estimate
        ? `${PROJECT_LABELS[estimate.project].label} - ${formatUsd(estimate.priceLow)} to ${formatUsd(estimate.priceHigh)} (${estimate.confidence})`
        : undefined,
      projectGoals: buildProjectGoals(estimate),
      // The homeowner's own words stay in finalNotes; the estimate record goes
      // to estimateSummary, which the dashboard sizes for it (20k vs 2k).
      finalNotes: data.message || undefined,
      estimate: estimate || attribution
        ? {
            ...(attribution?{marketingAttribution:attributionCrmMetadata(attribution,'Boise Remodeling Co')}:{ }),
            ...(estimate?{
            ...buildLeadEstimateRecord(estimate, unitCostOverrides),
            ...(pricingAlertKinds.length > 0 ? { pricingAlerts: pricingAlertKinds } : {}),
            }:{}),
          }
        : undefined,
      // Zoning, lot size, assessed value, owner and occupancy as structured
      // fields, alongside the same rows the admin email renders.
      property: buildLeadPropertyRecord(crmProfile),
      // Structured intake fields the estimator can answer. See
      // buildCrmIntakeFields for why the rest stay deliberately empty.
      ...buildCrmIntakeFields(estimate),
      estimateSummary: buildLeadNotes(crmLead, estimate, crmProfile, unitCostOverrides),
      estimateLow: estimate?.priceLow,
      estimateHigh: estimate?.priceHigh,
      estimateRange: estimate
        ? `${formatUsd(estimate.priceLow)} to ${formatUsd(estimate.priceHigh)}`
        : undefined,
      source: "boiseremodeling.co",
    });

    const shouldSendEmail = !data.skipEmail;
    let adminEmailStatus: "sent" | "failed" | "skipped" = shouldSendEmail ? "sent" : "skipped";
    // No email given (optional on the short request): nothing to send the visitor a copy at.
    let customerEmailStatus: "sent" | "failed" | "skipped" = shouldSendEmail && data.email ? "sent" : "skipped";
    let deliveryError = crmResult.error;
    if (shouldSendEmail) {
      try {
        const { client, fromEmail } = await getUncachableEmailClient();
        const from = formatFromAddress(fromEmail);

        const lead = {
          name: data.name,
          phone: data.phone,
          email: data.email ?? "",
          address: data.address || "",
          zip: data.zip || "",
          projectType: data.projectType,
          message: data.message,
        };
        const enrichment = (data.propertyProfile as PropertyEnrichment | null) ?? null;

        // ---- Admin / internal-team email ------------------------------------
        // Reply-To is the LEAD, so hitting Reply in any mail client goes straight
        // to the customer.
        const adminHtml = buildAdminEmailHtml(lead, estimate, enrichment, unitCostOverrides);
        const adminEmails = await getAdminRecipientEmails(SITE_CONFIG.email);
        for (const adminEmail of adminEmails) {
          const adminResult = await client.emails.send({
            from,
            ...(data.email ? { replyTo: formatLeadReplyTo(data.name, data.email) } : {}),
            to: adminEmail,
            subject: data.callback
              ? `Callback request: ${data.name} · ${data.phone}`
              : buildAdminSubject(lead, estimate),
            html: adminHtml,
            text: htmlToPlainText(adminHtml),
          });
          if (adminResult?.error) {
            adminEmailStatus = "failed";
            deliveryError = deliveryError || JSON.stringify(adminResult.error);
            console.error(
              `[consultation] Admin email to ${adminEmail} failed:`,
              JSON.stringify(adminResult.error)
            );
          }
        }

        // ---- Customer / lead email ------------------------------------------
        // Includes the full estimate + every selection so the lead has it in
        // writing without ever logging in.
        const customerResult = data.email
          ? await (async () => {
              const customerHtml = buildCustomerEmailHtml(lead, estimate, unitCostOverrides);
              return client.emails.send({
                from,
                replyTo: getReplyToAddress(),
                to: data.email as string,
                subject: buildCustomerSubject(lead, estimate),
                html: customerHtml,
                text: htmlToPlainText(customerHtml),
              });
            })()
          : null;
        if (customerResult?.error) {
          customerEmailStatus = "failed";
          deliveryError = deliveryError || JSON.stringify(customerResult.error);
          console.error(
            `[consultation] Customer email to ${data.email} failed:`,
            JSON.stringify(customerResult.error)
          );
        }
      } catch (emailErr) {
        adminEmailStatus = "failed";
        if (data.email) customerEmailStatus = "failed";
        deliveryError = deliveryError || (emailErr instanceof Error ? emailErr.message : String(emailErr));
        console.error("[consultation] Email send failed:", emailErr);
      }
    }

    const allDelivered =
      crmResult.sent &&
      adminEmailStatus !== "failed" &&
      customerEmailStatus !== "failed";
    await recordDeliveryStatus(acceptance.rowId, {
      crm: crmResult.sent ? "sent" : "failed",
      adminEmail: adminEmailStatus,
      customerEmail: customerEmailStatus,
      ...(deliveryError ? { lastError: deliveryError.slice(0, 1000) } : {}),
    }).catch((err) => console.error("[consultation] Delivery status update failed:", err));

    return NextResponse.json({
      accepted: true,
      inquiryId: acceptance.inquiryId,
      duplicate: acceptance.duplicate,
      conversionEligible: acceptance.conversionEligible,
      delivery: allDelivered ? "sent" : "pending_retry",
      ...followUp,
    });
  } catch (err) {
    console.error("[consultation] Error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
