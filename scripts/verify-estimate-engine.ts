import { buildUpTotal } from "../shared/costCatalog";
import {
  EMPTY_ESTIMATE_INPUT,
  EMPTY_REFINEMENTS,
  calculateEstimate,
  countVisibleUserRefinements,
  getMaxRefinementFields,
  getProjectSizeConfig,
  getRefinementVisibility,
  getSetRefinementKeys,
  getSizePresets,
  PLANNING_RANGE_ADJUSTMENT_LOW,
  PLANNING_RANGE_ADJUSTMENT_HIGH,
  getAvailableFinishLevels,
  isCompleteEstimateInput,
  type ProjectType,
  type UserRefinementKey,
  type FinishLevel,
  type EstimateRefinements,
  buildDynamicScope,
} from "../shared/estimateEngine";
import {
  buildTakeoff,
  shareSum,
  takeoffForClient,
  CLIENT_HIDDEN_COMPONENT_IDS,
  findForbiddenPhrase,
  TAKEOFF_BASIS_NOTICE,
  TAKEOFF_SCOPE_NOTICE,
} from "../shared/costCatalog";
import {
  buildCustomerEmailHtml,
  buildAdminEmailHtml,
  buildEstimateSectionsHtml,
} from "../server/services/consultationEmail";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const projects: ProjectType[] = ["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"];

const mid = (r: { priceLow: number; priceHigh: number }) => (r.priceLow + r.priceHigh) / 2;
const width = (r: { priceLow: number; priceHigh: number }) => r.priceHigh - r.priceLow;

// Nothing is selected by default and no estimate can exist without selections.
assert(EMPTY_ESTIMATE_INPUT.project === null, "no project selected by default");
assert(EMPTY_ESTIMATE_INPUT.finish === null, "no finish selected by default");
assert(EMPTY_ESTIMATE_INPUT.sqft === null, "no size selected by default");
assert(
  Object.values(EMPTY_REFINEMENTS).every((v) => v === null),
  "no refinement selected by default",
);
assert(!isCompleteEstimateInput(EMPTY_ESTIMATE_INPUT), "empty input is not calculable");
assert(getSetRefinementKeys(EMPTY_REFINEMENTS).length === 0, "no refinement keys set by default");

for (const project of projects) {
  const visibility = getRefinementVisibility(project);
  const maxFields = getMaxRefinementFields(project);
  const visibleCount = Object.values(visibility).filter(Boolean).length;
  assert(maxFields === visibleCount, `${project} max fields matches visibility (${maxFields})`);

  // Bathroom count is now priced on every project whose published rate covers a
  // known number of them, so these counts include it.
  if (project === "adu") {
    // A dwelling unit always has a kitchen, so the question is full vs compact
    // rather than whether one exists at all.
    assert(!visibility.layoutChanges, `${project} hides layout changes`);
    assert(visibility.bathroomCount, `${project} asks how many bathrooms`);
    assert(visibility.kitchenIncluded, `${project} asks full kitchen vs kitchenette`);
    assert(maxFields === 4, `${project} exposes four refinement fields`);
  } else if (project === "addition") {
    assert(!visibility.layoutChanges, `${project} hides layout changes`);
    assert(visibility.bathroomCount, `${project} asks how many bathrooms`);
    assert(visibility.kitchenIncluded, `${project} asks about a kitchen`);
    assert(maxFields === 4, `${project} exposes four refinement fields`);
  } else if (project === "basement") {
    assert(visibility.layoutChanges, `${project} shows layout changes`);
    assert(visibility.bathroomCount, `${project} asks how many bathrooms`);
    assert(visibility.kitchenIncluded, `${project} asks about a wet bar`);
    assert(maxFields === 4, `${project} exposes four refinement fields`);
  } else if (project === "whole-home") {
    // Layout, systems, bathroom count and kitchen inclusion. Bathroom count and
    // kitchen replaced the retired roomCount, which double counted size.
    assert(visibility.layoutChanges, `${project} shows layout changes`);
    assert(visibility.bathroomCount, `${project} asks how many bathrooms`);
    assert(visibility.kitchenIncluded, `${project} asks whether the kitchen is included`);
    assert(maxFields === 4, `${project} exposes four refinement fields`);
  } else if (project === "bathroom") {
    // Layout, systems, fixture count within a bathroom, and how many bathrooms.
    assert(visibility.layoutChanges, `${project} shows layout changes`);
    assert(visibility.fixtureCount, `${project} asks fixture count`);
    assert(visibility.bathroomCount, `${project} asks how many bathrooms`);
    assert(maxFields === 4, `${project} exposes four refinement fields`);
  } else {
    assert(visibility.layoutChanges, `${project} shows layout changes`);
    assert(maxFields === 3, `${project} exposes three refinement fields`);
  }

  // Size presets are valid, intentional starting points within bounds.
  const config = getProjectSizeConfig(project);
  const presets = getSizePresets(project);
  assert(presets.length === 3, `${project} has three size presets`);
  for (const preset of presets) {
    assert(
      preset.sqft >= config.min && preset.sqft <= config.max,
      `${project} preset ${preset.id} within bounds`,
    );
    assert(preset.sqft % config.step === 0, `${project} preset ${preset.id} snaps to step`);
  }
}

