/**
 * Invariants for the margin guard and the planning range.
 *
 * These are properties that must hold for every project, quality level and size
 * on the sliders, not spot checks. A pricing engine that is right at the
 * baseline and wrong at the extremes is worse than one that is uniformly wrong,
 * because nobody looks at the extremes until a lead does.
 */
import { buildInternalEstimate, MINIMUM_GROSS_MARGIN, TARGET_GROSS_MARGIN, priceAtMargin, type QualityLevel } from "../shared/costs/engine";
import { buildPlanningRange, decideMargin } from "../shared/costs/pricing";
import { RULES_BY_PROJECT, BASELINE_SQFT } from "../shared/costs/scopeRules";
import { estimateProject } from "../shared/costs/index";
import { findLeadLeak } from "../shared/costs/outputs";
import { assessBudget, budgetGuidance } from "../shared/costs/budget";
import { resolveQuotedRange } from "../shared/costs/resolve";
import {
  getAvailableFinishLevels,
  getProjectSizeConfig,
  getRefinementVisibility,
  type ProjectType,
} from "../shared/estimateEngine";

const ceilingPinned: string[] = [];
let checks = 0;
let failed = 0;
function check(cond: boolean, msg: string) {
  checks++;
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed++;
  }
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const PROJECTS: ProjectType[] = ["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"];

// 1. GROSS MARGIN IS A MARGIN, NOT A MARKUP.
{
  const price = priceAtMargin(70000, 0.3);
  check(Math.abs(price - 100000) < 1, `30% GM on $70,000 must be $100,000, got ${usd(price)}`);
  const realised = (price - 70000) / price;
  check(Math.abs(realised - 0.3) < 1e-9, `realised margin must be 30%, got ${(realised * 100).toFixed(2)}%`);
  // The markup error this guards against.
  const markup = 70000 * 1.3;
  check(markup < price, "a 30% markup must be less than a 30% margin price, or the distinction is inverted");
}

