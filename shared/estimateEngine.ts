/** Server calculation entry point. Client components use estimatePresentation. */
export * from "./estimatePresentation";
import {
  normalizeFinishLevel, getMaxRefinementFields, getPlanningDetail,
  PRICE_MATRIX, PROJECT_SIZE_CONFIG, formatPlanningCurrency,
  PLANNING_DETAIL_LABELS, buildDynamicScope,
  type EstimateInput, type EstimateResult, type StoredEstimate,
  type ProjectType, type FinishLevel, type PriceData,
} from "./estimatePresentation";
import { customerPlanningRange } from "./planningBookPrice";

if (typeof window !== "undefined") throw new Error("Planning prices are calculated on the server only");

export function getPriceData(project: ProjectType, finish: FinishLevel): PriceData {
  const normalized = normalizeFinishLevel(project, finish);
  const data = PRICE_MATRIX[project][normalized];
  if (!data) {
    // Unreachable as long as getAvailableFinishLevels matches PRICE_MATRIX keys.
    throw new Error(`No price data for ${project}/${normalized}`);
  }
  const range = customerPlanningRange(project, normalized, PROJECT_SIZE_CONFIG[project].baselineSqft);
  return {
    ...data,
    low: range.low,
    high: range.high,
  };
}

export function getFinishPlanningHint(project: ProjectType, finish: FinishLevel): string {
  const data = getPriceData(project, finish);
  return `${formatPlanningCurrency(data.low)} to ${formatPlanningCurrency(data.high)} at typical size`;
}

export function calculateEstimate(input: EstimateInput, userRefinementCount = 0): EstimateResult {
  const finish = normalizeFinishLevel(input.project, input.finish);
  const safeInput: EstimateInput = finish === input.finish ? input : { ...input, finish };
  const base = getPriceData(safeInput.project, safeInput.finish);
  const maxFields = getMaxRefinementFields(input.project);
  const { level, percent } = getPlanningDetail(userRefinementCount, maxFields);

  // The estimate is a central figure with an uncertainty band around it.
  //
  // The CENTER is a pure, monotonic function of the cost drivers (project,
  // finish, size, refinements): a more intensive selection always moves the
  // center up, so two configurations remain directly comparable.
  // Center = expected cost; the band below carries the uncertainty. Keeping
  // those two jobs separate matters: the previous form took the mean of
  // (lowest base x lowest multipliers) and (highest base x highest
  // multipliers), so every selection compounded worst-case against worst-case
  // and dragged the center upward. Scaling the midpoints instead keeps the
  // center a fair expected value while staying monotonic - a more intensive
  // selection still always moves it up.
  /*
   * The centre is the shared cost book. Complete projects use the book's
   * assembly for that project. Extra rooms, a kitchen island, and a relocated
   * kitchen rough-in are separate book lines. Partial upgrade chips price
   * their own book lines instead of the assembly. Nothing here is a local
   * dollar table.
   */
  const range = customerPlanningRange(
    safeInput.project,
    safeInput.finish,
    safeInput.sqft,
    {
      layoutChanges: input.refinements.layoutChanges,
      plumbingElectrical: input.refinements.plumbingElectrical,
      bathroomCount: input.refinements.bathroomCount,
      kitchenIncluded: input.refinements.kitchenIncluded,
      stories: input.refinements.stories,
      aduConfig: input.refinements.aduConfig,
      upgradeScope: input.refinements.upgradeScope,
    },
  );

  return {
    priceLow: range.low,
    priceHigh: range.high,
    roi: base.roi,
    included: buildDynamicScope(safeInput),
    confidence: level,
    confidenceLabel: PLANNING_DETAIL_LABELS[level],
    confidencePercent: percent,
    refinementsApplied: userRefinementCount,
  };
}

export function buildStoredEstimate(input: EstimateInput, userRefinementCount = 0): StoredEstimate {
  const result = calculateEstimate(input, userRefinementCount);
  return {
    ...input,
    finish: normalizeFinishLevel(input.project, input.finish),
    priceLow: result.priceLow,
    priceHigh: result.priceHigh,
    roi: result.roi,
    confidence: result.confidence,
    confidenceLabel: result.confidenceLabel,
  };
}
