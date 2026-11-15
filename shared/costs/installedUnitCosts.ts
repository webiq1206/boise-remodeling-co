import type { FinishLevel, ProjectType } from "@/shared/estimateEngine";

/**
 * RETIRED. The homepage calculator no longer reads a local unit-cost table.
 * Prices come from lib/p5/priceBookData.ts through shared/planningBookPrice.ts.
 * The uncertainty band below is not a dollar price. It is how wide a range
 * to show around the book total.
 */
export const FINISH_ORDER = ["refresh", "mid-range", "high-end", "luxury"] as const;

export type InstalledCostTuple = readonly [number, number, number, number];

/**
 * Kept so an older takeoff path can still name the direct-cost share. The
 * calculator does not gross the book total up by this factor.
 */
export const DIRECT_COST_SHARE = 0.72;

export const INSTALLED_UNIT_COSTS: Record<
  ProjectType,
  Record<string, InstalledCostTuple>
> = {
  kitchen: {},
  bathroom: {},
  "whole-home": {},
  addition: {},
  adu: {},
  basement: {},
};

/** Retired. Always undefined, so a caller cannot fall back to a local price. */
export function installedUnitCost(
  _project: ProjectType,
  _componentId: string,
  _finish: FinishLevel
): number | undefined {
  return undefined;
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
