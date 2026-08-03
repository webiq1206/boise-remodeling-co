import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  estimateRe10,
  RECIPES,
  TRADE_LABELS,
  type RepairItemInput,
  type RepairKind,
  type ReviewReason,
} from "@/shared/costs/re10Repairs";
import { EXTRACTABLE_KINDS, EXTRACTION_REVIEW_REASONS } from "@/shared/re10/extraction";
import { isStoredDocumentUrl } from "@/shared/re10/uploads";
import { deliverRe10Lead } from "@/server/services/re10Lead";
import { buildRe10Disclosure } from "@/shared/estimate/re10Disclosure";
import type { Re10Contact } from "@/server/services/re10Email";

/**
 * The gated step: contact details in, planning range out.
 *
 * THE RANGE IS COMPUTED HERE, NOT TRUSTED FROM THE CLIENT. The wizard sends
 * the confirmed repair list and the property context; the price is derived
 * server-side from the same engine the emails and the internal estimate use.
 * A client that posts its own number gets it ignored - there is nowhere in the
 * request body to put one.
 *
 * The customer response deliberately carries no cost, margin, or line item.
 * Those exist on the server result and go to the team, never over this wire.
 */

export const runtime = "nodejs";

const repairSchema = z.object({
  id: z.string().min(1).max(64),
  description: z.string().min(1).max(2000),
  kind: z.enum(EXTRACTABLE_KINDS as [RepairKind, ...RepairKind[]]),
  location: z.string().max(200).optional(),
  quantity: z.number().positive().max(100_000).nullable().optional(),
  sourceRef: z.string().max(200).optional(),
  needsReview: z.enum(EXTRACTION_REVIEW_REASONS as [ReviewReason, ...ReviewReason[]]).optional(),
  hasPhoto: z.boolean().optional(),
});

/**
 * Contact validation is conditional on the preferred method, per the brief:
 * asking for a phone number from someone who chose email is friction with no
 * purpose, and accepting neither makes the lead unusable.
 */
const bodySchema = z
  .object({
    repairs: z.array(repairSchema).min(1).max(80),
    name: z.string().min(2).max(120),
    email: z.string().email().max(200).optional().or(z.literal("")),
    phone: z.string().max(40).optional().or(z.literal("")),
    preferredContact: z.enum(["email", "phone", "text"]),
    role: z.enum(["buyer-agent", "seller-agent", "buyer", "seller", "coordinator", "other"]),
    brokerage: z.string().max(160).optional(),
    propertyAddress: z.string().min(4).max(300),
    closingDate: z.string().max(40).optional(),
    repairDeadline: z.string().max(40).optional(),
    occupancy: z.enum(["occupied", "vacant", "unknown"]).optional(),
    access: z.enum(["standard", "limited", "difficult"]).optional(),
    hasInspectionReport: z.boolean().optional(),
    notes: z.string().max(4000).optional(),
    /**
     * Uploaded originals from the analyze step, so the lead carries the RE-10.
     *
     * THIS FIELD BROKE THE ENTIRE FUNNEL. It required z.string().url(), and the
     * blob store hands back a ROOT-RELATIVE path ("/api/documents/local/...")
     * whenever it is running on the local driver - which production is. So
     * every submission that carried an uploaded file failed validation, and the
     * agent got "Invalid request" at the last step, after typing their contact
     * details, with nothing to act on. Uploading a document is the entire point
     * of the page, so this was not an edge case; it was the path.
     *
     * Both shapes are accepted now. A relative path is what our own storage
     * returns and is perfectly valid as a link; it is made absolute downstream,
     * where it needs to survive being opened out of an email.
     */
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
    /**
     * Repairs the extractor could not map to a priceable category.
     *
     * THESE USED TO STOP AT THE REVIEW SCREEN. They were shown once, then never
     * sent here - so they were absent from the range, from the customer's copy,
     * from the internal estimate and from the CRM. On a real Idaho RE-10 that
     * was seven of twenty requests, including a chimney, a crawlspace vapor
     * barrier and floor insulation. The agent got a range that looked like the
     * whole job and quietly was not, and nobody on our side ever saw the
     * missing items. They travel now.
     */
    unmapped: z
      .array(z.object({ verbatim: z.string().max(2000), reason: z.string().max(1000).optional() }))
      .max(40)
      .optional(),
    /** Extractor observations worth putting in front of the estimator. */
    documentNotes: z.array(z.string().max(1000)).max(20).optional(),
  })
  .refine((b) => (b.preferredContact === "email" ? Boolean(b.email) : true), {
    message: "An email address is required when email is the preferred contact method.",
    path: ["email"],
  })
  .refine((b) => (b.preferredContact !== "email" ? Boolean(b.phone) : true), {
    message: "A phone number is required when phone or text is the preferred contact method.",
    path: ["phone"],
  });

/** Days from today to the deadline, which drives the expedite uplift. */
function daysUntil(date: string | undefined): number | null {
  if (!date) return null;
  const target = Date.parse(date);
  if (Number.isNaN(target)) return null;
  const days = Math.round((target - Date.now()) / 86_400_000);
  return Number.isFinite(days) ? days : null;
}

