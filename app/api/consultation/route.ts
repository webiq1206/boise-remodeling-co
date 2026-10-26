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
import { forwardToLeadDashboardAsync } from "@/server/services/leadDashboardForward";
import { forwardConsultationToP5Intake } from "@/server/services/p5IntakeBridge";
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
  email: z.string().email(),
  address: z.string().trim().max(300).optional(),
  zip: z.string().optional(),
  projectType: z.string().min(1),
  message: z.string().max(8000).optional(),
  /* Home hero only. Address stays required on the full consultation form. */
  requestKind: z.literal("short").optional(),
  propertyProfile: propertyProfileSchema,
  estimate: estimateSchema,
  /* Set by the client when the visitor already submitted the estimate gate,
     which already sent admin + customer emails via /api/estimate-lead.
     Prevents duplicate email sends when the same person submits both forms. */
  skipEmail: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.requestKind === "short") {
    if ((data.message?.trim().length ?? 0) < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["message"],
        message: "Tell us what we should look at.",
      });
    }
    return;
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

const SHORT_FILE_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
  ["application/pdf", "pdf"],
]);
const SHORT_FILE_EXT = new Map<string, string>([
  ["jpg", "jpg"],
  ["jpeg", "jpg"],
  ["png", "png"],
  ["webp", "webp"],
  ["heic", "heic"],
  ["heif", "heif"],
  ["pdf", "pdf"],
]);
const SHORT_MAX_FILES = 4;
const SHORT_MAX_FILE_BYTES = 8 * 1024 * 1024;

function shortFileExt(file: File): string | null {
  const fromType = SHORT_FILE_TYPES.get(file.type);
  if (fromType) return fromType;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return SHORT_FILE_EXT.get(ext) ?? null;
}

function shortSafeName(name: string, ext: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "upload"}.${ext}`;
}

function absoluteStoredUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

function shortUploadMime(file: File, ext: string): string {
  if (file.type) return file.type;
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg") return "image/jpeg";
  return `image/${ext}`;
}

/**
 * The home-page request form. Same lead record as /api/consultation JSON.
 * Photos and plans are optional and are not accepted on the long consultation form.
 */
async function readShortMultipart(
  request: NextRequest,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const form = await request.formData();
  const note = String(form.get("message") ?? "").trim();
  if (note.length < 8) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Tell us what we should look at." }, { status: 400 }),
    };
  }
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > SHORT_MAX_FILES) {
    return {
      ok: false,
      response: NextResponse.json({ message: "You can attach up to 4 photos or plans." }, { status: 400 }),
    };
  }
  const links: string[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const ext = shortFileExt(file);
    if (!ext) {
      return {
        ok: false,
        response: NextResponse.json(
          { message: "Photos and plans must be JPEG, PNG, WebP, HEIC, or PDF." },
          { status: 400 },
        ),
      };
    }
    if (file.size > SHORT_MAX_FILE_BYTES) {
      return {
        ok: false,
        response: NextResponse.json({ message: "Each photo or plan must be 8 MB or smaller." }, { status: 400 }),
      };
    }
    const key = `requests/${crypto.randomUUID()}/${index}-${shortSafeName(file.name, ext)}`;
    try {
      const { uploadFile } = await import("@/lib/storage/blob");
      const stored = await uploadFile(key, Buffer.from(await file.arrayBuffer()), shortUploadMime(file, ext));
      links.push(absoluteStoredUrl(stored));
    } catch (error) {
      console.error("[consultation] short-request upload failed", error instanceof Error ? error.message : error);
      return {
        ok: false,
        response: NextResponse.json(
          { message: "We could not save that photo. Try again, or send the request without it." },
          { status: 503 },
        ),
      };
    }
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
  const message = links.length > 0 ? `${note}\n\nPhotos and plans:\n${links.join("\n")}` : note;
  return {
    ok: true,
    body: {
      requestKind: "short",
      inquiryId: String(form.get("inquiryId") ?? ""),
      formStartedAt: Number(form.get("formStartedAt")),
      website: String(form.get("website") ?? ""),
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      projectType: "Home repair or remodel",
      message,
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
          email: data.email,
          phone: data.phone,
          address: data.address || "",
          projectType: data.projectType,
          website: data.website,
          formStartedAt: data.formStartedAt,
        },
        {
          name: data.name,
          phone: data.phone,
          email: data.email,
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

    if (acceptance.duplicate) {
      return NextResponse.json({
        accepted: true,
        inquiryId: acceptance.inquiryId,
        duplicate: true,
        conversionEligible: acceptance.conversionEligible,
        delivery: acceptance.needsDeliveryRetry ? "pending_retry" : "sent",
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
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: location?.city,
        zip: data.zip || location?.zip,
        projectType: data.projectType,
        message: data.message,
        inquiryId: data.inquiryId,
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
      email: data.email,
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
      email: data.email,
      phone: data.phone,
      // Field names must match the dashboard's externalLeadSchema exactly; it
      // strips anything it does not recognise rather than erroring.
      propertyAddress: data.address || undefined,
      city: (data.propertyProfile as { city?: string; state?: string; zip?: string } | null)?.city || undefined,
      state: (data.propertyProfile as { city?: string; state?: string; zip?: string } | null)?.state || undefined,
      zip: data.zip || (data.propertyProfile as { city?: string; state?: string; zip?: string } | null)?.zip || undefined,
      projectTypes: data.projectType ? [data.projectType] : [],
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
    let customerEmailStatus: "sent" | "failed" | "skipped" = shouldSendEmail ? "sent" : "skipped";
    let deliveryError = crmResult.error;
    if (shouldSendEmail) {
      try {
        const { client, fromEmail } = await getUncachableEmailClient();
        const from = formatFromAddress(fromEmail);

        const lead = {
          name: data.name,
          phone: data.phone,
          email: data.email,
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
            replyTo: formatLeadReplyTo(data.name, data.email),
            to: adminEmail,
            subject: buildAdminSubject(lead, estimate),
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
        const customerHtml = buildCustomerEmailHtml(lead, estimate, unitCostOverrides);
        const customerResult = await client.emails.send({
          from,
          replyTo: getReplyToAddress(),
          to: data.email,
          subject: buildCustomerSubject(lead, estimate),
          html: customerHtml,
          text: htmlToPlainText(customerHtml),
        });
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
        customerEmailStatus = "failed";
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
    });
  } catch (err) {
    console.error("[consultation] Error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