const kitchenMax = getMaxRefinementFields("kitchen");
const kitchenDetailed = calculateEstimate(
  {
    project: "kitchen",
    finish: "mid-range",
    sqft: getProjectSizeConfig("kitchen").baselineSqft,
    refinements: {
      ...EMPTY_REFINEMENTS,
      layoutChanges: "major",
      plumbingElectrical: "full",
      cabinetTier: "custom",
    },
  },
  kitchenMax,
);
assert(kitchenDetailed.confidence === "detailed", "kitchen reaches detailed guidance at max fields");
assert(kitchenDetailed.confidencePercent === 85, "kitchen detailed guidance is 85%");

const kitchenBase = calculateEstimate(
  {
    project: "kitchen",
    finish: "mid-range",
    sqft: getProjectSizeConfig("kitchen").baselineSqft,
    refinements: { ...EMPTY_REFINEMENTS },
  },
  0,
);
const kitchenNeutral = calculateEstimate(
  {
    project: "kitchen",
    finish: "mid-range",
    sqft: getProjectSizeConfig("kitchen").baselineSqft,
    refinements: { ...EMPTY_REFINEMENTS, layoutChanges: "none", plumbingElectrical: "cosmetic" },
  },
  2,
);
// Neutral refinements carry no cost premium, so the CENTER is unchanged - but
// answering the questions (even with "standard") is information that reduces
// uncertainty, so the band tightens and the range gets narrower.
assert(
  Math.abs(mid(kitchenNeutral) - mid(kitchenBase)) <= 1000,
  "neutral refinements keep the estimate center",
);
assert(
  width(kitchenNeutral) < width(kitchenBase),
  "providing detail (even neutral) narrows the range",
);

// The uncertainty band tightens as detail is added: a fully-specified estimate
// is strictly narrower (as a spread) than the starting range.
assert(
  kitchenDetailed.priceHigh / kitchenDetailed.priceLow < kitchenBase.priceHigh / kitchenBase.priceLow,
  "adding detail narrows the range spread",
);

// ADU configuration: detached carries a premium over attached; neither uses
// the two-story addition multiplier.
const aduInput = {
  project: "adu" as const,
  finish: "mid-range" as const,
  sqft: getProjectSizeConfig("adu").baselineSqft,
};
const aduDetached = calculateEstimate(
  { ...aduInput, refinements: { ...EMPTY_REFINEMENTS, aduConfig: "detached" } },
  1,
);
const aduAttached = calculateEstimate(
  { ...aduInput, refinements: { ...EMPTY_REFINEMENTS, aduConfig: "attached" } },
  1,
);
assert(aduDetached.priceHigh > aduAttached.priceHigh, "detached ADU prices above attached");
assert(
  aduDetached.included.includes("Detached ADU") && aduAttached.included.includes("Attached ADU"),
  "ADU configuration reflected in scope",
);

const aduDetailed = calculateEstimate(
  {
    ...aduInput,
    refinements: {
      ...EMPTY_REFINEMENTS,
      plumbingElectrical: "full",
      aduConfig: "attached",
      bathroomCount: 1,
      kitchenIncluded: true,
    },
  },
  4,
);
assert(aduDetailed.confidence === "detailed", "ADU reaches detailed guidance at max fields");

const hiddenKeys: UserRefinementKey[] = ["layoutChanges", "plumbingElectrical"];
const hiddenCount = countVisibleUserRefinements("adu", hiddenKeys);
assert(hiddenCount === 1, "hidden layout refinements are not counted for ADU");
assert(
  countVisibleUserRefinements("adu", ["aduConfig", "stories"]) === 1,
  "stories not counted for ADU; aduConfig counted",
);

// Sub-baseline counts never discount below the base range.
const bathBase = calculateEstimate(
  {
    project: "bathroom",
    finish: "mid-range",
    sqft: getProjectSizeConfig("bathroom").baselineSqft,
    refinements: { ...EMPTY_REFINEMENTS },
  },
  0,
);
const bathOneFixture = calculateEstimate(
  {
    project: "bathroom",
    finish: "mid-range",
    sqft: getProjectSizeConfig("bathroom").baselineSqft,
    refinements: { ...EMPTY_REFINEMENTS, fixtureCount: 1 },
  },
  1,
);
// A low fixture count carries no discount multiplier, so it never pulls the
// estimate CENTER below the base (the band may tighten around that center as
// detail is added, but the midpoint does not drop).
// Tolerance is one rounding step, not one dollar. Both endpoints round to the
// nearest $1,000 independently, so the midpoint can legitimately shift by up to
// $500 without any discount having been applied. The invariant being protected
// is that no DISCOUNT multiplier exists for a low fixture count, not that the
// rounded midpoint is bit-identical.
assert(
  mid(bathOneFixture) >= mid(bathBase) - 1000,
  "low fixture count never discounts the estimate center",
);

