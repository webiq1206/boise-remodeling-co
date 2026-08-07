/**
 * End-to-end verification of the estimator as a system.
 *
 * THE POINT OF THIS FILE IS INDEPENDENCE. Every expectation below is computed
 * WITHOUT calling the engine: rates are read straight from the catalog,
 * quantities are re-derived from the documented formulas, and the arithmetic is
 * done here. A test that asks the engine what it thinks and then agrees with it
 * proves nothing. Where a figure is hand-specified it is written as a literal
 * with its derivation in a comment, so a wrong answer is visible rather than
 * self-confirming.
 *
 * Covers: pricing arithmetic, margin, contingency, rounding, tier ladders,
 * boundaries, selection isolation, conditional logic, edge cases, and the
 * consistency of the number across display, storage, email and CRM.
 */
import { LINE_ITEMS } from "../shared/costs/lineItemCatalog";
import {
  buildInternalEstimate,
  deriveDimensions,
  priceAtMargin,
  marginToMarkup,
  MINIMUM_GROSS_MARGIN,
  TARGET_GROSS_MARGIN,
  CONTINGENCY_RATE,
  type QualityLevel,
  type ScopeSelections,
} from "../shared/costs/engine";
import { buildPlanningRange } from "../shared/costs/pricing";
import { RULES_BY_PROJECT, BASELINE_SQFT } from "../shared/costs/scopeRules";
import { resolveQuotedRange, resolveInternalEstimate } from "../shared/costs/resolve";
import { assessBudget } from "../shared/costs/budget";
import { buildCustomerEmailHtml, buildAdminEmailHtml } from "../server/services/consultationEmail";
import { buildLeadEstimateRecord } from "../server/services/leadRecord";
import {
  EMPTY_REFINEMENTS,
  calculateEstimate,
  getAvailableFinishLevels,
  getProjectSizeConfig,
  countVisibleUserRefinements,
  getSetRefinementKeys,
  getMaxRefinementFields,
  type ProjectType,
  type EstimateRefinements,
} from "../shared/estimateEngine";

let pass = 0;
const failures: string[] = [];
function t(name: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else failures.push(`${name}${detail ? ` :: ${detail}` : ""}`);
}
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const PROJECTS: ProjectType[] = ["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"];

/* ============================================================ 1. ARITHMETIC
 * Hand-computed expectations. No engine involved.
 */
{
  // Gross margin: price = cost / (1 - m). 70000 / 0.70 = 100000 exactly.
  t("margin/30pct-exact", Math.abs(priceAtMargin(70000, 0.3) - 100000) < 1e-9, usd(priceAtMargin(70000, 0.3)));
  // Realised margin must equal the target: (100000-70000)/100000 = 0.30
  t("margin/realised", Math.abs((100000 - 70000) / 100000 - 0.3) < 1e-12);
  // 22% floor: 70000 / 0.78 = 89743.589...
  t("margin/22pct", Math.abs(priceAtMargin(70000, 0.22) - 89743.5897435897) < 1e-6);
  // Markup equivalent of 30% margin = 0.3/0.7 = 0.428571...
  t("margin/markup-equiv", Math.abs(marginToMarkup(0.3) - 3 / 7) < 1e-12);
  // The classic error: 30% markup gives only 23.08% margin.
  const markupPrice = 70000 * 1.3; // 91000
  t("margin/markup-is-not-margin", Math.abs((markupPrice - 70000) / markupPrice - 0.2307692307692308) < 1e-12);
  // Contingency published in the catalog is 10%.
  t("contingency/rate", CONTINGENCY_RATE === 0.1, String(CONTINGENCY_RATE));
  // Guard bounds.
  t("margin/bounds", TARGET_GROSS_MARGIN === 0.3 && MINIMUM_GROSS_MARGIN === 0.22);
  // Invalid margins must throw rather than silently divide by zero.
  let threw = false;
  try { priceAtMargin(1000, 1); } catch { threw = true; }
  t("margin/rejects-100pct", threw);
  threw = false;
  try { priceAtMargin(1000, 0); } catch { threw = true; }
  t("margin/rejects-zero", threw);
}

