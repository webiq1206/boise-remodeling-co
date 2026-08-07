import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  estimateProject,
  buildInternalEstimate,
  RULES_BY_PROJECT,
  type QualityLevel,
} from "@/shared/costs";
import { buildRemodelDisclosure } from "@/shared/estimate/remodelDisclosure";
import {
  assessPlanQuality,
  asDrawnFloorArea,
  scopedRooms,
  type PlanExtractionResult,
} from "@/shared/plans/extraction";
import { planMeasurements, planScopePatch } from "@/shared/plans/estimateInput";
import { isStoredDocumentUrl } from "@/shared/re10/uploads";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { deliverPlanLead } from "@/server/services/planLead";
import type { PlanContact } from "@/server/services/planEmail";
import type { ProjectType } from "@/shared/estimateEngine";

/**
 * The gated step: confirmed measurements in, planning range out.
 *
 * THE GATES RUN HERE, NOT ON THE CLIENT. The wizard sends back the rooms it
 * showed the customer, plus the total square footage the customer supplied, and
 * this route re-runs `assessPlanQuality` and `planMeasurements` over that. A
 * browser cannot talk its way past a gate by posting a flag, because there is
 * nowhere in the body to put one - and it cannot post a price either.
 *
 * WHY THE CLIENT IS ALLOWED TO SEND THE ROOMS BACK AT ALL. The same reason the
 * RE-10 route accepts a corrected repair list: the customer is meant to fix what
 * we misread. Corrections are the feature. What matters is that the price is
 * still derived server-side from whatever list arrives, and that the list is
 * still made to clear every gate before it may tighten anything.
 *
 * FAILING THE GATES IS NOT AN ERROR. Three of the four real plan sets do not
 * clear them. Those customers still get a planning range, built from the total
 * they told us, and are told plainly that the drawings did not carry enough to
 * price from directly. Refusing to answer would be worse than answering wider.
 */

export const runtime = "nodejs";

const PROJECTS = ["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"] as const;
const QUALITIES = ["refresh", "mid-range", "high-end", "luxury"] as const;

const roomSchema = z.object({
  name: z.string().min(1).max(200),
  areaSqFt: z.number().positive().max(100_000).nullable(),
  areaSource: z.enum(["printed", "derived", "scaled", "inferred"]),
  dimensionText: z.string().max(300).nullable().optional(),
  ceilingHeightFt: z.number().positive().max(60).nullable().optional(),
  sheet: z.string().max(60).nullable().optional(),
  /**
   * Defaults to "new" when a client omits it, because that is the only phase a
   * room could be in on a set with no existing drawings, and it is also the
   * conservative choice: it keeps the room in the priced set rather than
   * silently dropping floor area someone is expecting to be quoted.
   */
  phase: z.enum(["existing", "demolition", "new", "reference"]).default("new"),
  level: z.string().max(60).nullable().optional(),
  inScope: z.boolean(),
});

const scopeItemSchema = z.object({
  category: z.enum([
    "demolition",
    "structural",
    "envelope",
    "plumbing",
    "electrical",
    "hvac",
    "finishes",
    "millwork",
    "appliance",
    "site",
  ]),
  description: z.string().min(1).max(600),
  sheet: z.string().max(60).nullable().optional(),
  inContract: z.boolean(),
});

const scopeFactsSchema = z.object({
  wallsRemovedOrAdded: z.boolean().nullable(),
  plumbingFixturesRelocated: z.boolean().nullable(),
  electricalServiceOrPanelWork: z.boolean().nullable(),
  structuralWork: z.boolean().nullable(),
  hvacWork: z.boolean().nullable(),
  exteriorEnvelopeWork: z.boolean().nullable(),
  kitchenInScope: z.boolean().nullable(),
});

const bodySchema = z
  .object({
    rooms: z.array(roomSchema).max(400),
    projectType: z.enum(PROJECTS),
    finishLevel: z.enum(QUALITIES),
    /**
     * THE CROSS-CHECK, AND THE WHOLE REASON THE UPLOADER ASKS A QUESTION.
     *
     * No sheet in the eighteen-sheet Squier set states a total conditioned
     * area, and nothing printed on a drawing can substitute: the dimension
     * chains give no outline, and room tags do not tile the floor. The customer
     * knows this number and it is genuinely independent of our read, which is
     * the one property the gate needs. Required, therefore, rather than
     * optional with a fallback.
     */
    statedTotalSqFt: z.number().positive().max(100_000),
    /** Extractor context, carried through to the team rather than re-derived. */
    looksLikePlans: z.boolean().optional(),
    extractionProjectType: z.enum(["new-build", "remodel", "addition", "unclear"]).optional(),
    warnings: z.array(z.string().max(2000)).max(40).optional(),
    sheetsUsed: z.array(z.string().max(60)).max(120).optional(),
    /** The whole job, not just the floor area. See PlanScopeItem. */
    scopeItems: z.array(scopeItemSchema).max(300).optional(),
    scopeFacts: scopeFactsSchema.optional(),

    name: z.string().min(2).max(120),
    email: z.string().email().max(200).optional().or(z.literal("")),
    phone: z.string().max(40).optional().or(z.literal("")),
    preferredContact: z.enum(["email", "phone", "text"]),
    propertyAddress: z.string().min(4).max(300),
    timeline: z.string().max(120).optional(),
    notes: z.string().max(4000).optional(),
    // Root-relative is what our own storage returns; requiring an absolute URL
    // here is the bug that broke every RE-10 submission carrying a file.
    documents: z
      .array(
        z.object({
          filename: z.string().max(300),
          url: z.string().max(2000).refine(isStoredDocumentUrl, {
            message: "Must be an absolute URL or a root-relative path.",
          }),
        }),
      )
      .max(12)
      .optional(),
  })
  .refine((b) => (b.preferredContact === "email" ? Boolean(b.email) : true), {
    message: "An email address is required when email is the preferred contact method.",
    path: ["email"],
  })
  .refine((b) => (b.preferredContact !== "email" ? Boolean(b.phone) : true), {
    message: "A phone number is required when phone or text is the preferred contact method.",
    path: ["phone"],
  });