const wholeHomeLarge = calculateEstimate(
  {
    project: "whole-home",
    finish: "mid-range",
    sqft: 8000,
    refinements: { ...EMPTY_REFINEMENTS },
  },
  0,
);
const wholeHomeBase = calculateEstimate(
  {
    project: "whole-home",
    finish: "mid-range",
    sqft: getProjectSizeConfig("whole-home").baselineSqft,
    refinements: { ...EMPTY_REFINEMENTS },
  },
  0,
);
assert(
  wholeHomeLarge.priceHigh > wholeHomeBase.priceHigh,
  "whole-home price scales up with square footage",
);

const aduMaxSqft = getProjectSizeConfig("adu").max;
assert(aduMaxSqft === 900, "ADU square footage is capped at 900");

/* ══════════════════════════════════════════════════════════════════════
   EXHAUSTIVE INVARIANT SWEEP

   The checks above are scenario spot-checks. These sweep the entire input
   space (every project x finish x size step x scope ladder) and assert the
   properties the model must ALWAYS satisfy. This is what catches a pricing
   regression before a homeowner sees it.

   NOTE: this proves the arithmetic is self-consistent and well-behaved. It
   cannot prove the base rates in PRICE_MATRIX match real Boise costs; that
   requires calibration against closed jobs.
══════════════════════════════════════════════════════════════════════ */

let sweepChecks = 0;
function check(condition: boolean, message: string) {
  sweepChecks++;
  assert(condition, message);
}

function sizeGrid(project: ProjectType): number[] {
  const { min, max, step } = getProjectSizeConfig(project);
  const points: number[] = [];
  for (let s = min; s <= max; s += step) points.push(s);
  if (points[points.length - 1] !== max) points.push(max);
  return points;
}

function priceAt(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  refinements: EstimateRefinements,
) {
  const count = countVisibleUserRefinements(project, getSetRefinementKeys(refinements));
  return calculateEstimate({ project, finish, sqft, refinements }, count);
}

// 1. Well-formedness across every reachable combination.
for (const project of projects) {
  for (const finish of getAvailableFinishLevels(project)) {
    for (const sqft of sizeGrid(project)) {
      const r = priceAt(project, finish, sqft, { ...EMPTY_REFINEMENTS });
      const where = `${project}/${finish}/${sqft}sf`;
      check(Number.isFinite(r.priceLow) && Number.isFinite(r.priceHigh), `${where}: finite price`);
      check(r.priceLow > 0, `${where}: positive low`);
      check(r.priceLow < r.priceHigh, `${where}: low below high`);
      check(r.priceLow % 1000 === 0 && r.priceHigh % 1000 === 0, `${where}: rounded to 1k`);
      const spread = r.priceHigh / r.priceLow;
      check(spread >= 1.1, `${where}: band at least 1.1x (got ${spread.toFixed(2)})`);
      check(spread <= 2.2, `${where}: band at most 2.2x (got ${spread.toFixed(2)})`);
    }
  }
}

// 2. Monotonic in size: a larger space never costs less.
for (const project of projects) {
  for (const finish of getAvailableFinishLevels(project)) {
    let prev = 0;
    for (const sqft of sizeGrid(project)) {
      const m = mid(priceAt(project, finish, sqft, { ...EMPTY_REFINEMENTS }));
      check(m >= prev, `${project}/${finish}: size monotonic at ${sqft}sf (${m} < ${prev})`);
      prev = m;
    }
  }
}

// 3. Monotonic in finish: a richer finish never costs less.
for (const project of projects) {
  for (const sqft of sizeGrid(project)) {
    let prev = 0;
    for (const finish of getAvailableFinishLevels(project)) {
      const m = mid(priceAt(project, finish, sqft, { ...EMPTY_REFINEMENTS }));
      check(m >= prev, `${project}@${sqft}sf: finish monotonic at ${finish} (${m} < ${prev})`);
      prev = m;
    }
  }
}

// 4. Monotonic in scope: escalating any refinement never lowers the estimate.
const LADDERS: { key: keyof EstimateRefinements; values: unknown[] }[] = [
  { key: "layoutChanges", values: ["none", "moderate", "major"] },
  { key: "plumbingElectrical", values: ["cosmetic", "partial", "full"] },
  { key: "cabinetTier", values: ["standard", "semi-custom", "custom"] },
  { key: "fixtureCount", values: [1, 2, 3, 4, 5, 6, 7, 8] },
  { key: "bathroomCount", values: [1, 2, 3, 4, 5] },
  { key: "kitchenIncluded", values: [false, true] },
  { key: "stories", values: [1, 2] },
  { key: "aduConfig", values: ["attached", "detached"] },
];