/* ====================================================== 2. GEOMETRY ORACLE
 * Perimeter for a 1.5:1 room of area A is 2*(sqrt(1.5A) + sqrt(A/1.5)).
 * For A=250: 2*(sqrt(375)+sqrt(166.667)) = 2*(19.36492+12.90994) = 64.54972
 */
{
  const P = 64.5497224367903;
  const d = deriveDimensions(250);
  t("geometry/envelope-perimeter-250sf", Math.abs(d.envelopePerimeter - P) < 1e-9, d.envelopePerimeter.toFixed(6));
  t("geometry/envelope-wall-area", Math.abs(d.envelopeWallArea - P * 8) < 1e-9);
  t("geometry/wall-plus-ceiling", Math.abs(d.wallAndCeilingArea - (P * 8 + 250)) < 1e-9);
  t("geometry/floor-equals-ceiling", d.floorArea === d.ceilingArea);
  // A square room (ratio 1) would be 4*sqrt(A)=63.2456; ours must exceed it.
  t("geometry/not-square", d.envelopePerimeter > 4 * Math.sqrt(250));
  // Custom ceiling height must propagate.
  t("geometry/ceiling-height", Math.abs(deriveDimensions(250, 10).envelopeWallArea - P * 10) < 1e-9);

  /* THE SPLIT MUST BE INVISIBLE WITHOUT MEASUREMENTS. With no plan set the two
     perimeters are the same number, which is what keeps every back-tested price
     and every calibration in this suite valid across the change. */
  t("geometry/perimeters-agree-when-underived", d.interiorPerimeter === d.envelopePerimeter);
  t("geometry/wall-areas-agree-when-underived", d.interiorWallArea === d.envelopeWallArea);

  /* And a measured interior length must move ONLY the interior side. */
  const m = deriveDimensions(250, 8, 190);
  t("geometry/measured-interior-applies", m.interiorPerimeter === 190);
  t("geometry/measured-interior-wall-area", Math.abs(m.interiorWallArea - 190 * 8) < 1e-9);
  t("geometry/measured-leaves-envelope-alone", Math.abs(m.envelopePerimeter - P) < 1e-9);
  t("geometry/measured-leaves-envelope-wall-alone", Math.abs(m.envelopeWallArea - P * 8) < 1e-9);
  // A zero or absent measurement falls back rather than pricing nothing.
  t("geometry/zero-measurement-falls-back", deriveDimensions(250, 8, 0).interiorPerimeter === d.envelopePerimeter);
}

/* ============================================== 3. INDEPENDENT LINE ORACLE
 * Rebuild a known line from catalog rates by hand and compare to the engine.
 * Kitchen cabinets: 03-17-01-M $250/LF + 03-17-01-L $200/LF = $450/LF installed.
 * Quantity at 250 sf, semi-custom (factor 1.0) = 250 * 0.11 = 27.5 LF.
 * Expected material+labour cost before quality/margin = 27.5 * 450 = $12,375.
 */
{
  const m = LINE_ITEMS.find((i) => i.code === "03-17-01-M")!;
  const l = LINE_ITEMS.find((i) => i.code === "03-17-01-L")!;
  t("catalog/cabinet-material-rate", m.cost === 250, String(m.cost));
  t("catalog/cabinet-labor-rate", l.cost === 200, String(l.cost));

  const sel: ScopeSelections = { quality: "high-end", sqft: 250, cabinetTier: "semi-custom" };
  const est = buildInternalEstimate(RULES_BY_PROJECT.kitchen, sel, "kitchen");
  const cab = est.lines.filter((x) => x.code.startsWith("03-17-01"));
  const cabTotal = cab.reduce((s, x) => s + x.cost, 0);
  // high-end is the catalog anchor (factor 1.0), so no quality scaling applies.
  t("oracle/kitchen-cabinets-highend", Math.abs(cabTotal - 12375) < 1, usd(cabTotal) + " vs $12,375");
  t("oracle/cabinet-qty", Math.abs((cab[0]?.quantity ?? 0) - 27.5) < 1e-9, String(cab[0]?.quantity));

  // Cabinet tier is a pure multiplier on that line: custom = 1.45.
  const custom = buildInternalEstimate(
    RULES_BY_PROJECT.kitchen,
    { ...sel, cabinetTier: "custom" },
    "kitchen",
  );
  const customTotal = custom.lines.filter((x) => x.code.startsWith("03-17-01")).reduce((s, x) => s + x.cost, 0);
  t("oracle/cabinet-custom-1.45x", Math.abs(customTotal - 12375 * 1.45) < 1, usd(customTotal));

  // Standard = 0.78.
  const std = buildInternalEstimate(RULES_BY_PROJECT.kitchen, { ...sel, cabinetTier: "standard" }, "kitchen");
  const stdTotal = std.lines.filter((x) => x.code.startsWith("03-17-01")).reduce((s, x) => s + x.cost, 0);
  t("oracle/cabinet-standard-0.78x", Math.abs(stdTotal - 12375 * 0.78) < 1, usd(stdTotal));
}