// 2. SWEEP every project x quality x size.
for (const project of PROJECTS) {
  const rules = RULES_BY_PROJECT[project];
  check(Boolean(rules), `${project}: must have a rule set`);
  if (!rules) continue;

  const cfg = getProjectSizeConfig(project);
  const qualities = getAvailableFinishLevels(project) as QualityLevel[];

  for (const quality of qualities) {
    let previousCentre = 0;
    for (let sqft = cfg.min; sqft <= cfg.max; sqft += cfg.step) {
      const internal = buildInternalEstimate(rules, { quality, sqft }, project);

      check(
        Number.isFinite(internal.totalInternalCost) && internal.totalInternalCost > 0,
        `${project}/${quality}@${sqft}: internal cost must be finite and positive`,
      );

      // Every line must have a positive quantity and a real rate.
      check(
        internal.lines.every((l) => l.quantity > 0 && l.unitCost > 0 && Number.isFinite(l.cost)),
        `${project}/${quality}@${sqft}: a cost line has a non-positive quantity or rate`,
      );

      // Trade rollups must reconcile to the line total exactly.
      const tradeSum = internal.trades.reduce((s, t) => s + t.internalCost, 0);
      check(
        Math.abs(tradeSum - internal.directCost) < 0.01,
        `${project}/${quality}@${sqft}: trade rollup ${usd(tradeSum)} != direct cost ${usd(internal.directCost)}`,
      );

      // No cost code may appear twice: that is the duplicate-charge guard.
      const codes = internal.lines.map((l) => l.code);
      check(
        new Set(codes).size === codes.length,
        `${project}/${quality}@${sqft}: a cost code appears more than once in the takeoff`,
      );
      /* The check above inspects buildInternalEstimate's OUTPUT, which is
         already deduplicated - it can never fail. The dedup itself records
         every collision it resolved as a warning, and a collision means one
         rule's quantity was silently discarded (the addition 03-08-02 bug
         dropped either the exhaust fan or the HVAC tie-in this way). Zero
         warnings is the invariant that actually bites. */
      check(
        internal.warnings.length === 0,
        `${project}/${quality}@${sqft}: engine warnings present - ${internal.warnings.map((w) => w.message).join(" | ")}`,
      );

      const range = buildPlanningRange(internal, project, quality, sqft);

      check(range.low > 0 && range.high > range.low, `${project}/${quality}@${sqft}: range must be positive and ordered`);
      check(
        range.appliedMargin >= MINIMUM_GROSS_MARGIN - 1e-9 && range.appliedMargin <= TARGET_GROSS_MARGIN + 1e-9,
        `${project}/${quality}@${sqft}: applied margin ${range.appliedMargin} outside [${MINIMUM_GROSS_MARGIN}, ${TARGET_GROSS_MARGIN}]`,
      );

      // The band the owner specified: 0.85x to 1.15x of centre, before rounding.
      const lowRatio = range.low / range.centre;
      const highRatio = range.high / range.centre;
      check(
        lowRatio > 0.8 && lowRatio < 0.9,
        `${project}/${quality}@${sqft}: low end ${lowRatio.toFixed(3)}x of centre, expected about 0.85x`,
      );
      check(
        highRatio > 1.1 && highRatio < 1.2,
        `${project}/${quality}@${sqft}: high end ${highRatio.toFixed(3)}x of centre, expected about 1.15x`,
      );

      // Monotonic in size: a bigger space never costs less.
      check(
        range.centre >= previousCentre - 0.01,
        `${project}/${quality}: centre fell from ${usd(previousCentre)} to ${usd(range.centre)} as size grew to ${sqft}`,
      );
      previousCentre = range.centre;
    }
  }

  // 3. Richer finish never costs less, at the baseline size.
  const base = BASELINE_SQFT[project] ?? cfg.baselineSqft;
  let prev = 0;
  for (const quality of qualities) {
    const internal = buildInternalEstimate(rules, { quality, sqft: base }, project);
    const range = buildPlanningRange(internal, project, quality, base);
    check(
      range.centre >= prev - 0.01,
      `${project}: ${quality} centre ${usd(range.centre)} is below the tier beneath it (${usd(prev)})`,
    );
    prev = range.centre;
  }
}

// 4. THE MARGIN GUARD ACTUALLY GUARDS. Force a cost far above any ceiling and
//    confirm it trims to the floor and says so, rather than quoting blind.
{
  const decision = decideMargin(5_000_000, "kitchen", "mid-range", 250);
  check(decision.trimmed, "guard must trim margin on an absurdly expensive kitchen");
  check(
    Math.abs(decision.appliedMargin - MINIMUM_GROSS_MARGIN) < 1e-9,
    `guard must stop at the ${MINIMUM_GROSS_MARGIN} floor, got ${decision.appliedMargin}`,
  );
  check(decision.warnings.length > 0, "guard must warn when it trims to the floor");

  // And that it does NOT fire on an ordinary job.
  const ordinary = decideMargin(20000, "kitchen", "mid-range", 250);
  check(!ordinary.trimmed, "guard must not fire on an ordinary kitchen");
  check(
    Math.abs(ordinary.appliedMargin - TARGET_GROSS_MARGIN) < 1e-9,
    "an ordinary job must price at the full target margin",
  );
}