for (const project of projects) {
  const v = getRefinementVisibility(project);
  const shows: Record<string, boolean> = {
    layoutChanges: v.layoutChanges,
    plumbingElectrical: v.plumbingElectrical,
    cabinetTier: v.cabinetTier,
    fixtureCount: v.fixtureCount,
    bathroomCount: v.bathroomCount,
    kitchenIncluded: v.kitchenIncluded,
    stories: v.stories,
    aduConfig: v.aduConfiguration,
  };
  for (const finish of getAvailableFinishLevels(project)) {
    const sqft = getProjectSizeConfig(project).baselineSqft;
    for (const { key, values } of LADDERS) {
      if (!shows[key as string]) continue;
      let prev = 0;
      for (const value of values) {
        const refinements = { ...EMPTY_REFINEMENTS, [key]: value } as EstimateRefinements;
        const m = mid(priceAt(project, finish, sqft, refinements));
        check(
          m >= prev,
          `${project}/${finish}: scope monotonic for ${String(key)}=${String(value)} (${m} < ${prev})`,
        );
        prev = m;
      }
    }
  }
}

// 5. Size scaling must be SUBLINEAR for remodels. Cost follows cabinet runs,
//    fixture counts and tile area, not floor area. Linear scaling here is what
//    produced the $198k-$247k kitchen that triggered this work.
for (const project of ["kitchen", "bathroom", "basement", "whole-home"] as ProjectType[]) {
  const cfg = getProjectSizeConfig(project);
  const doubled = Math.min(cfg.max, cfg.baselineSqft * 2);
  if (doubled <= cfg.baselineSqft) continue;
  const small = mid(priceAt(project, "mid-range", cfg.baselineSqft, { ...EMPTY_REFINEMENTS }));
  const big = mid(priceAt(project, "mid-range", doubled, { ...EMPTY_REFINEMENTS }));
  const areaRatio = doubled / cfg.baselineSqft;
  const priceRatio = big / small;
  check(
    priceRatio < areaRatio,
    `${project}: price scaled ${priceRatio.toFixed(2)}x for ${areaRatio.toFixed(2)}x area (must be sublinear)`,
  );
}

// 6. New construction SHOULD scale close to linearly: an addition really does
//    cost roughly proportionally more per square foot added.
for (const project of ["addition", "adu"] as ProjectType[]) {
  const cfg = getProjectSizeConfig(project);
  const bigger = Math.min(cfg.max, Math.round(cfg.baselineSqft * 1.5));
  if (bigger <= cfg.baselineSqft) continue;
  const small = mid(priceAt(project, "mid-range", cfg.baselineSqft, { ...EMPTY_REFINEMENTS }));
  const big = mid(priceAt(project, "mid-range", bigger, { ...EMPTY_REFINEMENTS }));
  const areaRatio = bigger / cfg.baselineSqft;
  const priceRatio = big / small;
  check(
    priceRatio > 1 + (areaRatio - 1) * 0.6,
    `${project}: new construction should scale near-linearly (got ${priceRatio.toFixed(2)}x for ${areaRatio.toFixed(2)}x area)`,
  );
}

