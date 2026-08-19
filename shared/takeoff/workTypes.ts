import { normalizeKey } from "../documents/auditTrail";
import type { TakeoffUnit, Trade } from "./units";

/**
 * WHAT A THING ACTUALLY IS, at the granularity a price depends on.
 *
 * THE PROBLEM THIS SOLVES. Rates were looked up by trade and unit, so a
 * paneled bar front and a glass display shelf were the same lookup:
 * "millwork, LF". Those differ by an order of magnitude. A book keyed that
 * coarsely can only ever be wrong or empty, and "no rate on file for
 * millwork/LF" is not a question any estimator can act on.
 *
 * So every scope item is classified into a WORK TYPE - a slug naming the
 * actual assembly, like "bar-front-paneled" or "base-cabinet-run" - plus the
 * few ATTRIBUTES that move its price. That is the level a real rate lives at,
 * and it is also the level at which a useful question can be asked: not "what
 * do you charge for millwork" but "what do you charge per linear foot for a
 * paneled bar front at 3'-6" with a solid-surface top".
 *
 * OPEN BY DESIGN, CONSISTENT WHERE IT MATTERS. A fixed enum cannot cover
 * "anything", so the classifier may coin a new slug. `COMMON_WORK_TYPES` is
 * shown to it first so that recurring work converges on one key instead of
 * fragmenting into "bar front", "bar-front-millwork" and "front bar" - which
 * would quietly hide the rate the company already has.
 */

export interface WorkTypeAttributes {
  /**
   * How good it is. The single biggest price multiplier inside one work type,
   * and the one a drawing most often implies rather than states.
   */
  grade?: "economy" | "standard" | "premium" | "custom";
  /** Primary material, as the drawings name it. */
  material?: string;
  /** Finish or coating, where it is priced separately from the substrate. */
  finish?: string;
  /** Size class where it changes the crew or the method (e.g. ceiling height). */
  size?: string;
  /**
   * Anything else the drawings say that a pricer would want. Free-form on
   * purpose: the set of things that move a price is not enumerable.
   */
  notes?: string;
}

export interface ClassifiedWork {
  /** Slug naming the assembly. Stable across projects. */
  workType: string;
  trade: Trade;
  attributes: WorkTypeAttributes;
  /**
   * How sure the classifier is that this is the right work type, 0 to 1.
   * A low value routes to a clarifying question rather than to a rate.
   */
  confidence: number;
  /**
   * What it would need to know to price this properly, in plain words, when
   * the drawings left something out. Empty when nothing is missing.
   */
  needsToKnow: string[];
}

/**
 * Work types seen often enough to be worth naming, so the classifier reuses a
 * key rather than inventing a synonym. NOT a closed list: anything genuinely
 * new gets a new slug, which is how coverage grows to "anything".
 */
