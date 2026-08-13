/**
 * The contract between document analysis and the pricing engine.
 *
 * Deliberately a separate module from both. The extractor's job is to read what
 * the RE-10 says; the estimator's job is to price it. Putting the boundary here
 * means the extractor can be swapped, stubbed, or run offline in a test without
 * the estimator knowing, and the estimator stays a pure function of a repair
 * list rather than of whatever a model happened to return.
 *
 * THE SCHEMA IS THE GUARD. Extraction runs against a JSON schema with
 * `additionalProperties: false` and a closed `kind` enum, so a model cannot
 * invent a repair category the estimator has no recipe for. Anything it cannot
 * map lands in `unmapped` with the original text, which becomes an item for
 * manual review rather than a guess.
 */
import { RECIPES, type RepairKind, type ReviewReason } from "../costs/re10Repairs";

/** Every kind the estimator can price, as a plain array for the JSON schema. */
export const EXTRACTABLE_KINDS = Object.keys(RECIPES) as RepairKind[];

/** Review reasons the extractor is allowed to raise. */
export const EXTRACTION_REVIEW_REASONS: ReviewReason[] = [
  "structural", "foundation", "water-intrusion", "mold-hazmat", "asbestos-lead",
  "major-roofing", "electrical-service", "sewer-septic", "hvac-replacement",
  "gas", "fire-damage", "engineering", "permit-uncertain", "concealed",
  "incomplete-info", "out-of-scope",
];

/** One repair the extractor found, before the homeowner has confirmed it. */
export interface ExtractedRepair {
  /** The request in the document's own words. Never paraphrased. */
  verbatim: string;
  kind: RepairKind;
  /** Where in the home, only when the document says. */
  location?: string;
  /** In the kind's unit. Null when the document gives no measurement. */
  quantity?: number | null;
  /** Inspection report reference, when the RE-10 cites one. */
  sourceRef?: string;
  /** Set when this item must not be priced automatically. */
  needsReview?: ReviewReason;
  /**
   * How sure the extractor is that it read this correctly. Surfaced to the
   * homeowner on the confirm step so low-confidence rows get checked first.
   */
  confidence: "high" | "medium" | "low";
}

/** Text the extractor could not map to a priceable kind. */
export interface UnmappedItem {
  verbatim: string;
  /** Why it did not map, in plain language. */
  reason: string;
}

export interface ExtractionResult {
  /**
   * How many distinct requests the model counted on the pages it was given,
   * before extracting any of them. Compared against what actually came back;
   * see the schema comment for why a count is the only way to catch a short
   * enumeration.
   */
  requestCountOnPages?: number;
  repairs: ExtractedRepair[];
  unmapped: UnmappedItem[];
  /** What the document says about the property, when it says anything. */
  propertyAddress?: string | null;
  closingDate?: string | null;
  repairDeadline?: string | null;
  /** True when the document read as an actual RE-10 or inspection response. */
  looksLikeRe10: boolean;
  /** Anything the extractor wants a human to know about the document itself. */
  documentNotes: string[];
}

/**
 * The JSON schema the model is constrained to.
 *
 * `additionalProperties: false` and the closed `kind` enum are the load-bearing
 * parts: they are what stop a plausible-sounding but unpriceable category from
 * reaching the estimator. Numeric constraints are deliberately absent because
 * structured outputs do not support them - quantity sanity is enforced in the
 * estimator, which already treats zero, negative and NaN as "no measurement".
 */