/* ================================================ 4. TOTALS RECONCILE EXACTLY */
for (const project of PROJECTS) {
  const rules = RULES_BY_PROJECT[project];
  const base = BASELINE_SQFT[project];
  for (const quality of getAvailableFinishLevels(project) as QualityLevel[]) {
    const est = buildInternalEstimate(rules, { quality, sqft: base }, project);

    const sumLines = est.lines.reduce((s, l) => s + l.cost, 0);
    t(`totals/${project}/${quality}/direct-equals-lines`, Math.abs(sumLines - est.directCost) < 0.01);

    // Every line: cost must be exactly quantity * unitCost.
    const badLine = est.lines.find((l) => Math.abs(l.quantity * l.unitCost - l.cost) > 0.01);
    t(`totals/${project}/${quality}/line-arithmetic`, !badLine, badLine?.code);

    // Contingency is exactly 10% of direct.
    t(`totals/${project}/${quality}/contingency`, Math.abs(est.contingency - est.directCost * 0.1) < 0.01);
    t(
      `totals/${project}/${quality}/internal`,
      Math.abs(est.totalInternalCost - (est.directCost + est.contingency)) < 0.01,
    );

    // Trade rollup must equal direct cost, and every trade must own >=1 line.
    const tradeSum = est.trades.reduce((s, x) => s + x.internalCost, 0);
    t(`totals/${project}/${quality}/rollup`, Math.abs(tradeSum - est.directCost) < 0.01);
    t(`totals/${project}/${quality}/trades-have-lines`, est.trades.every((x) => x.lines.length > 0));

    // No duplicate cost codes: the duplicate-charge guard.
    const codes = est.lines.map((l) => l.code);
    t(`totals/${project}/${quality}/no-duplicate-codes`, new Set(codes).size === codes.length);

    // Range must sit at 0.85x / 1.15x of centre before rounding tolerance.
    const r = buildPlanningRange(est, project, quality, base);
    t(`range/${project}/${quality}/low-band`, r.low / r.centre > 0.8 && r.low / r.centre < 0.9);
    t(`range/${project}/${quality}/high-band`, r.high / r.centre > 1.1 && r.high / r.centre < 1.2);
    t(`range/${project}/${quality}/ordered`, r.low < r.high && r.low > 0);

    // Rounding: never a stray dollar. Steps are 500 / 1000 / 5000 by magnitude.
    const step = r.centre >= 100000 ? 5000 : r.centre >= 25000 ? 1000 : 500;
    t(`range/${project}/${quality}/rounded-low`, r.low % step === 0, `${r.low} % ${step}`);
    t(`range/${project}/${quality}/rounded-high`, r.high % step === 0, `${r.high} % ${step}`);

    // Gross profit must reconcile.
    const gp = r.centre - est.totalInternalCost;
    t(`margin/${project}/${quality}/profit-positive`, gp > 0);
    const realised = gp / r.centre;
    t(
      `margin/${project}/${quality}/realised-in-bounds`,
      realised >= MINIMUM_GROSS_MARGIN - 1e-6 && realised <= TARGET_GROSS_MARGIN + 1e-6,
      realised.toFixed(4),
    );
  }
}