// 5. THE LEAD / ADMIN WALL. A lead view must never carry cost, margin or
//    line-item vocabulary, and the admin trade rows must reconcile to the
//    number the homeowner was actually shown.
for (const project of PROJECTS) {
  if (!RULES_BY_PROJECT[project]) continue;
  const base = BASELINE_SQFT[project];
  for (const quality of getAvailableFinishLevels(project) as QualityLevel[]) {
    const rows = [
      { label: "Project", value: project },
      { label: "Finish level", value: quality },
      { label: "Size", value: `${base} sq ft` },
    ];
    const result = estimateProject(project, { quality, sqft: base }, rows);

    const rendered = JSON.stringify(result.lead);
    const leak = findLeadLeak(rendered);
    check(leak === null, `${project}/${quality}: lead view leaks "${leak}"`);

    check(
      !rendered.includes(String(Math.round(result.admin.totalInternalCost))),
      `${project}/${quality}: lead view contains the internal cost figure`,
    );
    check(
      result.lead.low === result.range.low && result.lead.high === result.range.high,
      `${project}/${quality}: lead range must match the computed range exactly`,
    );
    check(result.lead.disclaimers.length >= 4, `${project}/${quality}: lead view must carry the disclaimers`);

    const sum = result.admin.trades.reduce((s, t) => s + t.customerAmount, 0);
    check(
      Math.abs(sum - result.admin.customerPrice) < 1,
      `${project}/${quality}: admin trade rows sum to ${usd(sum)}, centre is ${usd(result.admin.customerPrice)}`,
    );
    check(
      result.admin.trades.every((t) => t.children.length > 0),
      `${project}/${quality}: a trade row lost its child line items`,
    );
    check(
      Math.abs(result.admin.grossProfit - (result.admin.customerPrice - result.admin.totalInternalCost)) < 0.01,
      `${project}/${quality}: gross profit does not reconcile`,
    );
  }
}

// 6. A QUESTION WE ASK MUST CHANGE THE ANSWER.
//
//    Field visibility comes from getRefinementVisibility, the scope rules come
//    from RULES_BY_PROJECT, and nothing connected the two. Three project types
//    showed "bathrooms in scope" and then priced identically whatever the
//    homeowner answered, which is worse than not asking: they watch the number
//    not move and conclude the tool is fake.
//
//    Asserted for every visible field on every project, not just the one that
//    broke.
for (const project of PROJECTS) {
  if (!RULES_BY_PROJECT[project]) continue;
  const base = BASELINE_SQFT[project];
  const vis = getRefinementVisibility(project);
  const quality: QualityLevel = getAvailableFinishLevels(project)[0] as QualityLevel;

  /*
   * Compare the UNROUNDED centre, not the published range.
   *
   * The range rounds to $5,000 above $100,000, so on a large project a real
   * $5,357 difference can land in the same bucket and look like a dead field.
   * The question here is whether the rules respond at all, which is a property
   * of the centre; whether the response survives rounding is a separate concern.
   */
  const priceWith = (ref: Record<string, unknown>) => {
    const internal = buildInternalEstimate(
      RULES_BY_PROJECT[project],
      { quality, sqft: base, ...(ref as object) } as never,
      project,
    );
    return buildPlanningRange(internal, project, quality, base).centre.toFixed(2);
  };

  const probes: Array<{ field: string; shown: boolean; values: Record<string, unknown>[] }> = [
    { field: "bathroomCount", shown: vis.bathroomCount, values: [{ bathroomCount: 1 }, { bathroomCount: 3 }] },
    { field: "fixtureCount", shown: vis.fixtureCount, values: [{ fixtureCount: 1 }, { fixtureCount: 3 }] },
    { field: "cabinetTier", shown: vis.cabinetTier, values: [{ cabinetTier: "standard" }, { cabinetTier: "custom" }] },
    { field: "layoutChanges", shown: vis.layoutChanges, values: [{ layoutChanges: "none" }, { layoutChanges: "major" }] },
    {
      field: "plumbingElectrical",
      shown: vis.plumbingElectrical,
      values: [{ plumbingElectrical: "cosmetic" }, { plumbingElectrical: "full" }],
    },
    { field: "kitchenIncluded", shown: vis.kitchenIncluded, values: [{ kitchenIncluded: true }, { kitchenIncluded: false }] },
  ];

  for (const p of probes) {
    if (!p.shown) continue;
    const results = p.values.map(priceWith);
    if (new Set(results).size > 1) continue;

    /*
     * Identical prices have two very different causes, and conflating them
     * sends the next person hunting for a wiring bug that is not there.
     *
     * NOT WIRED - the rules genuinely ignore the field. A real defect.
     *
     * CEILING-PINNED - the margin guard trimmed this configuration down to the
     * market ceiling, so the quoted price IS the ceiling and no input can move
     * it. The field is wired; the guard is overriding it. The fix is to bring
     * that project's cost under the ceiling, not to add another multiplier.
     */
    const allTrimmed = p.values.every((v) => {
      const internal = buildInternalEstimate(RULES_BY_PROJECT[project], { quality, sqft: base, ...(v as object) } as never, project);
      return buildPlanningRange(internal, project, quality, base).marginTrimmed;
    });

    check(
      allTrimmed,
      `${project}: "${p.field}" is shown to the homeowner but every value prices identically (${results[0]}) ` +
        `and the margin guard is NOT trimming, so the field is simply not wired into the scope rules. ` +
        `Either wire it or stop asking.`,
    );
    if (allTrimmed) {
      ceilingPinned.push(`${project}/${p.field}`);
    }
  }
}

