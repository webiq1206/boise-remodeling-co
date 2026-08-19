/**
 * The measurement vocabulary a bid is actually assembled from.
 *
 * WHY THIS EXISTS. Scope items carried a description and nothing else, so a
 * read of a commercial set produced excellent prose - "main bar millwork,
 * 18'-2 3/4" long x 3'-6" high" - and not one number anything could multiply
 * by a rate. Prose is a takeoff a human still has to do. A quantity with a
 * unit is a takeoff a machine can price.
 *
 * The units are deliberately the ones a rate card is written in, not the ones
 * a drawing happens to print. A drawing says 18'-2 3/4"; a bid says 18.23 LF,
 * because that is what multiplies by a dollars-per-linear-foot rate.
 */

export const TAKEOFF_UNITS = [
  "EA", // each: fixtures, doors, casework units, appliances
  "LF", // linear feet: bar runs, trim, countertops, curb, pipe
  "SF", // square feet: floor, wall, ceiling, roofing, glazing
  "SY", // square yards: flooring and paving, as some trades price them
  "CY", // cubic yards: concrete, excavation, fill
  "TON",
  "LB",
  "HR", // labour-only scope stated in hours
  "LS", // lump sum: a scope with no natural unit, priced as one item
] as const;

export type TakeoffUnit = (typeof TAKEOFF_UNITS)[number];

/** "" means the drawings stated no unit, which is different from LS. */
export type StatedUnit = TakeoffUnit | "";

/**
 * Trades, at the granularity a subcontractor bids.
 *
 * Broader than CSI divisions on purpose: a rate book kept by a design-build
 * remodeler is organised by who does the work, not by a 50-division standard
 * nobody here maintains. Commercial and residential share this list, because
 * a bar millwork package and a kitchen island are the same trade doing the
 * same kind of work at different scale - which is exactly the property that
 * lets one engine bid both.
 */
export const TRADES = [
  "general-conditions",
  "demolition",
  "sitework",
  "concrete",
  "masonry",
  "structural-steel",
  "rough-carpentry",
  "finish-carpentry",
  "millwork",
  "roofing",
  "waterproofing",
  "doors-windows-glazing",
  "drywall",
  "flooring",
  "tile",
  "painting",
  "specialties",
  "equipment",
  "furnishings",
  "plumbing",
  "hvac",
  "electrical",
  "fire-protection",
  "low-voltage",
  "landscape",
] as const;

export type Trade = (typeof TRADES)[number];

export const TRADE_LABELS: Record<Trade, string> = {
  "general-conditions": "General conditions",
  demolition: "Demolition",
  sitework: "Sitework",
  concrete: "Concrete",
  masonry: "Masonry",
  "structural-steel": "Structural steel",
  "rough-carpentry": "Rough carpentry",
  "finish-carpentry": "Finish carpentry",
  millwork: "Millwork and casework",
  roofing: "Roofing",
  waterproofing: "Waterproofing",
  "doors-windows-glazing": "Doors, windows and glazing",
  drywall: "Drywall and framing",
  flooring: "Flooring",
  tile: "Tile",
  painting: "Painting and finishes",
  specialties: "Specialties",
  equipment: "Equipment",
  furnishings: "Furnishings",
  plumbing: "Plumbing",
  hvac: "HVAC",
  electrical: "Electrical",
  "fire-protection": "Fire protection",
  "low-voltage": "Low voltage and AV",
  landscape: "Landscape and irrigation",
};

/**
 * Feet from a drawing's dimension string.
 *
 * Drawings write 18'-2 3/4"; nothing multiplies that by a rate. Returns null
 * rather than a guess when the string is not a dimension, because a wrong
 * length silently priced is worse than a length the estimator is asked for.
 */
export function parseFeet(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[’′]/g, "'").replace(/[”″]/g, '"').trim();

  // 18'-2 3/4"  |  18' 2"  |  18'
  const feetInches = cleaned.match(/^(\d+)\s*'\s*-?\s*(?:(\d+)\s+)?(?:(\d+)\/(\d+))?\s*(?:(\d+))?\s*"?$/);
  if (feetInches && cleaned.includes("'")) {
    const feet = Number(feetInches[1]);
    const whole = Number(feetInches[2] ?? feetInches[5] ?? 0);
    const frac = feetInches[3] && feetInches[4] ? Number(feetInches[3]) / Number(feetInches[4]) : 0;
    const total = feet + (whole + frac) / 12;
    return Number.isFinite(total) ? Math.round(total * 100) / 100 : null;
  }

  // 2 3/4" or 9" - inches only
  const inchesOnly = cleaned.match(/^(?:(\d+)\s*)?(?:(\d+)\/(\d+)\s*)?"$/);
  if (inchesOnly && (inchesOnly[1] || inchesOnly[2])) {
    const inches = Number(inchesOnly[1] ?? 0);
    const frac = inchesOnly[2] && inchesOnly[3] ? Number(inchesOnly[2]) / Number(inchesOnly[3]) : 0;
    const total = (inches + frac) / 12;
    return Number.isFinite(total) ? Math.round(total * 100) / 100 : null;
  }

  // A bare decimal, only when it is unambiguous.
  const bare = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|lf)?$/i);
  if (bare) {
    const n = Number(bare[1]);
    return Number.isFinite(n) ? n : null;
  }

  return null;
}