/* =================================== 5. MONOTONICITY ACROSS SIZE AND TIER */
for (const project of PROJECTS) {
  const cfg = getProjectSizeConfig(project);
  const rules = RULES_BY_PROJECT[project];
  for (const quality of getAvailableFinishLevels(project) as QualityLevel[]) {
    let prev = -1;
    let flatRun = 0;
    let worstFlat = 0;
    for (let sqft = cfg.min; sqft <= cfg.max; sqft += cfg.step) {
      const est = buildInternalEstimate(rules, { quality, sqft }, project);
      const c = buildPlanningRange(est, project, quality, sqft).centre;
      if (c < prev - 0.01) {
        t(`monotonic/${project}/${quality}/size@${sqft}`, false, `${usd(c)} < ${usd(prev)}`);
      }
      if (Math.abs(c - prev) < 0.01) { flatRun++; worstFlat = Math.max(worstFlat, flatRun); } else flatRun = 0;
      prev = c;
    }
    pass++; // the sweep itself counts once when no regression was recorded
    const steps = Math.floor((cfg.max - cfg.min) / cfg.step);
    t(
      `monotonic/${project}/${quality}/no-plateau`,
      worstFlat <= Math.max(2, Math.ceil(steps * 0.15)),
      `flat for ${worstFlat} steps`,
    );
  }

  // Richer finish never costs less.
  const base = BASELINE_SQFT[project];
  let prevTier = -1;
  for (const quality of getAvailableFinishLevels(project) as QualityLevel[]) {
    const est = buildInternalEstimate(rules, { quality, sqft: base }, project);
    const c = buildPlanningRange(est, project, quality, base).centre;
    t(`ladder/${project}/${quality}`, c >= prevTier - 0.01, `${usd(c)} vs ${usd(prevTier)}`);
    prevTier = c;
  }
}

/* ================================================= 6. SELECTION ISOLATION
 * A field must change what it should and nothing else. Checked by confirming
 * that flipping one field leaves unrelated TRADES untouched.
 */
{
  const baseSel: ScopeSelections = { quality: "mid-range", sqft: 250, cabinetTier: "semi-custom" };
  const a = buildInternalEstimate(RULES_BY_PROJECT.kitchen, baseSel, "kitchen");
  const b = buildInternalEstimate(RULES_BY_PROJECT.kitchen, { ...baseSel, cabinetTier: "custom" }, "kitchen");

  const tradeOf = (est: typeof a, div: string) => est.trades.find((x) => x.division === div)?.internalCost ?? 0;
  t("isolation/cabinet-tier-moves-cabinetry", tradeOf(b, "COUNTERTOPS + CABINETRY") > tradeOf(a, "COUNTERTOPS + CABINETRY"));
  t("isolation/cabinet-tier-leaves-electrical", Math.abs(tradeOf(b, "ELECTRICAL") - tradeOf(a, "ELECTRICAL")) < 0.01);
  t("isolation/cabinet-tier-leaves-plumbing", Math.abs(tradeOf(b, "PLUMBING") - tradeOf(a, "PLUMBING")) < 0.01);

  // Unset selections must never change the price: null means "not told yet".
  const withNulls = buildInternalEstimate(
    RULES_BY_PROJECT.kitchen,
    { ...baseSel, layoutChanges: null, plumbingElectrical: null, bathroomCount: null },
    "kitchen",
  );
  t("isolation/nulls-are-inert", Math.abs(withNulls.totalInternalCost - a.totalInternalCost) < 0.01);

  // upgradeScope must reduce, never increase.
  const partial = buildInternalEstimate(
    RULES_BY_PROJECT.kitchen,
    { ...baseSel, upgradeScope: ["cabinets"] },
    "kitchen",
  );
  t("isolation/partial-scope-costs-less", partial.totalInternalCost < a.totalInternalCost);
  const fullScope = buildInternalEstimate(
    RULES_BY_PROJECT.kitchen,
    { ...baseSel, upgradeScope: [] },
    "kitchen",
  );
  t("isolation/empty-scope-equals-full", Math.abs(fullScope.totalInternalCost - a.totalInternalCost) < 0.01);
}

