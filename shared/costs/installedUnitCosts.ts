import type { FinishLevel, ProjectType } from "@/shared/estimateEngine";

/**
 * Installed unit costs (materials AND labor in one number), by finish level.
 *
 * WHY THIS EXISTS
 * The estimator used to look a price up in PRICE_MATRIX and then divide that
 * total across components by fixed share percentages, back-calculating each
 * "unit cost" as cost / quantity. The breakdown a homeowner read was a
 * percentage split of a hardcoded number, not a build-up of the work. This
 * table is the other direction: real costs per unit, so a total can be summed
 * from the scope the visitor actually selected.
 *
 * WHERE THE NUMBERS COME FROM
 * Anchored to shared/costs/lineItemCatalog.ts - P5's own line items, which
 * carry separate Materials and Labor rows. An installed cost is the pair
 * added together, e.g. Cabinets 250/LF material + 200/LF labor = 450/LF.
 * Where the catalog has no direct equivalent (allowance-style scopes such as
 * "shower or tub system"), the figure is a Boise-market installed cost for
 * that scope at that finish level.
 *
 * LABOR IS NEVER A SEPARATE LINE
 * Every number here is labor-inclusive by construction. Crew time, trade
 * labor and installation are inside the unit cost, so no client-facing line
 * ever reads "labor". Overhead, profit, project management and contingency
 * are handled the same way - carried as a percentage on top of direct cost
 * and folded proportionally into the visible lines (see CLIENT_HIDDEN_
 * COMPONENT_IDS in costCatalog.ts), never itemised for the homeowner.
 *
 * TUPLE ORDER IS THE FINISH LADDER: [refresh, mid-range, high-end, luxury].
 */
export const FINISH_ORDER = ["refresh", "mid-range", "high-end", "luxury"] as const;

export type InstalledCostTuple = readonly [number, number, number, number];

/**
 * Direct cost is 72% of the customer price; the remaining 28% is project
 * management (8), permits and inspections (2), contingency (6) and overhead
 * and profit (12). Identical to the soft-cost shares in costCatalog.ts, so
 * the two modules cannot disagree about what a price contains.
 */
export const DIRECT_COST_SHARE = 0.72;

export const INSTALLED_UNIT_COSTS: Record<
  ProjectType,
  Record<string, InstalledCostTuple>
> = {
  kitchen: {
    cabinetry: [160, 450, 900, 1400],
    countertops: [40, 85, 180, 280],
    backsplash: [20, 28, 55, 90],
    flooring: [8, 14, 24, 34],
    "plumbing-fixtures": [750, 1600, 4500, 9000],
    "plumbing-labor": [1000, 2200, 4500, 7000],
    electrical: [200, 350, 700, 1100],
    "drywall-paint-trim": [8, 14, 26, 38],
    demolition: [900, 1600, 3200, 4800],
    "hardware-misc": [500, 1300, 3500, 6500],
  },
  bathroom: {
    "shower-tub": [2200, 4500, 9500, 17000],
    "tile-work": [20, 28, 52, 85],
    "vanity-storage": [220, 450, 900, 1500],
    "plumbing-fixtures": [900, 1800, 4200, 8000],
    "plumbing-labor": [1200, 2400, 4800, 7500],
    "electrical-vent": [600, 1200, 2600, 4500],
    "drywall-paint-trim": [8, 14, 26, 38],
    demolition: [700, 1200, 2400, 3800],
    flooring: [6, 8, 14, 22],
    waterproofing: [8, 12, 20, 30],
  },
  "whole-home": {
    "kitchen-scope": [18000, 42000, 92000, 155000],
    "bathroom-scope": [13000, 31000, 68000, 115000],
    flooring: [8, 14, 24, 34],
    "interior-paint-trim": [6, 10, 17, 26],
    electrical: [9000, 18000, 38000, 62000],
    plumbing: [8000, 16000, 33000, 55000],
    hvac: [9000, 16000, 32000, 52000],
    "drywall-repair": [9, 14, 24, 36],
    demolition: [4500, 9000, 18000, 30000],
  },
  addition: {
    framing: [13, 16, 21, 28],
    "roofing-exterior": [12, 15, 20, 27],
    foundation: [21, 25, 32, 42],
    "insulation-drywall": [11, 14, 18, 24],
    "flooring-finishes": [10, 14, 21, 30],
    "windows-doors": [1900, 2500, 3600, 5200],
    "interior-trim-paint": [7, 9, 13, 19],
    electrical: [25, 32, 45, 62],
    "hvac-extension": [22, 30, 41, 57],
    "plumbing-rough": [15, 19, 27, 37],
  },
  adu: {
    framing: [13, 16, 21, 28],
    "roofing-exterior": [12, 15, 20, 27],
    foundation: [21, 25, 32, 42],
    "utility-connections": [14000, 18000, 24000, 32000],
    "insulation-drywall": [11, 14, 18, 24],
    kitchenette: [15000, 20000, 28000, 39000],
    bathroom: [14000, 19000, 26000, 36000],
    "windows-doors": [1900, 2500, 3600, 5200],
    electrical: [20, 26, 35, 48],
    hvac: [17, 22, 30, 42],
    plumbing: [16, 21, 28, 40],
  },
  basement: {
    "framing-insulation": [9, 11, 15, 20],
    "drywall-finish": [8, 10, 14, 19],
    flooring: [6, 8, 13, 19],
    electrical: [300, 400, 560, 800],
    "interior-trim-paint": [5, 6, 9, 13],
    "egress-window": [3600, 4500, 6200, 8600],
    "hvac-extension": [3400, 4500, 6200, 8600],
    "doors-millwork": [780, 1000, 1400, 2000],
    "demolition-prep": [1900, 2500, 3500, 4900],
  },
};

/** Installed unit cost for one component at one finish level. */
export function installedUnitCost(
  project: ProjectType,
  componentId: string,
  finish: FinishLevel
): number | undefined {
  const row = INSTALLED_UNIT_COSTS[project]?.[componentId];
  if (!row) return undefined;
  const i = FINISH_ORDER.indexOf(finish as (typeof FINISH_ORDER)[number]);
  return i >= 0 ? row[i] : undefined;
}

/**
 * Inherent uncertainty of each project type, as a fraction either side of the
 * centre. These are the spreads the old PRICE_MATRIX carried, averaged across
 * its tiers - the matrix's LEVELS were wrong (owner, 2026-09-03) but the width
 * of its ranges reflected real variance in each kind of work, so the spread is
 * kept while the level is now built up. The band still tightens from here as
 * the visitor supplies detail; see calculateEstimate.
 */
export const NATURAL_BAND: Record<ProjectType, number> = {
  kitchen: 0.21,
  bathroom: 0.22,
  "whole-home": 0.23,
  addition: 0.16,
  adu: 0.17,
  basement: 0.22,
};
