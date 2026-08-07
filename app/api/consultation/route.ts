import { NextRequest, NextResponse } from "next/server";
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
import {
  EMPTY_REFINEMENTS,
  calculateEstimate,
  countVisibleUserRefinements,
  getMaxRefinementFields,
  getProjectSizeConfig,
  getSetRefinementKeys,
  PROJECT_LABELS,
  type EstimateRefinements,
} from "@/shared/estimateEngine";
import { resolveQuotedRange } from "@/shared/costs/resolve";
import { logPricingAlert } from "@/server/services/pricingAlerts";
import { forwardToLeadDashboard } from "@/server/services/leadDashboardForward";
import { readUnitCostOverrides } from "@/app/api/admin/pricing/route";
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
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  zip: z.string().optional(),
  projectType: z.string().min(1),
  message: z.string().optional(),
  propertyProfile: propertyProfileSchema,
  estimate: estimateSchema,
  /* Set by the client when the visitor already submitted the estimate gate,
     which already sent admin + customer emails via /api/estimate-lead.
     Prevents duplicate email sends when the same person submits both forms. */
  skipEmail: z.boolean().optional(),
});

/**
 * Recomputes the planning range server-side from the submitted inputs so a
 * stored lead never carries client-tampered or stale numbers. Returns null
 * (estimate rejected) if the inputs themselves are out of bounds.
 */
function verifyEstimate(
  estimate: NonNullable<z.infer<typeof estimateSchema>>
): VerifiedEstimate | null {
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
  const maxFields = getMaxRefinementFields(estimate.project);
  const lineItemRange = resolveQuotedRange(
    estimate.project,
    estimate.finish,
    estimate.sqft,
    refinements,
    maxFields > 0 ? detailCount / maxFields : 0,
  );
  const recomputed = { ...guide, ...(lineItemRange ?? {}) };

  if (
    estimate.priceLow !== recomputed.priceLow ||
    estimate.priceHigh !== recomputed.priceHigh
  ) {
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

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = bodySchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Server-side verification: never trust client-supplied dollar amounts.
    const estimate = data.estimate ? verifyEstimate(data.estimate) : null;

    if (db) {
      try {
        const profile = data.propertyProfile as Record<string, unknown> | null | undefined;
        await db.insert(consultationRequests).values({
          name: data.name,
          phone: data.phone,
          email: data.email,
          zip: data.zip || "",
          address: data.address,
          city: (profile?.city as string) || null,
          propertyProfile: (data.propertyProfile as PropertyProfile | null) ?? null,
          projectType: data.projectType,
          message: data.message || null,
          estimateProject: estimate?.project || null,
          estimateFinish: estimate?.finish || null,
          estimateLow: estimate?.priceLow?.toString() || null,
          estimateHigh: estimate?.priceHigh?.toString() || null,
          estimateSqft: estimate?.sqft ?? null,
          estimateConfidence: estimate?.confidence || null,
        });
      } catch (dbErr) {
        console.error("[consultation] DB insert failed:", dbErr);
      }
    }

    // Same complete record as the estimate-gate path, so a lead looks identical
    // in the CRM regardless of which form produced it. The address was being
    // dropped here even though this form requires it.
    const crmLead = {
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      zip: data.zip,
      projectType: data.projectType,
      message: data.message,
    };
    // Real unit costs entered in the admin pricing panel, applied to every
    // breakdown this request renders so the panel, emails and CRM agree.
    const unitCostOverrides = await readUnitCostOverrides();

    const crmProfile = (data.propertyProfile as PropertyEnrichment | null) ?? null;

    forwardToLeadDashboard({
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
      estimate: estimate ? buildLeadEstimateRecord(estimate, unitCostOverrides) : undefined,
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

    if (!data.skipEmail) {
      try {
        const { client, fromEmail } = await getUncachableEmailClient();
        const from = formatFromAddress(fromEmail);

        const lead = {
          name: data.name,
          phone: data.phone,
          email: data.email,
          address: data.address,
          zip: data.zip,
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
          console.error(
            `[consultation] Customer email to ${data.email} failed:`,
            JSON.stringify(customerResult.error)
          );
        }
      } catch (emailErr) {
        console.error("[consultation] Email send failed:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[consultation] Error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