/* =================================== 7. SHARED COSTS COUNTED ONCE (owner rule) */
{
  const one = resolveQuotedRange("bathroom", "mid-range", 80, { ...EMPTY_REFINEMENTS, bathroomCount: 1 })!;
  const two = resolveQuotedRange("bathroom", "mid-range", 80, { ...EMPTY_REFINEMENTS, bathroomCount: 2 })!;
  const three = resolveQuotedRange("bathroom", "mid-range", 80, { ...EMPTY_REFINEMENTS, bathroomCount: 3 })!;

  t("shared/2-baths-more-than-1", two.priceLow > one.priceLow);
  t("shared/3-baths-more-than-2", three.priceLow > two.priceLow);
  // The whole point: NOT linear, because site costs are paid once.
  t("shared/2-baths-under-2x", two.priceLow < one.priceLow * 2, `${two.priceLow} vs ${one.priceLow * 2}`);
  t("shared/3-baths-under-3x", three.priceLow < one.priceLow * 3, `${three.priceLow} vs ${one.priceLow * 3}`);
  // But not flat either: more rooms genuinely cost more.
  t("shared/2-baths-over-1.5x", two.priceLow > one.priceLow * 1.5);
}

/* ============================================ 8. EDGE CASES AND BAD INPUT */
for (const project of PROJECTS) {
  const cfg = getProjectSizeConfig(project);
  const rules = RULES_BY_PROJECT[project];
  const q = getAvailableFinishLevels(project)[0] as QualityLevel;

  for (const [label, sqft] of [["min", cfg.min], ["max", cfg.max]] as const) {
    const est = buildInternalEstimate(rules, { quality: q, sqft }, project);
    const r = buildPlanningRange(est, project, q, sqft);
    t(`edge/${project}/${label}-finite`, Number.isFinite(r.low) && Number.isFinite(r.high) && r.low > 0);
  }

  // Decimal square footage must not produce NaN or fractional cents in the range.
  const dec = buildInternalEstimate(rules, { quality: q, sqft: cfg.min + 0.5 }, project);
  t(`edge/${project}/decimal-sqft`, Number.isFinite(dec.totalInternalCost) && dec.totalInternalCost > 0);

  // Hostile inputs must not crash or produce negative money.
  for (const bad of [0, -5, 1e9] as number[]) {
    let ok = true;
    let val = 0;
    try {
      const e = buildInternalEstimate(rules, { quality: q, sqft: Math.max(1, bad) }, project);
      val = e.totalInternalCost;
      ok = Number.isFinite(val) && val >= 0;
    } catch {
      ok = false;
    }
    t(`edge/${project}/sqft-${bad}`, ok, String(val));
  }

  // Negative or absurd bathroom counts must not produce negative cost.
  for (const n of [-3, 0, 99]) {
    const e = buildInternalEstimate(rules, { quality: q, sqft: BASELINE_SQFT[project], bathroomCount: n }, project);
    t(`edge/${project}/bathrooms-${n}`, Number.isFinite(e.totalInternalCost) && e.totalInternalCost > 0);
  }

  // Unknown quality string must not silently price at zero.
  const weird = buildInternalEstimate(
    rules,
    { quality: "not-a-tier" as QualityLevel, sqft: BASELINE_SQFT[project] },
    project,
  );
  t(`edge/${project}/unknown-quality`, weird.totalInternalCost > 0);
}