export const COMMON_WORK_TYPES: Record<string, { trade: Trade; unit: TakeoffUnit; label: string }> = {
  // Millwork and casework
  "bar-front": { trade: "millwork", unit: "LF", label: "Bar front assembly" },
  "back-bar": { trade: "millwork", unit: "LF", label: "Back bar unit" },
  "base-cabinet-run": { trade: "millwork", unit: "LF", label: "Base cabinet run" },
  "upper-cabinet-run": { trade: "millwork", unit: "LF", label: "Upper cabinet run" },
  "tall-cabinet": { trade: "millwork", unit: "EA", label: "Tall or pantry cabinet" },
  countertop: { trade: "millwork", unit: "LF", label: "Countertop" },
  "countertop-waterfall-edge": { trade: "millwork", unit: "EA", label: "Waterfall edge return" },
  backsplash: { trade: "millwork", unit: "LF", label: "Backsplash" },
  "open-shelving": { trade: "millwork", unit: "LF", label: "Open shelving" },
  "glass-shelving": { trade: "millwork", unit: "EA", label: "Glass shelf unit" },
  "wall-paneling": { trade: "millwork", unit: "SF", label: "Wall paneling" },
  "service-station": { trade: "millwork", unit: "LF", label: "Server or service station" },
  "reception-desk": { trade: "millwork", unit: "LF", label: "Reception or host desk" },
  "built-in-seating": { trade: "millwork", unit: "LF", label: "Built-in banquette or seating" },

  // Finish carpentry
  "base-trim": { trade: "finish-carpentry", unit: "LF", label: "Base trim" },
  "door-casing": { trade: "finish-carpentry", unit: "EA", label: "Door casing set" },
  "crown-molding": { trade: "finish-carpentry", unit: "LF", label: "Crown molding" },
  handrail: { trade: "finish-carpentry", unit: "LF", label: "Handrail" },
  "stair-guardrail": { trade: "finish-carpentry", unit: "LF", label: "Stair guardrail" },

  // Other trades, seeded thinly on purpose - these grow from real work.
  "interior-door-install": { trade: "doors-windows-glazing", unit: "EA", label: "Interior door, hung" },
  "storefront-glazing": { trade: "doors-windows-glazing", unit: "SF", label: "Storefront glazing" },
  "gypsum-partition": { trade: "drywall", unit: "SF", label: "Gypsum board partition" },
  "acoustic-ceiling": { trade: "drywall", unit: "SF", label: "Acoustic ceiling" },
  "interior-paint": { trade: "painting", unit: "SF", label: "Interior paint" },
  "floor-tile": { trade: "tile", unit: "SF", label: "Floor tile" },
  "wall-tile": { trade: "tile", unit: "SF", label: "Wall tile" },
  "resilient-flooring": { trade: "flooring", unit: "SF", label: "Resilient flooring" },
  "wood-flooring": { trade: "flooring", unit: "SF", label: "Wood flooring" },
  "water-closet": { trade: "plumbing", unit: "EA", label: "Water closet, set" },
  lavatory: { trade: "plumbing", unit: "EA", label: "Lavatory, set" },
  urinal: { trade: "plumbing", unit: "EA", label: "Urinal, set" },
  "toilet-partition": { trade: "specialties", unit: "EA", label: "Toilet compartment" },
  "recessed-downlight": { trade: "electrical", unit: "EA", label: "Recessed downlight" },
  "duplex-receptacle": { trade: "electrical", unit: "EA", label: "Receptacle" },
};

/**
 * One canonical spelling for a work type.
 *
 * Without this, "Bar Front", "bar_front" and "bar front assembly" are three
 * different keys, and a company with a rate for the first appears to have no
 * rate for the other two. Matching a rate is worthless if the key drifts.
 */
export function canonicalWorkType(raw: string): string {
  const slug = normalizeKey(raw).replace(/\s+/g, "-").replace(/\|/g, "-");
  return slug.replace(/^-+|-+$/g, "") || "unclassified";
}

/**
 * The attributes that must match for two rates to be interchangeable.
 *
 * Grade only. Material and finish describe the same assembly at the same
 * labour, and a rate book that demanded an exact material match would report
 * "no rate" for oak when it holds one for maple - which is the coarse-lookup
 * failure repeated at the opposite extreme.
 */
export function attributeKey(attributes: WorkTypeAttributes): string {
  return attributes.grade ?? "standard";
}

/** Human sentence naming the work, for questions and the takeoff document. */
export function describeWork(work: ClassifiedWork, quantity: number, unit: string): string {
  const known = COMMON_WORK_TYPES[work.workType];
  const label = known?.label ?? work.workType.replace(/-/g, " ");
  const bits: string[] = [];
  if (work.attributes.grade) bits.push(work.attributes.grade);
  if (work.attributes.material) bits.push(work.attributes.material);
  if (work.attributes.size) bits.push(work.attributes.size);
  if (work.attributes.finish) bits.push(work.attributes.finish);
  const qualifiers = bits.length > 0 ? ` (${bits.join(", ")})` : "";
  const amount = quantity > 0 && unit ? `${quantity} ${unit} of ` : "";
  return `${amount}${label}${qualifiers}`;
}
