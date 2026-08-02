/**
 * Reading a remodel or new-build plan set well enough to price it.
 *
 * WHY THIS IS A DIFFERENT PROBLEM FROM THE RE-10. An RE-10 is a list of
 * sentences; the risk is missing one. A plan set is a set of measurements, and
 * the risk is getting one WRONG - which is worse, because a wrong measurement
 * does not look wrong. It produces a confident, tidy, incorrect price, and the
 * whole point of uploading plans is to earn a tighter number. A tight number
 * built on a misread dimension is strictly worse than the wide one it replaced:
 * a customer can plan around a wide range and cannot recover from a precise
 * figure that is wrong.
 *
 * So every rule below exists to make the model's uncertainty VISIBLE rather
 * than to squeeze more numbers out of it.
 *
 * THE NARROWING IS EARNED PER MEASUREMENT, NOT PER UPLOAD. Uploading a file
 * buys nothing. A dimension that is printed on the drawing and can be quoted
 * back tightens that item. A dimension that was inferred, paced off a scale
 * bar, or guessed from context stays as wide as it would have been with no
 * plans at all. Mixing those two would let a napkin sketch buy the same
 * confidence as a stamped permit set.
 */

/** Where a number came from. This drives how much the range may narrow. */
export type MeasurementSource =
  /** Printed on the drawing as a dimension string or schedule value. */
  | "printed"
  /** Computed from two or more printed dimensions (e.g. length x width). */
  | "derived"
  /** Read off the geometry against a stated scale. Much weaker. */
  | "scaled"
  /** The model's read of an unlabelled drawing. Treated as no better than a guess. */
  | "inferred";

/**
 * Only these two tighten anything.
 *
 * "scaled" is deliberately excluded. Scale misreads are the characteristic
 * failure on drawings - a wrong scale bar produces numbers that are internally
 * consistent and completely wrong, and nothing downstream can detect it.
 */
export const TRUSTWORTHY_SOURCES: readonly MeasurementSource[] = ["printed", "derived"];

export interface PlanRoom {
  /** Room name exactly as labelled on the plan. */
  name: string;
  /** Floor area in square feet, or null if it is not determinable. */
  areaSqFt: number | null;
  /** How the area was arrived at. */
  areaSource: MeasurementSource;
  /** Dimension string quoted verbatim from the sheet, e.g. "12'-6\" x 14'-0\"". */
  dimensionText: string | null;
  /** Ceiling height in feet if stated. */
  ceilingHeightFt: number | null;
  /** Sheet this came from, e.g. "A2.1". */
  sheet: string | null;
  /** True when this room is inside the remodel scope rather than existing to remain. */
  inScope: boolean;
}

export interface PlanCounts {
  /** Counted from a schedule where possible, from the plan otherwise. */
  label: string;
  count: number;
  source: MeasurementSource;
  sheet: string | null;
}

export interface PlanExtractionResult {
  /** True when this reads as a construction drawing set at all. */
  looksLikePlans: boolean;
  /** New construction changes what is priced; a remodel carries demolition. */
  projectType: "new-build" | "remodel" | "addition" | "unclear";
  /** Total conditioned area if the drawings state one. */
  statedTotalSqFt: number | null;
  /** Sum of the extracted room areas. Compared against the above as a check. */
  roomAreaTotalSqFt: number | null;
  rooms: PlanRoom[];
  /** Doors, windows, plumbing fixtures, and anything else countable. */
  counts: PlanCounts[];
  /** Sheets that carried the pricing-relevant content. */
  sheetsUsed: string[];
  /** Scope statements found in the general notes or demolition plan. */
  scopeNotes: string[];
  /** Anything a human must resolve: unreadable sheets, conflicts, missing pages. */
  warnings: string[];
}