// 7. SOURCE FIDELITY. At its baseline size with no refinements, every project
//    and finish must reproduce THE BUILD-UP exactly - the sum of each direct
//    component's quantity at that size times its installed unit cost, grossed
//    up for soft costs.
//
//    This check used to assert the 2025 cost guide / PRICE_MATRIX instead. The
//    owner ruled those cells wrong (2026-09-03) and the engine now prices from
//    the build-up, so asserting the retired numbers would pin the estimator to
//    the very figures it was corrected away from. The guard itself still
//    matters and is unchanged in spirit: any edit to unit costs, quantities,
//    the band model or the soft-cost share that moves a baseline quote away
//    from what the components sum to now fails the build. COST_GUIDE_2025 is
//    retained below only as the historical reference the change moved off.
const COST_GUIDE_2025: Partial<Record<ProjectType, Partial<Record<FinishLevel, [number, number]>>>> = {
  // Kitchen is no longer the guide. Calibrated 2026-07 against two issued
  // estimates (EST-10088 $34,335 and EST-10049 $31,850), both scope-normalized
  // to this catalog's kitchen definition, which put a full-scope mid-range
  // equivalent at 0.71x and 0.94x of what the model quoted. Every tier scaled
  // by the conservative middle, 0.85. Guide values were [18750, 31250],
  // [43750, 68750], [100000, 162500], [175000, 225000].
  kitchen: {
    refresh: [15900, 26600],
    "mid-range": [37200, 58400],
    "high-end": [85000, 138100],
    luxury: [148800, 191300],
  },
  bathroom: {
    refresh: [12000, 20000],
    "mid-range": [22000, 36000],
    "high-end": [44000, 64000],
    luxury: [72000, 112000],
  },
  // Whole-home is no longer the guide. Owner pricing decision 2026-07: every
  // tier scaled by 4/3 so an 1,800 sqft mid-range whole-home quotes $180,000 to
  // $240,000 ($100/sf floor) rather than $135,000 to $180,000 ($75/sf). Guide
  // values were [54000, 90000], [135000, 225000], [270000, 387000],
  // [450000, 765000].
  "whole-home": {
    refresh: [72000, 120000],
    "mid-range": [180000, 300000],
    "high-end": [360000, 516000],
    luxury: [600000, 1020000],
  },
  // Addition, like ADU, is no longer the guide. The guide priced an addition
  // above an ADU per square foot, which is backwards: an ADU carries a kitchen,
  // a bath and utility connections that an addition does not. Derived from the
  // calibrated ADU minus those (18%) plus a tie-in allowance (10%), i.e. 0.8116
  // of the guide. Guide values were [120000, 170000], [200000, 280000],
  // [340000, 460000].
  addition: {
    "mid-range": [97000, 138000],
    "high-end": [162000, 227000],
    luxury: [276000, 373000],
  },
  // ADU is the one category NOT from the guide. It is calibrated to a real
  // closed job: cheapest delivered detached ADU about $145,000, owner-set
  // starting point $250/sq ft. Guide values were [210000, 300000],
  // [300000, 420000], [420000, 600000], all scaled by 0.7364.
  adu: {
    "mid-range": [155000, 221000],
    "high-end": [221000, 309000],
    luxury: [309000, 442000],
  },
  basement: {
    "mid-range": [45000, 76500],
    "high-end": [90000, 144000],
    luxury: [157500, 225000],
  },
};

  for (const project of projects) {
    const baseline = getProjectSizeConfig(project).baselineSqft;
    for (const finish of getAvailableFinishLevels(project)) {
      const r = priceAt(project, finish, baseline, { ...EMPTY_REFINEMENTS });
      const built = buildUpTotal(project, finish, baseline);
      const centre = (r.priceLow + r.priceHigh) / 2;
      // Rounding to the nearest $1,000 at each end moves the centre slightly.
      const tolerance = 0.02;
      check(
        Math.abs(centre - built) / built <= tolerance,
        `${project}/${finish}: baseline quote must reproduce the build-up ` +
          `(quoted centre ${Math.round(centre)}, components sum to ${Math.round(built)})`
      );
    }
  }

// 8. COMPONENT TAKEOFF RECONCILIATION. The catalog prices a project from
//    components and quantities, but it must never move a price. Shares are
//    asserted to sum to exactly 1 per project, and the sum of the line items
//    is asserted to reproduce the estimate midpoint on every project, finish
//    and size. Without this, a share edit could silently change what a
//    homeowner is quoted.
for (const project of projects) {
  const sum = shareSum(project);
  check(
    Math.abs(sum - 1) < 1e-9,
    `${project}: component shares sum to ${sum}, must be exactly 1 or the takeoff cannot reconcile`,
  );

  const sizeConfig = getProjectSizeConfig(project);
  for (const finish of getAvailableFinishLevels(project)) {
    for (let sqft = sizeConfig.min; sqft <= sizeConfig.max; sqft += sizeConfig.step) {
      const result = calculateEstimate({
        project,
        finish,
        sqft,
        refinements: EMPTY_REFINEMENTS,
      });
      const midpoint = (result.priceLow + result.priceHigh) / 2;
      const takeoff = buildTakeoff(project, finish, sqft, midpoint);

      // Each line rounds to the nearest dollar, so drift is bounded by the
      // line count. Anything larger means the shares no longer reconcile.
      const drift = Math.abs(takeoff.total - midpoint);
      check(
        drift <= takeoff.lines.length,
        `${project}/${finish} @${sqft}sf: takeoff total ${takeoff.total} drifts ${drift.toFixed(2)} from midpoint ${midpoint}`,
      );
      sweepChecks++;

      check(
        takeoff.lines.every((line) => line.cost >= 0 && Number.isFinite(line.cost)),
        `${project}/${finish} @${sqft}sf: takeoff produced a negative or non-finite line`,
      );

      /* WITH AN ADMIN OVERRIDE APPLIED. Every check above ran against catalog
         defaults only, so a bad database override was invisible to every build
         gate. A modest real override (1.5x the derived unit cost of the first
         direct line) must keep the takeoff reconciling and every line sane -
         the runaway-override case is excluded at the validation boundary
         (isValidOverrideValue), which is asserted separately below. */
      const firstDirect = takeoff.lines.find((l) => l.group === "direct" && l.unitCost > 0);
      if (firstDirect) {
        const overridden = buildTakeoff(project, finish, sqft, midpoint, {
          [firstDirect.id]: firstDirect.unitCost * 1.5,
        });
        const oDrift = Math.abs(overridden.total - midpoint);
        check(
          oDrift <= overridden.lines.length,
          `${project}/${finish} @${sqft}sf: takeoff with an override on "${firstDirect.id}" drifts ${oDrift.toFixed(2)} from midpoint`,
        );
        check(
          overridden.lines.every((line) => line.cost >= 0 && Number.isFinite(line.cost)),
          `${project}/${finish} @${sqft}sf: override takeoff produced a negative or non-finite line`,
        );
      }
      sweepChecks++;

      // CLIENT VIEW. Project management and overhead must never appear as
      // lines a homeowner can see, and folding them in must not move the
      // total by a single dollar.
      const clientView = takeoffForClient(takeoff);
      check(
        clientView.lines.every((line) => !CLIENT_HIDDEN_COMPONENT_IDS.has(line.id)),
        `${project}/${finish} @${sqft}sf: client takeoff leaks a hidden line`,
      );
      sweepChecks++;
      check(
        clientView.total === takeoff.total,
        `${project}/${finish} @${sqft}sf: client takeoff total ${clientView.total} != full total ${takeoff.total}`,
      );
      sweepChecks++;
      check(
        clientView.lines.every((line) => line.cost >= 0 && Number.isFinite(line.cost)) &&
          clientView.lines.length === takeoff.lines.length - 2,
        `${project}/${finish} @${sqft}sf: client takeoff malformed`,
      );
      sweepChecks++;
      check(
        clientView.lines.every((line) => {
          const original = takeoff.lines.find((l) => l.id === line.id);
          return original !== undefined && line.cost >= original.cost;
        }),
        `${project}/${finish} @${sqft}sf: folding hidden costs in must not shrink any visible line`,
      );
      sweepChecks++;
    }
  }
}