if (ceilingPinned.length) {
  console.log(`\nCEILING-PINNED (wired, but the margin guard overrides them - these projects run above the approved ceiling):`);
  for (const p of ceilingPinned) console.log(`  - ${p}`);
}

// 7. BUDGET COMPARISON. This text is lead-facing, and it makes claims about
//    money, so it gets the same treatment as everything else a homeowner reads.
for (const project of PROJECTS) {
  const rules = RULES_BY_PROJECT[project];
  if (!rules) continue;
  const base = BASELINE_SQFT[project];
  for (const quality of getAvailableFinishLevels(project) as QualityLevel[]) {
    const selections = { quality, sqft: base } as never;
    const internal = buildInternalEstimate(rules, selections, project);
    const range = buildPlanningRange(internal, project, quality, base);

    // Probe across and outside the whole range.
    const probes = [
      Math.round(range.high * 1.5),
      range.high,
      Math.round((range.low + range.high) / 2),
      range.low,
      Math.round(range.low * 0.7),
      Math.round(range.low * 0.1),
    ];

    for (const budget of probes) {
      const a = assessBudget(project, selections, { low: range.low, high: range.high }, budget);

      // The three-state rule. A budget anywhere inside the range is never
      // treated as short, because it overlaps our own uncertainty.
      const expected = budget >= range.high ? "above" : budget >= range.low ? "within" : "below";
      check(
        a.state === expected,
        `${project}/${quality} @ budget ${usd(budget)}: state ${a.state}, expected ${expected} against ${usd(range.low)}-${usd(range.high)}`,
      );

      // Never warn or offer downgrades to someone who is not short.
      if (a.state !== "below") {
        check(
          a.options.length === 0 && !a.unreachable,
          `${project}/${quality} @ ${usd(budget)}: offered trade-offs to a homeowner who is not short`,
        );
      }

      // Every offered option must ACTUALLY reach the budget and actually be
      // cheaper. Suggesting something that does not help is worse than silence.
      for (const o of a.options) {
        check(
          o.low <= budget,
          `${project}/${quality} @ ${usd(budget)}: option "${o.label}" lands at ${usd(o.low)}, which does not reach the budget`,
        );
        check(
          o.low <= range.low && o.high <= range.high,
          `${project}/${quality} @ ${usd(budget)}: option "${o.label}" is not cheaper than the original scope`,
        );
      }

      check(
        a.unreachable === (a.state === "below" && a.options.length === 0),
        `${project}/${quality} @ ${usd(budget)}: unreachable flag disagrees with the option list`,
      );

      // Lead-facing copy obeys the same vocabulary wall as everything else.
      const copy = [a.headline, a.driver ?? "", budgetGuidance(a), ...a.options.map((o) => o.label)].join(" ");
      const leak = findLeadLeak(copy);
      check(leak === null, `${project}/${quality} @ ${usd(budget)}: budget copy leaks "${leak}"`);

      // Never lead with the words the owner asked us to avoid.
      check(
        !/over budget|can'?t afford|too expensive/i.test(copy),
        `${project}/${quality} @ ${usd(budget)}: budget copy uses discouraging framing`,
      );
    }
  }
}

