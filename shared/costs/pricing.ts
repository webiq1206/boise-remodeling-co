/**
 * Turning an internal cost into a number a homeowner sees.
 *
 * Two jobs, deliberately separated:
 *
 *   THE MARGIN GUARD decides what margin the job can actually carry. The target
 *   is 30 percent gross, but a target applied blindly to a large or unusual
 *   project can produce a number that simply loses the lead. The guard trims
 *   margin toward a floor, never below it, and always says that it did.
 *
 *   THE RANGE decides how wide a band to quote around that price, because an
 *   online form cannot see the house. Width shrinks as the homeowner tells us
 *   more, and never collapses to a false single number.
 *
 * These are different questions and are answered in that order: price first,
 * then uncertainty about the price. Folding them together is how an estimator
 * ends up widening a range to hide a margin decision.
 */
import {
  MINIMUM_GROSS_MARGIN,
  TARGET_GROSS_MARGIN,
  priceAtMargin,
  type EstimateWarning,
  type InternalEstimate,
  type QualityLevel,
} from "./engine";
import {
  calculateEstimate,
  normalizeFinishLevel,
  type FinishLevel,
  type ProjectType,
} from "../estimateEngine";
import { EMPTY_REFINEMENTS } from "../estimateEngine";

/* ------------------------------------------------------------ market guard */

/**
 * What the Boise market bears for this project, size and finish level.
 *
 * Deliberately sourced from the shipping PRICE_MATRIX rather than a new table.
 * Those figures are already calibrated against the same closed jobs this engine
 * back-tests on, and the owner has signed off on them as the numbers the
 * business is willing to quote. Reusing them means the line-item engine can
 * never quietly drift above a price the company already decided was its
 * ceiling, and it gives a continuous transition between the two engines.
 *
 * Returns null when the combination is not priced (for example a "refresh"
 * addition, which does not exist), in which case the guard does not fire.
 */
export function marketCeiling(
  project: ProjectType,
  quality: QualityLevel,
  sqft: number,
): number | null {
  try {
    const finish = normalizeFinishLevel(project, quality as FinishLevel);
    const r = calculateEstimate({ project, finish, sqft, refinements: EMPTY_REFINEMENTS });
    return r.priceHigh;
  } catch {
    return null;
  }
}

export interface MarginDecision {
  appliedMargin: number;
  price: number;
  trimmed: boolean;
  warnings: EstimateWarning[];
}

/**
 * Price the job, trimming margin only as far as the market ceiling requires.
 *
 * The guard never trims below MINIMUM_GROSS_MARGIN. If the job is still above
 * the ceiling at the floor margin, it is quoted at the floor and flagged: that
 * is a real signal that the scope is genuinely expensive, and burying it by
 * cutting margin further would mean bidding work at a loss to win a lead.
 */
export function decideMargin(
  internalCost: number,
  project: ProjectType,
  quality: QualityLevel,
  sqft: number,
): MarginDecision {
  const warnings: EstimateWarning[] = [];
  const atTarget = priceAtMargin(internalCost, TARGET_GROSS_MARGIN);
  const ceiling = marketCeiling(project, quality, sqft);

  if (ceiling === null || atTarget <= ceiling) {
    return { appliedMargin: TARGET_GROSS_MARGIN, price: atTarget, trimmed: false, warnings };
  }

  // Solve for the margin that lands exactly on the ceiling: m = 1 - cost/ceiling.
  const needed = 1 - internalCost / ceiling;

  if (needed < MINIMUM_GROSS_MARGIN) {
    const floorPrice = priceAtMargin(internalCost, MINIMUM_GROSS_MARGIN);
    warnings.push({
      severity: "warn",
      message:
        `Scope prices above the market ceiling even at the ${Math.round(MINIMUM_GROSS_MARGIN * 100)}% margin floor ` +
        `($${Math.round(floorPrice).toLocaleString("en-US")} vs ceiling $${Math.round(ceiling).toLocaleString("en-US")}). ` +
        `Quoted at the floor. Review the scope before sending: either the selections are genuinely premium, or a quantity is wrong.`,
    });
    return { appliedMargin: MINIMUM_GROSS_MARGIN, price: floorPrice, trimmed: true, warnings };
  }

  warnings.push({
    severity: "info",
    message:
      `Margin trimmed from ${Math.round(TARGET_GROSS_MARGIN * 100)}% to ${Math.round(needed * 100)}% to stay at or below ` +
      `the market ceiling of $${Math.round(ceiling).toLocaleString("en-US")} for this project and finish level.`,
  });
  return { appliedMargin: needed, price: priceAtMargin(internalCost, needed), trimmed: true, warnings };
}