const PROJECT_LABELS: Record<(typeof PROJECTS)[number], string> = {
  kitchen: "Kitchen remodel",
  bathroom: "Bathroom remodel",
  "whole-home": "Whole home remodel",
  addition: "Addition",
  adu: "ADU",
  basement: "Basement finish",
};
const FINISH_LABELS: Record<(typeof QUALITIES)[number], string> = {
  refresh: "Refresh",
  "mid-range": "Mid-range",
  "high-end": "High-end",
  luxury: "Luxury",
};

/* Same reasoning as the RE-10 estimate limit: two emails and a lead row per
   accepted request, unauthenticated. */
const RATE_LIMIT = 12;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  const limit = rateLimit(clientKeyFrom(request.headers, "plans-estimate"), RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { message: "Too many requests in a short time. Wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request", errors: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  /* Rebuild the extraction shape the gates read, with the customer's total in
     place of the one the drawings did not state. Everything else is as read. */
  const rooms = body.rooms.map((r) => ({
    name: r.name,
    areaSqFt: r.areaSqFt,
    areaSource: r.areaSource,
    dimensionText: r.dimensionText ?? null,
    ceilingHeightFt: r.ceilingHeightFt ?? null,
    sheet: r.sheet ?? null,
    phase: r.phase,
    level: r.level ?? null,
    inScope: r.inScope,
  }));

  const result: PlanExtractionResult = {
    looksLikePlans: body.looksLikePlans ?? true,
    projectType: body.extractionProjectType ?? "unclear",
    statedTotalSqFt: body.statedTotalSqFt,
    /**
     * THE AS-DRAWN AREA OF THE WHOLE HOME, NOT THE IN-SCOPE SUM.
     *
     * This used to sum the in-scope rooms, which made the cross-check compare
     * the part being remodelled against the customer's figure for their whole
     * house. On a first-floor reconfiguration of a two-storey home those are
     * different quantities and the gate blocked a near-perfect read. It is now
     * computed by `asDrawnFloorArea`, which takes one phase per level, so both
     * sides of the comparison describe the same building.
     */
    roomAreaTotalSqFt: null,
    rooms,
    counts: [],
    scopeItems: body.scopeItems?.map((i) => ({ ...i, sheet: i.sheet ?? null })) ?? [],
    scopeFacts: body.scopeFacts ?? {
      wallsRemovedOrAdded: null,
      plumbingFixturesRelocated: null,
      electricalServiceOrPanelWork: null,
      structuralWork: null,
      hvacWork: null,
      exteriorEnvelopeWork: null,
      kitchenInScope: null,
    },
    sheetsUsed: body.sheetsUsed ?? [],
    scopeNotes: [],
    warnings: body.warnings ?? [],
  };
  result.roomAreaTotalSqFt = asDrawnFloorArea(result) || null;

  const quality = assessPlanQuality(result);
  const measurements = planMeasurements(result);

  /* Rooms in the priced set that carry no area. NOTHING THE CUSTOMER SENT US
     MAY SILENTLY VANISH - this was a real bug on the RE-10, where 7 of 20
     requested repairs disappeared between the review screen and the quote.
     Uses `scopedRooms` so it names exactly the rooms the price was built from,
     rather than existing-plan duplicates the customer never expected to see. */
  const notMeasured = scopedRooms(result)
    .filter((r) => !(r.areaSqFt && r.areaSqFt > 0))
    .map((r) => r.name);

  /* The measured patch when the drawings earned it, the customer's own total
     when they did not. Either way the takeoff runs server-side. */
  const project = body.projectType as ProjectType;
  const selections = measurements
    ? { quality: body.finishLevel as QualityLevel, ...planScopePatch(measurements, body.projectType) }
    : { quality: body.finishLevel as QualityLevel, sqft: body.statedTotalSqFt };

  /**
   * WHAT THIS ESTIMATE SAYS ABOUT ITSELF, BUILT BEFORE THE PRICE.
   *
   * Order matters. The disclosure decides the band: a project measured off
   * drawings sits on the 15 percent floor, one whose drawings were unreadable
   * or whose scope questions are unanswered widens from there. Pricing first
   * and describing afterwards would mean the caveats could not affect the
   * number they are caveating.
   */
  const internal = buildInternalEstimate(RULES_BY_PROJECT[project], selections, project);
  const disclosure = buildRemodelDisclosure({
    project,
    selections,
    estimate: internal,
    measurements,
    planQuality: quality,
    notMeasured,
    excludedScope: (body.scopeItems ?? []).filter((i) => !i.inContract),
    documentsProvided: body.rooms.length > 0,
  });

  const estimate = estimateProject(project, selections, [
    { label: "Project", value: PROJECT_LABELS[body.projectType] },
    { label: "Finish level", value: FINISH_LABELS[body.finishLevel] },
    {
      label: "Size",
      value: measurements
        ? `${Math.round(measurements.sqft).toLocaleString("en-US")} sq ft measured from your drawings`
        : `${body.statedTotalSqFt.toLocaleString("en-US")} sq ft`,
    },
  ], 0, disclosure.bandPenalty);

  const contact: PlanContact = {
    name: body.name,
    email: body.email || undefined,
    phone: body.phone || undefined,
    preferredContact: body.preferredContact,
    propertyAddress: body.propertyAddress,
    projectType: PROJECT_LABELS[body.projectType],
    finishLevel: FINISH_LABELS[body.finishLevel],
    timeline: body.timeline,
    notes: body.notes,
  };

  // Awaited so the response can say honestly whether the copy was sent.
  // Delivery never throws; a failure is logged and reported as false.
  const delivery = await deliverPlanLead({
    contact,
    lead: estimate.lead,
    admin: estimate.admin,
    measurements,
    statedTotalSqFt: body.statedTotalSqFt,
    blockers: quality.blockers,
    notMeasured,
    scopeItems: (body.scopeItems ?? []).filter((i) => i.inContract),
    excludedScope: (body.scopeItems ?? []).filter((i) => !i.inContract),
    warnings: body.warnings ?? [],
    sheetsUsed: body.sheetsUsed ?? [],
    documents: body.documents ?? [],
  });

  /* CUSTOMER-FACING SHAPE. The lead view, the measurements, and why the
     drawings did or did not carry the price. No cost, no margin, no line item. */
  return NextResponse.json({
    range: estimate.lead.range,
    low: estimate.lead.low,
    high: estimate.lead.high,
    selections: estimate.lead.selections,
    disclaimers: estimate.lead.disclaimers,
    pricedFromDrawings: measurements !== null,
    measurements: measurements
      ? {
          sqft: Math.round(measurements.sqft),
          measuredRooms: measurements.measuredRooms,
          interiorPerimeterFt: Math.round(measurements.interiorPerimeterFt),
          ceilingHeight: measurements.ceilingHeight,
          bathroomCount: measurements.bathroomCount,
          layoutChanges: measurements.layoutChanges,
          plumbingElectrical: measurements.plumbingElectrical,
          notes: measurements.notes,
        }
      : null,
    /**
     * THE WHOLE SCOPE, SHOWN WHETHER OR NOT IT WAS PRICED.
     *
     * `scopeItems` is read off the drawings and is what the range covers.
     * `excludedScope` is work the sheets hand to somebody else, and it is the
     * more important of the two to show: it is precisely what a customer would
     * otherwise assume was included. Both travel even when the gates blocked the
     * measurements, because the scope is still real.
     */
    scopeItems: (body.scopeItems ?? []).filter((i) => i.inContract),
    excludedScope: (body.scopeItems ?? []).filter((i) => !i.inContract),
    blockers: quality.blockers,
    notMeasured,
    propertyAddress: body.propertyAddress,
    emailed: delivery.customerEmailed,
    /** Generated for this project; see remodelDisclosure.ts. */
    disclosure: {
      assumptions: disclosure.assumptions.map((a) => a.text),
      included: disclosure.items.filter((i) => i.status === "included").map((i) => ({ label: i.label, detail: i.detail })),
      excluded: disclosure.items.filter((i) => i.status === "excluded").map((i) => ({ label: i.label, detail: i.detail })),
      optional: disclosure.items.filter((i) => i.status === "optional").map((i) => ({ label: i.label, detail: i.detail })),
      allowances: disclosure.items.filter((i) => i.status === "allowance").map((i) => ({ label: i.label, detail: i.detail })),
      needsAttention: disclosure.items
        .filter((i) => i.status === "needs-onsite" || i.status === "needs-specialist" || i.status === "needs-review")
        .map((i) => ({ label: i.label, detail: i.detail, status: i.status })),
      warnings: disclosure.warnings.map((w) => w.text),
      missing: disclosure.missing,
      factors: disclosure.factors,
      acknowledgments: disclosure.acknowledgments,
      nextSteps: disclosure.nextSteps,
      confidence: disclosure.confidence,
    },
  });
}