// 9. NO SIZE PLATEAUS. "A larger space never costs less" permits equal, which
//    is how a hard multiplier clamp went unnoticed while it made every
//    whole-home between 4,070 and 8,000 sqft quote an identical price. Price
//    must actually respond to size across the whole slider.
for (const project of projects) {
  const sizeConfig = getProjectSizeConfig(project);
  const steps = Math.floor((sizeConfig.max - sizeConfig.min) / sizeConfig.step);
  for (const finish of getAvailableFinishLevels(project)) {
    let longestFlatRun = 0;
    let run = 0;
    let previous = -1;
    for (let sqft = sizeConfig.min; sqft <= sizeConfig.max; sqft += sizeConfig.step) {
      const { priceLow } = calculateEstimate({
        project,
        finish,
        sqft,
        refinements: EMPTY_REFINEMENTS,
      });
      if (priceLow === previous) {
        run++;
        longestFlatRun = Math.max(longestFlatRun, run);
      } else {
        run = 0;
      }
      previous = priceLow;
    }
    // Adjacent steps can round to the same dollar figure; a plateau spanning
    // more than a tenth of the slider is a clamp, not rounding.
    const allowed = Math.max(2, Math.ceil(steps * 0.1));
    check(
      longestFlatRun <= allowed,
      `${project}/${finish}: price is flat across ${longestFlatRun} consecutive size steps (max allowed ${allowed}); a clamp is binding inside the valid range`,
    );
    sweepChecks++;

    const smallest = calculateEstimate({ project, finish, sqft: sizeConfig.min, refinements: EMPTY_REFINEMENTS });
    const largest = calculateEstimate({ project, finish, sqft: sizeConfig.max, refinements: EMPTY_REFINEMENTS });
    check(
      largest.priceLow > smallest.priceLow,
      `${project}/${finish}: largest size does not cost more than smallest`,
    );
    sweepChecks++;
  }
}

// 10. UPGRADE SCOPE. Kitchen and bathroom "what are you upgrading" chips scope
//     the estimate down for a partial remodel. The invariants that keep this
//     honest: an unspecified or complete scope reproduces the full rate exactly
//     (so source fidelity holds), a partial scope always costs strictly less
//     than the full remodel, and adding a component never lowers the price.
const SCOPE_CHIPS: Partial<Record<ProjectType, string[]>> = {
  kitchen: ["cabinets", "counters", "flooring", "lighting"],
  bathroom: ["shower", "tub", "vanity", "tile"],
};
for (const project of projects) {
  const chips = SCOPE_CHIPS[project];
  if (!chips) {
    // A project without scope chips must be completely unaffected by the field.
    const cfg = getProjectSizeConfig(project);
    const withScope = calculateEstimate({
      project,
      finish: getAvailableFinishLevels(project)[0],
      sqft: cfg.baselineSqft,
      refinements: { ...EMPTY_REFINEMENTS, upgradeScope: ["anything"] },
    });
    const without = calculateEstimate({
      project,
      finish: getAvailableFinishLevels(project)[0],
      sqft: cfg.baselineSqft,
      refinements: EMPTY_REFINEMENTS,
    });
    assert(
      withScope.priceLow === without.priceLow && withScope.priceHigh === without.priceHigh,
      `${project}: upgradeScope must not affect a project with no scope chips`,
    );
    sweepChecks++;
    continue;
  }

  const cfg = getProjectSizeConfig(project);
  for (const finish of getAvailableFinishLevels(project)) {
    const base = { project, finish, sqft: cfg.baselineSqft } as const;
    const full = calculateEstimate({ ...base, refinements: EMPTY_REFINEMENTS });
    const allSelected = calculateEstimate({
      ...base,
      refinements: { ...EMPTY_REFINEMENTS, upgradeScope: [...chips] },
    });

    // None specified and all selected both mean a full remodel.
    assert(
      allSelected.priceLow === full.priceLow && allSelected.priceHigh === full.priceHigh,
      `${project}/${finish}: selecting every upgrade chip must equal the full base rate`,
    );
    sweepChecks++;

    // A single-component partial scope must cost strictly less than the full
    // remodel, and progressively adding components must never lower the price.
    let prev = 0;
    for (let i = 1; i <= chips.length; i++) {
      const subset = chips.slice(0, i);
      const r = calculateEstimate({
        ...base,
        refinements: { ...EMPTY_REFINEMENTS, upgradeScope: subset },
      });
      if (i < chips.length) {
        assert(
          r.priceHigh < full.priceHigh,
          `${project}/${finish}: partial scope (${subset.join("+")}) must cost less than a full remodel`,
        );
      }
      assert(
        r.priceLow >= prev,
        `${project}/${finish}: adding an upgrade lowered the price at ${subset.join("+")}`,
      );
      prev = r.priceLow;
      sweepChecks++;
    }
  }
}