/* ============================================= 8. GOLDEN QUOTED RANGES
   THE REGRESSION TRAP THIS SUITE WAS MISSING. Every check above is an
   invariant, and invariants cannot notice a uniform repricing: double every
   unit cost and monotonicity, margins and reconciliation all still hold.
   These are the exact customer-facing numbers from resolveQuotedRange - the
   same function the calculator page, both lead routes, and the emails use -
   at every project x finish baseline. A UI refactor, a catalog edit, or a
   rule change that moves ANY quoted price now fails the build, which is the
   point: repricing must be a decision, recorded here, never a side effect.

   Snapshot date 2026-08-07, after the scope-rule corrections (bathroom chip
   gating, hardware double-count, addition code collisions). To intentionally
   reprice: verify the new numbers by hand, then update this table in the
   same commit as the change that moves them. */
const GOLDEN_QUOTED: Record<string, Record<string, [number, number]>> = {
  kitchen: {
    refresh: [13500, 18000],
    "mid-range": [28000, 38000],
    "high-end": [49000, 66000],
    luxury: [78000, 106000],
  },
  bathroom: {
    refresh: [9000, 12500],
    "mid-range": [15000, 20500],
    "high-end": [24000, 32000],
    luxury: [37000, 50000],
  },
  "whole-home": {
    refresh: [77000, 104000],
    "mid-range": [125000, 170000],
    "high-end": [235000, 320000],
    luxury: [370000, 500000],
  },
  addition: {
    "mid-range": [81000, 109000],
    "high-end": [105000, 145000],
    luxury: [150000, 200000],
  },
  adu: {
    "mid-range": [145000, 195000],
    "high-end": [200000, 270000],
    luxury: [285000, 385000],
  },
  basement: {
    "mid-range": [52000, 70000],
    "high-end": [79000, 107000],
    luxury: [120000, 165000],
  },
};

for (const project of PROJECTS) {
  const goldens = GOLDEN_QUOTED[project];
  if (!goldens) continue;
  const base = BASELINE_SQFT[project];
  for (const [quality, [low, high]] of Object.entries(goldens)) {
    const r = resolveQuotedRange(project, quality, base, {});
    check(r !== null, `${project}/${quality}: golden baseline failed to resolve`);
    if (!r) continue;
    check(
      r.priceLow === low && r.priceHigh === high,
      `${project}/${quality} @ ${base}sf: quoted ${usd(r.priceLow)}-${usd(r.priceHigh)} does not match the golden ${usd(low)}-${usd(high)}. If this repricing is intentional, update GOLDEN_QUOTED in the same commit.`,
    );
  }
}

console.log(`\nBaseline planning ranges:`);
for (const project of PROJECTS) {
  const rules = RULES_BY_PROJECT[project];
  if (!rules) continue;
  const base = BASELINE_SQFT[project];
  const qualities = getAvailableFinishLevels(project) as QualityLevel[];
  const cells = qualities.map((q) => {
    const internal = buildInternalEstimate(rules, { quality: q, sqft: base }, project);
    const r = buildPlanningRange(internal, project, q, base);
    return `${q}: ${usd(r.low)}-${usd(r.high)}${r.marginTrimmed ? " (trimmed)" : ""}`;
  });
  console.log(`  ${project.padEnd(11)} @${String(base).padStart(5)}sf  ${cells.join("  |  ")}`);
}

console.log(`\n${failed === 0 ? "All" : failed + " of"} ${checks} cost-pricing checks ${failed === 0 ? "passed" : "FAILED"}.`);
if (failed > 0) process.exit(1);