/* ------------------------------------------------------------------ range */

/**
 * Half-width of the quoted band, as a fraction of the centre price.
 *
 * The band answers a question the line items cannot: what has the homeowner not
 * told us? Existing conditions behind walls, access, final selections, hidden
 * damage, engineering, permit conditions and labour availability all move a real
 * number and none of them are visible through a web form.
 *
 * It is NOT the same thing as contingency, which is already carried inside cost
 * for conditions found once the walls are open. Contingency is money we expect
 * to spend; the band is our uncertainty about the estimate itself.
 */
const BASE_BAND = 0.15;

/**
 * The band never closes past this, however much detail is supplied.
 *
 * Owner decision (2026-07): quote 0.85x to 1.15x. The reasoning is to protect
 * margin while keeping the top of the range from causing sticker shock, and it
 * is sound here in a way it would not have been before, because the centre is
 * now derived from a back-tested line-item takeoff rather than a per-square-foot
 * guess. A tight band around a trustworthy centre is defensible.
 *
 * THE RISK THIS ACCEPTS, recorded so it is not rediscovered the hard way. The
 * back-test ratios against issued estimates were 0.96, 1.25, 1.00, 1.01 and
 * 0.99. One of five sat 25 percent above the engine, which is outside a 15
 * percent ceiling. So roughly one job in five should be expected to finish above
 * the top of the quoted range. That is tolerable only because every range is
 * explicitly a planning figure requiring an on-site visit, and because the
 * margin guard stops the centre drifting high in the first place.
 *
 * Deliberately equal to BASE_BAND: the band does not tighten below 15 percent
 * however much detail a homeowner supplies. Tightening further would raise the
 * chance of finishing above the ceiling with no offsetting benefit.
 */
const MIN_BAND = 0.15;

export interface PlanningRange {
  low: number;
  high: number;
  centre: number;
  /** Half-width actually used, as a fraction. */
  band: number;
  appliedMargin: number;
  marginTrimmed: boolean;
  warnings: EstimateWarning[];
}

/**
 * Rounding resolution for a range, chosen ONCE from its centre.
 *
 * Deriving the step per value let a single range straddle two resolutions: a
 * centre just over $25,000 rounded its high end to the nearest $1,000 and its
 * low end, still under the threshold, to the nearest $500. The homeowner then
 * read "$23,500 to $32,000" - two different precisions in one sentence, which
 * reads like a mistake even though both numbers were correct.
 *
 * One step per range keeps the two ends speaking with the same confidence.
 */
function stepFor(centre: number): number {
  return centre >= 100000 ? 5000 : centre >= 25000 ? 1000 : 500;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Build the customer-facing planning range.
 *
 * The band is FIXED at BASE_BAND (0.15, back-tested; see above) and can only
 * WIDEN via `bandPenalty`. A `detailRatio` parameter used to promise that
 * answering more questions narrowed the band, but MIN_BAND deliberately
 * equals BASE_BAND, so the entire tightening term was mathematically inert -
 * every caller computed and threaded a ratio that could not change a single
 * output. The dead parameter was removed rather than left implying a
 * behaviour the policy explicitly rejects.
 */
/**
 * The most a thin brief may widen the band.
 *
 * ONE-DIRECTIONAL, AND THAT ASYMMETRY IS THE POINT. Detail cannot buy a range
 * narrower than MIN_BAND, because the back-tested spread that sets that floor
 * came from jobs whose floor area was already known - it is estimator variance,
 * not input error, and no amount of documentation reduces it. Missing
 * information is the opposite: it is a real, additional uncertainty on top, and
 * quoting it at the same width as a measured project is the false precision the
 * range exists to avoid.
 */
const MAX_BAND_WIDENING = 0.2;

export function buildPlanningRange(
  estimate: InternalEstimate,
  project: ProjectType,
  quality: QualityLevel,
  sqft: number,
  /** Extra half-width for weak information. Widens only; see above. */
  bandPenalty = 0,
): PlanningRange {
  const decision = decideMargin(estimate.totalInternalCost, project, quality, sqft);
  const penalty = Math.min(MAX_BAND_WIDENING, Math.max(0, bandPenalty));
  const band = MIN_BAND + penalty;

  const centre = decision.price;
  const step = stepFor(centre);
  return {
    centre,
    low: roundTo(centre * (1 - band), step),
    high: roundTo(centre * (1 + band), step),
    band,
    appliedMargin: decision.appliedMargin,
    marginTrimmed: decision.trimmed,
    warnings: [...estimate.warnings, ...decision.warnings],
  };
}
