import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { estimateProject, type QualityLevel } from "@/shared/costs";
import { assessPlanQuality, type PlanExtractionResult } from "@/shared/plans/extraction";
import { planMeasurements, planScopePatch } from "@/shared/plans/estimateInput";
import { isStoredDocumentUrl } from "@/shared/re10/uploads";
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
  inScope: z.boolean(),
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

export async function POST(request: NextRequest) {
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
  const result: PlanExtractionResult = {
    looksLikePlans: body.looksLikePlans ?? true,
    projectType: body.extractionProjectType ?? "unclear",
    statedTotalSqFt: body.statedTotalSqFt,
    roomAreaTotalSqFt: body.rooms
      .filter((r) => r.inScope && r.areaSqFt)
      .reduce((s, r) => s + (r.areaSqFt ?? 0), 0),
    rooms: body.rooms.map((r) => ({
      name: r.name,
      areaSqFt: r.areaSqFt,
      areaSource: r.areaSource,
      dimensionText: r.dimensionText ?? null,
      ceilingHeightFt: r.ceilingHeightFt ?? null,
      sheet: r.sheet ?? null,
      inScope: r.inScope,
    })),
    counts: [],
    sheetsUsed: body.sheetsUsed ?? [],
    scopeNotes: [],
    warnings: body.warnings ?? [],
  };

  const quality = assessPlanQuality(result);
  const measurements = planMeasurements(result);

  /* Rooms the drawings named but did not measure. NOTHING THE CUSTOMER SENT US
     MAY SILENTLY VANISH - this was a real bug on the RE-10, where 7 of 20
     requested repairs disappeared between the review screen and the quote. */
  const notMeasured = result.rooms
    .filter((r) => r.inScope && !(r.areaSqFt && r.areaSqFt > 0))
    .map((r) => r.name);

  /* The measured patch when the drawings earned it, the customer's own total
     when they did not. Either way the takeoff runs server-side. */
  const project = body.projectType as ProjectType;
  const selections = measurements
    ? { quality: body.finishLevel as QualityLevel, ...planScopePatch(measurements, body.projectType) }
    : { quality: body.finishLevel as QualityLevel, sqft: body.statedTotalSqFt };

  const estimate = estimateProject(project, selections, [
    { label: "Project", value: PROJECT_LABELS[body.projectType] },
    { label: "Finish level", value: FINISH_LABELS[body.finishLevel] },
    {
      label: "Size",
      value: measurements
        ? `${Math.round(measurements.sqft).toLocaleString("en-US")} sq ft measured from your drawings`
        : `${body.statedTotalSqFt.toLocaleString("en-US")} sq ft`,
    },
  ]);

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
          notes: measurements.notes,
        }
      : null,
    blockers: quality.blockers,
    notMeasured,
    propertyAddress: body.propertyAddress,
    emailed: delivery.customerEmailed,
  });
}