export const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    repairs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          verbatim: { type: "string", description: "The repair request copied word for word from the document. Never reworded." },
          kind: { type: "string", enum: EXTRACTABLE_KINDS, description: "The closest matching repair category. If nothing matches, do not force it - put the item in unmapped instead." },
          location: { type: "string", description: "Where in the home, only if the document says. Omit otherwise." },
          quantity: { type: ["number", "null"], description: "The measurement the document gives, in the unit natural to this repair (square feet, linear feet, or a count). Null when the document gives no measurement. Never estimate one." },
          sourceRef: { type: "string", description: "Inspection report item number or page reference, if cited." },
          needsReview: { type: "string", enum: EXTRACTION_REVIEW_REASONS, description: "Set when the item must not be priced automatically." },
          confidence: { type: "string", enum: ["high", "medium", "low"], description: "How confident you are that you read this item correctly." },
        },
        required: ["verbatim", "kind", "confidence"],
        additionalProperties: false,
      },
    },
    unmapped: {
      type: "array",
      items: {
        type: "object",
        properties: {
          verbatim: { type: "string" },
          reason: { type: "string", description: "Why this could not be mapped to a repair category, in plain language for a homeowner." },
        },
        required: ["verbatim", "reason"],
        additionalProperties: false,
      },
    },
    propertyAddress: { type: ["string", "null"] },
    closingDate: { type: ["string", "null"], description: "ISO date if stated, otherwise null." },
    repairDeadline: { type: ["string", "null"], description: "ISO date if stated, otherwise null." },
    /**
     * COUNT FIRST, THEN EXTRACT, THEN RECONCILE.
     *
     * A long list is not lost to truncation - measured at 5,968 output tokens
     * against a 16,000 ceiling while thirteen of sixty-five requests went
     * unlisted. The model simply stops enumerating and treats the job as done,
     * the same starvation already documented for the plans schema. Counting is
     * a far easier task than extracting, so the count comes back right when
     * the list does not, and the caller compares the two and re-reads a
     * smaller bite when they disagree. Nothing else can catch this: a short
     * list is indistinguishable from a complete one without a target.
     */
    requestCountOnPages: {
      type: "integer",
      description:
        "Before extracting anything, COUNT the distinct repair requests visible on these pages and report the number here. Count every numbered or bulleted request, including ones you will place in unmapped, and including any that continue from a previous page. This is a count of what is printed, not of what you managed to extract.",
    },
    looksLikeRe10: { type: "boolean", description: "True if this reads as an RE-10, inspection response, or repair addendum." },
    documentNotes: { type: "array", items: { type: "string" }, description: "Anything a human should know: unreadable pages, handwriting, ambiguity." },
  },
  required: ["requestCountOnPages", "repairs", "unmapped", "looksLikeRe10", "documentNotes"],
  additionalProperties: false,
} as const;

/**
 * What the extractor is told to do.
 *
 * The rules here are the ones that matter commercially, so they are stated as
 * prohibitions rather than preferences. The single most expensive failure would
 * be inventing a quantity: a confident "120 SF of siding" that the document
 * never said produces a confident price for work nobody asked for.
 */
export const EXTRACTION_SYSTEM_PROMPT = `You read Idaho RE-10 inspection response forms, home inspection reports, repair addenda, and photographs of them, and you extract the repairs the buyer has actually asked the seller to complete.

WHAT TO EXTRACT
Extract only REQUESTED REPAIRS - the items the buyer is asking to have fixed. Do not extract:
- Inspector observations that carry no repair request
- Recommended maintenance the buyer did not ask for
- Items the document explicitly says the buyer is NOT requesting
- Duplicate references to a repair you have already captured

NEVER INVENT ANYTHING
- Copy the request into "verbatim" word for word. Do not tidy it up or reword it.
- Give a "quantity" ONLY when the document states a measurement or a count. If it does not, omit it or use null. Never estimate, infer, or assume a size. A missing measurement is expected and handled downstream; a fabricated one produces a confident price for work nobody requested.
- Give a "location" only when the document says where.
- If a repair does not clearly match one of the available kinds, do NOT force it into the closest one. Put it in "unmapped" with the original wording.

FLAG FOR HUMAN REVIEW
Set "needsReview" on anything involving structural work, foundations, water intrusion, mold or hazardous materials, asbestos or lead, major roofing, main electrical service or panels, sewer or septic, HVAC replacement, gas lines, fire damage, engineering, uncertain permits, concealed damage, or a request too vague to price. These get an onsite evaluation rather than an automatic number.

CONFIDENCE
Use "low" when the text is unclear, handwritten, cut off, or you had to interpret. Use "high" only when the request is unambiguous. A homeowner reviews low-confidence rows first, so being honest here is more useful than looking certain.

If the document is not an RE-10, inspection response, or repair list, set looksLikeRe10 to false and say so in documentNotes rather than extracting whatever you can find.`;