// 11. LEAD-FACING VOCABULARY. The takeoff invariants above prove that
//     takeoffForClient strips the hidden lines, but that only protects a
//     surface that remembers to call it. This section renders the REAL
//     customer email and asserts the finished HTML contains none of the
//     forbidden vocabulary, so a future surface that forgets the client view
//     fails the build instead of reaching a homeowner.
//
//     An issued proposal (EST-10079) carried a visible "Contractor OH&P" line
//     to a client, which is the concrete failure this guard exists to prevent.
{
  const sampleLead = {
    name: "Verification Lead",
    phone: "2085550000",
    email: "verify@example.com",
    address: "123 Main St",
    zip: "83702",
    projectType: "kitchen",
    budget: "$50,000",
  };

  // Refinement combinations that change which lines render, so the guard is
  // not just checking one happy path.
  const refinementCombos: EstimateRefinements[] = [
    EMPTY_REFINEMENTS,
    { ...EMPTY_REFINEMENTS, cabinetTier: "custom", layoutChanges: "major", plumbingElectrical: "full" },
    { ...EMPTY_REFINEMENTS, upgradeScope: ["cabinets"] },
  ];

  let renderedEmails = 0;

  for (const project of projects) {
    const cfg = getProjectSizeConfig(project);
    for (const finish of getAvailableFinishLevels(project)) {
      for (const sqft of [cfg.min, cfg.baselineSqft, cfg.max]) {
        for (const refinements of refinementCombos) {
          const result = calculateEstimate({ project, finish, sqft, refinements });
          const estimate = {
            project,
            finish,
            sqft,
            priceLow: result.priceLow,
            priceHigh: result.priceHigh,
            roi: result.roi,
            confidence: result.confidenceLabel,
            refinements,
            included: result.included,
          };

          const customerHtml = buildCustomerEmailHtml(sampleLead, estimate);
          const leaked = findForbiddenPhrase(customerHtml);
          check(
            leaked === null,
            `${project}/${finish} @${sqft}sf: customer email leaks forbidden vocabulary ("${leaked}"). ` +
              `These costs must be folded into the visible line items, never named. See CLIENT_FORBIDDEN_PHRASES.`,
          );

          // The plain-text alternative is derived from this HTML by the send
          // path, so a clean HTML body is a clean text body.
          const clientSections = buildEstimateSectionsHtml(estimate, undefined, "client");
          const sectionLeak = findForbiddenPhrase(clientSections);
          check(
            sectionLeak === null,
            `${project}/${finish} @${sqft}sf: client estimate sections leak forbidden vocabulary ("${sectionLeak}")`,
          );

          // NO PER-LINE DOLLARS. The client sees trades and quantities; the
          // dollar figures are proportional allocations, not priced work.
          // The scope notice renders in place of the basis notice, and the
          // priced midpoint subtotal must not appear at all.
          check(
            clientSections.includes(TAKEOFF_SCOPE_NOTICE) &&
              !clientSections.includes(TAKEOFF_BASIS_NOTICE),
            `${project}/${finish} @${sqft}sf: client sections must carry the scope notice, not the priced-basis notice`,
          );
          check(
            !clientSections.includes("Midpoint of your planning range"),
            `${project}/${finish} @${sqft}sf: client sections must not render the priced takeoff subtotal`,
          );

          renderedEmails++;
        }
      }
    }
  }

  // MUTATION CHECK. A guard that cannot fail proves nothing. The admin email
  // renders internal figures on purpose, so it MUST trip the same detector.
  // If this ever passes as "clean", the detector has stopped working and every
  // assertion above became worthless.
  //
  // This used to prove itself against the old allocation takeoff, which itemized
  // "Project management and supervision" and "Overhead and profit". That format
  // has been removed - the admin email carried it AND the line-item engine
  // rollup, two sets of numbers for one job - so the proof now rests on the
  // rollup's own internal columns, which are just as forbidden lead-side.
  const adminHtml = buildAdminEmailHtml(sampleLead, {
    project: "kitchen",
    finish: "mid-range",
    sqft: 250,
    priceLow: 44000,
    priceHigh: 55000,
    roi: 74,
    confidence: "Starting range",
    refinements: EMPTY_REFINEMENTS,
    included: ["Semi-custom cabinetry"],
  });
  check(
    findForbiddenPhrase(adminHtml) !== null,
    "admin email no longer contains the hidden lines: the forbidden-phrase detector is broken, " +
      "so the customer-email assertions above are vacuous",
  );
  check(
    adminHtml.includes("Internal breakdown") &&
      adminHtml.includes("Our cost") &&
      adminHtml.includes("Gross profit"),
    "admin email must keep the line-item engine rollup, with our cost and gross profit, for the team",
  );
  // Exactly one pricing format. The allocation takeoff and the engine rollup
  // disagreeing by a few hundred dollars on the same job is worse than either
  // alone, because the reader has to decide which to trust.
  check(
    !adminHtml.includes("Where the money typically goes") &&
      !adminHtml.includes("Midpoint of your planning range"),
    "admin email must not carry the retired allocation takeoff alongside the engine rollup",
  );

  console.log(
    `  lead-facing vocabulary: ${renderedEmails} rendered customer emails clean, detector proven live against the admin email.`,
  );
}