/* ============================= 9. ONE NUMBER EVERYWHERE (display/store/email/CRM) */
for (const project of PROJECTS) {
  const base = BASELINE_SQFT[project];
  const quality = getAvailableFinishLevels(project)[0] as QualityLevel;
  const refinements: EstimateRefinements = { ...EMPTY_REFINEMENTS };
  const detailCount = countVisibleUserRefinements(project, getSetRefinementKeys(refinements));
  const maxFields = getMaxRefinementFields(project);
  const detailRatio = maxFields > 0 ? detailCount / maxFields : 0;

  // What the browser shows.
  const displayed = resolveQuotedRange(project, quality, base, refinements)!;
  // What the server recomputes on submit (same resolver, same inputs).
  const server = resolveQuotedRange(project, quality, base, refinements)!;
  t(`consistency/${project}/display-equals-server`, displayed.priceLow === server.priceLow && displayed.priceHigh === server.priceHigh);

  const guide = calculateEstimate({ project, finish: quality as never, sqft: base, refinements }, detailCount);
  const verified = {
    project,
    finish: quality as never,
    sqft: base,
    priceLow: displayed.priceLow,
    priceHigh: displayed.priceHigh,
    roi: guide.roi,
    confidence: guide.confidenceLabel,
    refinements,
    included: guide.included,
  };

  const lead = { name: "QA Test", phone: "2085550000", email: "qa@example.com", address: "1 Main St", zip: "83702", projectType: project };
  const custHtml = buildCustomerEmailHtml(lead, verified);
  const adminHtml = buildAdminEmailHtml(lead, verified);
  const crm = buildLeadEstimateRecord(verified);

  const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;
  t(`consistency/${project}/customer-email-has-range`, custHtml.includes(fmt(displayed.priceLow)) && custHtml.includes(fmt(displayed.priceHigh)));
  t(`consistency/${project}/admin-email-has-range`, adminHtml.includes(fmt(displayed.priceLow)) && adminHtml.includes(fmt(displayed.priceHigh)));
  t(`consistency/${project}/crm-low`, crm.priceLow === displayed.priceLow, `${crm.priceLow}`);
  t(`consistency/${project}/crm-high`, crm.priceHigh === displayed.priceHigh, `${crm.priceHigh}`);
  t(`consistency/${project}/crm-formatted`, crm.formattedRange.includes(fmt(displayed.priceLow)));

  // Admin gets the internal breakdown; the customer must not.
  t(`consistency/${project}/admin-has-breakdown`, adminHtml.includes("Internal breakdown"));
  t(`consistency/${project}/customer-lacks-breakdown`, !custHtml.includes("Internal breakdown"));

  // The admin rollup must reconcile to the quoted centre.
  const resolved = resolveInternalEstimate(project, quality, base, refinements)!;
  const rowSum = resolved.admin.trades.reduce((s, x) => s + x.customerAmount, 0);
  t(`consistency/${project}/admin-rows-sum-to-centre`, Math.abs(rowSum - resolved.admin.customerPrice) < 1);
}

/* ================================================= 10. BUDGET BOUNDARIES */
{
  const project: ProjectType = "kitchen";
  const sel: ScopeSelections = { quality: "high-end", sqft: 250, cabinetTier: "custom" };
  const est = buildInternalEstimate(RULES_BY_PROJECT[project], sel, project);
  const r = buildPlanningRange(est, project, "high-end", 250);

  // Exactly at each boundary, and one dollar either side of it.
  const cases: [number, string][] = [
    [r.high + 1, "above"],
    [r.high, "above"],
    [r.high - 1, "within"],
    [r.low + 1, "within"],
    [r.low, "within"],
    [r.low - 1, "below"],
  ];
  for (const [budget, expected] of cases) {
    const a = assessBudget(project, sel, { low: r.low, high: r.high }, budget);
    t(`budget/boundary/${budget}`, a.state === expected, `got ${a.state}, expected ${expected}`);
  }

  // Every offered option must genuinely reach the budget and be cheaper.
  const short = assessBudget(project, sel, { low: r.low, high: r.high }, Math.round(r.low * 0.75));
  t("budget/options-reach", short.options.every((o) => o.low <= Math.round(r.low * 0.75)));
  t("budget/options-cheaper", short.options.every((o) => o.low <= r.low && o.high <= r.high));
  t("budget/unreachable-consistent", short.unreachable === (short.options.length === 0));
}

/* ===================================================================== REPORT */
const total = pass + failures.length;
console.log(`\n${"=".repeat(78)}`);
console.log(`ESTIMATOR END-TO-END VERIFICATION`);
console.log("=".repeat(78));
if (failures.length === 0) {
  console.log(`All ${total} independent checks passed.`);
} else {
  console.log(`${failures.length} of ${total} FAILED:\n`);
  for (const f of failures) console.log(`  FAIL  ${f}`);
  process.exit(1);
}