export async function POST(request: NextRequest) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const items: RepairItemInput[] = body.repairs.map((r) => ({
    id: r.id,
    description: r.description,
    kind: r.kind,
    location: r.location,
    quantity: r.quantity ?? null,
    sourceRef: r.sourceRef,
    needsReview: r.needsReview,
    hasPhoto: r.hasPhoto,
  }));

  const estimate = estimateRe10(items, {
    occupancy: body.occupancy ?? "unknown",
    access: body.access ?? "standard",
    daysToDeadline: daysUntil(body.repairDeadline),
    hasInspectionReport: body.hasInspectionReport ?? false,
  });

  // CUSTOMER-FACING SHAPE. Range, categories, scope, caveats. No cost, no
  // margin, no line item, no mention of what anything cost us.
  const customerView = {
    price: estimate.quotedPrice,
    validDays: estimate.quoteValidDays,
    categories: estimate.trades.map((t) => ({
      trade: t.trade,
      label: TRADE_LABELS[t.trade],
      itemCount: t.repairs.length,
      items: t.repairs.map((p) => ({
        description: p.input.description,
        label: p.recipe.label,
        location: p.input.location ?? null,
        quantityAssumed: p.quantityAssumed,
        quantity: p.quantity,
        unit: p.recipe.unit,
      })),
    })),
    // Unpriced items are listed alongside the ones that need an onsite visit,
    // because from the customer's side they are the same fact: this is in your
    // document, it is NOT in this number, and here is why. Splitting them into
    // two lists would only make one of them easier to miss.
    needsOnsite: [
      ...estimate.review.map((r) => ({
        description: r.input.description,
        why: r.text,
      })),
      ...(body.unmapped ?? []).map((u) => ({
        description: u.verbatim,
        why:
          u.reason ??
          "This one does not fit the categories we price automatically, so we price it after seeing it.",
      })),
    ],
    uncertainty: estimate.uncertainty,
    assumptions: estimate.assumptions,
  };

  /**
   * What this specific read is allowed to say about itself.
   *
   * REFINED IN PLACE RATHER THAN REPLACING THE ENGINE. `estimateRe10` already
   * writes assumptions derived from the priced result, and they were written
   * carefully - one of them carries a note explaining why it does NOT say "one
   * mobilization per trade". Those are folded in as evidenced assumptions
   * rather than regenerated, so there is one source of truth per claim. What
   * the disclosure adds is everything the engine had no way to know: which
   * requests could not be mapped, which pages could not be read, and the
   * repair-specific protections, each gated on this document rather than
   * printed for everyone.
   */
  const disclosure = buildRe10Disclosure({
    estimate,
    unmapped: body.unmapped,
    documentNotes: body.documentNotes,
    documentCount: (body.documents ?? []).length || 1,
    repairDeadline: body.repairDeadline ?? null,
    occupancy: body.occupancy,
  });

  const contact: Re10Contact = {
    name: body.name,
    email: body.email || undefined,
    phone: body.phone || undefined,
    preferredContact: body.preferredContact,
    role: body.role,
    brokerage: body.brokerage,
    propertyAddress: body.propertyAddress,
    closingDate: body.closingDate,
    repairDeadline: body.repairDeadline,
    occupancy: body.occupancy,
    notes: body.notes,
  };

  // Awaited so the response can report honestly whether the copy was sent -
  // the wizard says "we have emailed you a copy" and should only say it when
  // that is true. Delivery never throws; a failure is logged and reported as
  // false rather than surfaced as an error on a request that already succeeded.
  const delivery = await deliverRe10Lead({
    contact,
    estimate,
    customerView,
    documents: body.documents ?? [],
    unmapped: body.unmapped ?? [],
    documentNotes: body.documentNotes ?? [],
  });

  return NextResponse.json({
    price: estimate.quotedPrice,
    validDays: estimate.quoteValidDays,
    confidence: estimate.confidence,
    propertyAddress: body.propertyAddress,
    closingDate: body.closingDate ?? null,
    repairDeadline: body.repairDeadline ?? null,
    categories: customerView.categories,
    needsOnsite: customerView.needsOnsite,
    uncertainty: estimate.uncertainty,
    assumptions: estimate.assumptions,
    priced: estimate.priced.length,
    unpriced: customerView.needsOnsite.length,
    emailed: delivery.customerEmailed,
    /**
     * Generated for THIS document. Assumptions carry what we took it to mean,
     * items say what is in and what is out and why, gaps name what we could not
     * read, and the acknowledgments are only the ones that apply.
     */
    disclosure: {
      assumptions: disclosure.assumptions.map((a) => a.text),
      included: disclosure.items.filter((i) => i.status === "included").length,
      excluded: disclosure.items
        .filter((i) => i.status === "excluded")
        .map((i) => ({ label: i.label, detail: i.detail })),
      needsAttention: disclosure.items
        .filter((i) => i.status === "needs-onsite" || i.status === "needs-specialist" || i.status === "needs-review")
        .map((i) => ({ label: i.label, detail: i.detail, status: i.status })),
      allowances: disclosure.items
        .filter((i) => i.status === "allowance")
        .map((i) => ({ label: i.label, detail: i.detail })),
      warnings: disclosure.warnings.map((w) => w.text),
      missing: disclosure.missing.map((m) => ({ what: m.what, where: m.where, effect: m.effect, remedy: m.remedy })),
      factors: disclosure.factors,
      acknowledgments: disclosure.acknowledgments,
      nextSteps: disclosure.nextSteps,
      confidence: disclosure.confidence,
    },
  });
}