export const PLAN_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    looksLikePlans: { type: "boolean" },
    projectType: { type: "string", enum: ["new-build", "remodel", "addition", "unclear"] },
    statedTotalSqFt: { type: ["number", "null"] },
    roomAreaTotalSqFt: { type: ["number", "null"] },
    rooms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          areaSqFt: { type: ["number", "null"] },
          areaSource: { type: "string", enum: ["printed", "derived", "scaled", "inferred"] },
          dimensionText: { type: ["string", "null"] },
          ceilingHeightFt: { type: ["number", "null"] },
          sheet: { type: ["string", "null"] },
          inScope: { type: "boolean" },
        },
        required: ["name", "areaSqFt", "areaSource", "dimensionText", "ceilingHeightFt", "sheet", "inScope"],
      },
    },
    counts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          count: { type: "number" },
          source: { type: "string", enum: ["printed", "derived", "scaled", "inferred"] },
          sheet: { type: ["string", "null"] },
        },
        required: ["label", "count", "source", "sheet"],
      },
    },
    sheetsUsed: { type: "array", items: { type: "string" } },
    scopeNotes: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: [
    "looksLikePlans",
    "projectType",
    "statedTotalSqFt",
    "roomAreaTotalSqFt",
    "rooms",
    "counts",
    "sheetsUsed",
    "scopeNotes",
    "warnings",
  ],
} as const;

export const PLAN_EXTRACTION_SYSTEM_PROMPT = `You read residential construction drawings for a Boise remodeling contractor and return the measurements needed to price the work.

WHAT MATTERS MOST: being right, not being complete. A measurement you are unsure of is worth less than no measurement at all, because a wrong number produces a confident wrong price. When in doubt, return null and say why in warnings.

HOW TO SOURCE EVERY NUMBER. Tag each measurement with where it came from:
- "printed": the number is written on the drawing - a dimension string, a room area tag, a schedule value. Quote it in dimensionText exactly as printed.
- "derived": you multiplied or added printed dimensions. Only when every input was printed.
- "scaled": you measured against a scale bar or drawing scale. Use this honestly; it will be treated as unreliable.
- "inferred": you judged it from the drawing without a printed number. Use this rather than pretending a number was printed.

NEVER upgrade a source. If a room has no printed dimension, its area is "scaled" or "inferred" even when your estimate feels good. The whole system depends on this being truthful, and it is checked.

WHICH SHEETS TO USE. Floor plans, demolition plans, and schedules (door, window, finish, plumbing fixture, electrical) carry what matters. Structural details, foundation sections, elevations and general notes usually do not. Record the sheet number each measurement came from, and list the sheets you actually used.

SCOPE. On a remodel, distinguish rooms being worked on from rooms shown for reference or marked "existing to remain". Set inScope accordingly. If the drawings do not make the boundary clear, say so in warnings rather than guessing.

CONSISTENCY. Report statedTotalSqFt if the drawings state a total conditioned area, and roomAreaTotalSqFt as the sum of the room areas you extracted. Do not adjust either to make them agree - a disagreement is information.

COUNTS. Count doors, windows, and plumbing fixtures from the schedule when there is one, and from the plan when there is not. Say which in source.

If this is not a construction drawing set, set looksLikePlans to false, explain in warnings, and do not invent measurements from whatever you can see.`;

/**
 * Does the extraction hang together?
 *
 * A misread scale produces numbers that are individually plausible and
 * collectively wrong, so the check that catches it is not "is this number
 * sensible" but "do two independent statements of the same fact agree". When
 * the room areas and the stated total disagree materially, something was
 * misread and nothing may be narrowed on the strength of it.
 */
export const AREA_AGREEMENT_TOLERANCE = 0.12;

export function areasAgree(result: PlanExtractionResult): boolean | null {
  const { statedTotalSqFt: stated, roomAreaTotalSqFt: summed } = result;
  if (!stated || !summed || stated <= 0) return null; // Nothing to cross-check.
  return Math.abs(summed - stated) / stated <= AREA_AGREEMENT_TOLERANCE;
}

/**
 * How much of the scope rests on numbers we can actually stand behind.
 *
 * Returned as a share so the estimator can narrow proportionally rather than
 * on a yes/no: a plan set where every room is printed deserves more than one
 * where half were paced off.
 */
export function trustedAreaShare(result: PlanExtractionResult): number {
  const scoped = result.rooms.filter((r) => r.inScope && r.areaSqFt && r.areaSqFt > 0);
  if (scoped.length === 0) return 0;
  const total = scoped.reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  if (total <= 0) return 0;
  const trusted = scoped
    .filter((r) => TRUSTWORTHY_SOURCES.includes(r.areaSource))
    .reduce((s, r) => s + (r.areaSqFt ?? 0), 0);
  return trusted / total;
}