// 12. SCOPE LIST HONESTY. The per-tier `included` blurb describes a typical job
//     at that finish level, so it will claim work the visitor has explicitly
//     declined unless it is filtered. A scope list that contradicts the answer
//     the visitor just gave is worse than no scope list.
{
  const refs = (o: Partial<typeof EMPTY_REFINEMENTS>) => ({ ...EMPTY_REFINEMENTS, ...o });
  const scope = (project: ProjectType, finish: FinishLevel, sqft: number, r: typeof EMPTY_REFINEMENTS) =>
    buildDynamicScope({ project, finish, sqft, refinements: r });

  const noLayoutBath = scope("bathroom", "luxury", 80, refs({ layoutChanges: "none" }));
  check(
    !noLayoutBath.some((i) => /layout reconfiguration/i.test(i)),
    `a luxury bathroom with no layout change must not claim a layout reconfiguration (got: ${noLayoutBath.join("; ")})`,
  );

  const noLayoutKitchen = scope("kitchen", "high-end", 250, refs({ layoutChanges: "none" }));
  check(
    !noLayoutKitchen.some((i) => /island addition/i.test(i)),
    `a kitchen with no layout change must not claim an island addition (got: ${noLayoutKitchen.join("; ")})`,
  );

  const stockCabs = scope("kitchen", "high-end", 250, refs({ cabinetTier: "standard" }));
  check(
    stockCabs.some((i) => /standard stock cabinetry/i.test(i)) &&
      !stockCabs.some((i) => /custom cabinetry/i.test(i)),
    `standard cabinetry must not appear alongside custom cabinetry (got: ${stockCabs.join("; ")})`,
  );

  const semiCabs = scope("kitchen", "luxury", 250, refs({ cabinetTier: "semi-custom" }));
  check(
    !semiCabs.some((i) => /fully custom cabinetry/i.test(i)),
    `semi-custom cabinetry must not claim fully custom (got: ${semiCabs.join("; ")})`,
  );

  // Suppression must be driven by an ANSWER, never by silence: an untouched
  // refinement leaves the tier blurb exactly as written.
  const untouched = scope("kitchen", "high-end", 250, refs({}));
  check(
    untouched.some((i) => /island addition/i.test(i)) &&
      untouched.some((i) => /custom or semi-custom cabinetry/i.test(i)),
    `an unanswered refinement must not filter the tier blurb (got: ${untouched.join("; ")})`,
  );

  // And an answer that WANTS the work suppresses nothing.
  const majorLayout = scope("kitchen", "high-end", 250, refs({ layoutChanges: "major" }));
  check(
    majorLayout.some((i) => /island addition/i.test(i)),
    `a major layout change must keep the layout scope lines (got: ${majorLayout.join("; ")})`,
  );

  // Nothing may ever render as "undefined" or blank in a customer-facing list.
  let scopeLists = 0;
  for (const project of projects) {
    for (const finish of getAvailableFinishLevels(project)) {
      const list = scope(project, finish, getProjectSizeConfig(project).baselineSqft, EMPTY_REFINEMENTS);
      scopeLists++;
      check(
        list.every((i) => typeof i === "string" && i.trim().length > 0 && i !== "undefined"),
        `${project}/${finish}: scope list has an empty or undefined entry (${list.join("; ")})`,
      );
    }
  }
  console.log(`  scope honesty: ${scopeLists} scope lists checked, contradictions suppressed only where answered.`);
}

console.log(
  `All estimate engine checks passed (${sweepChecks} exhaustive invariant checks across every project, finish, size step and scope ladder).`,
);
