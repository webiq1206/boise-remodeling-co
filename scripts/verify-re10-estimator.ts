/**
 * Invariants for the RE-10 repair estimator.
 *
 * The point of this file is that the RE-10 engine is exposed to input nobody
 * controls: a document extractor decides what the repair list contains, and the
 * price goes to a real estate agent under a contractual deadline. Every property
 * this asserts is one that, if it broke silently, would either lose money on
 * every job or put a misleading number in front of a client.
 *
 * The margin checks are the sharp end. A 50% gross margin floor is worthless if
 * the arithmetic drifts, so these recompute profit over price from the returned
 * figures rather than trusting the engine's own `appliedMargin`.
 */
import {
  estimateRe10,
  priceRepair,
  RECIPES,
  CREW_FOR_TRADE,
  CREW_MINIMUM_PRICE,
  WORTHWHILE_JOB_PRICE,
  MARKET_PRICE_BAND,
  TRADE_LABELS,
  REVIEW_REASON_TEXT,
  PRICED_WITH_CAVEAT,
  REPAIR_GRADE_BY_DIVISION,
  RE10_MARGIN_FLOOR,
  RE10_MARGIN_CEILING,
  RE10_CONTINGENCY_RATE,
  COORDINATION_COST_PER_ITEM,
  MOBILIZATION_COST,
  ADDITIONAL_TRADE_MOBILIZATION_FACTOR,
  type RepairKind,
  type RepairItemInput,
  type Re10Context,
  type ReviewReason,
} from "../shared/costs/re10Repairs";
import { LINE_ITEMS } from "../shared/costs/lineItemCatalog";

let checks = 0;
let failures = 0;
const fail = (msg: string) => {
  failures++;
  if (failures <= 30) console.log(`  FAIL: ${msg}`);
};
const check = (cond: boolean, msg: string) => {
  checks++;
  if (!cond) fail(msg);
};
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;

const ALL_KINDS = Object.keys(RECIPES) as RepairKind[];

/**
 * Kinds the commercial guards must cover: everything that can appear in a
 * priced quote. `alwaysReview` used to exclude five kinds wholesale, but four
 * of them (the PRICED_WITH_CAVEAT reasons) ARE priced into real quotes at an
 * allowance - they were the only priced kinds with no band, no minimum test
 * and no margin sweep.
 */
function isCommerciallyPriced(kind: RepairKind): boolean {
  const r = RECIPES[kind].alwaysReview;
  return !r || (PRICED_WITH_CAVEAT as readonly string[]).includes(r);
}

/* ------------------------------------------------- 1. catalog integrity */

for (const kind of ALL_KINDS) {
  const recipe = RECIPES[kind];
  check(recipe.components.length > 0, `${kind}: recipe has no components`);
  check(recipe.defaultQty > 0, `${kind}: defaultQty must be positive`);
  check(!!TRADE_LABELS[recipe.trade], `${kind}: unknown trade ${recipe.trade}`);
  check(!!CREW_FOR_TRADE[recipe.trade], `${kind}: trade ${recipe.trade} has no crew`);

  // Every code must resolve. priceRepair throws on an unknown code, which is the
  // behavior we want; this turns that into a named failure instead of a stack.
  try {
    const p = priceRepair({ id: kind, kind, description: kind });
    check(p.lines.length > 0, `${kind}: priced to zero lines`);
    check(p.directCost > 0, `${kind}: priced to a zero cost`);
    for (const l of p.lines) {
      check(l.quantity > 0, `${kind}: line ${l.code} has non-positive quantity`);
      check(near(l.cost, l.unitCost * l.quantity, 0.001), `${kind}: line ${l.code} cost does not equal unit x qty`);
    }
  } catch (err) {
    fail(`${kind}: threw while pricing - ${(err as Error).message}`);
  }
}

/* ------------------------------------- 2. quantity drives cost, monotonically */

for (const kind of ALL_KINDS) {
  const small = priceRepair({ id: "s", kind, description: "", quantity: 1 });
  const large = priceRepair({ id: "l", kind, description: "", quantity: 40 });
  check(large.directCost >= small.directCost, `${kind}: 40 units cost less than 1 unit`);
  // Flat components mean it is not strictly proportional, but a 40x quantity
  // must move the number, or the quantity is being ignored.
  check(large.directCost > small.directCost, `${kind}: quantity has no effect on cost`);
}

/* ------------------------------------------ 3. assumed quantities are flagged */

for (const kind of ALL_KINDS) {
  const noQty = priceRepair({ id: "n", kind, description: "" });
  check(noQty.quantityAssumed, `${kind}: missing quantity was not flagged as assumed`);
  check(noQty.quantity === RECIPES[kind].defaultQty, `${kind}: did not fall back to defaultQty`);

  const withQty = priceRepair({ id: "w", kind, description: "", quantity: 7 });
  check(!withQty.quantityAssumed, `${kind}: supplied quantity wrongly flagged as assumed`);

  // A zero or negative quantity is bad data, not a free repair.
  for (const bad of [0, -5, Number.NaN]) {
    const p = priceRepair({ id: "b", kind, description: "", quantity: bad });
    check(p.quantityAssumed, `${kind}: quantity ${bad} was not treated as missing`);
    check(p.directCost > 0, `${kind}: quantity ${bad} produced a free repair`);
  }
}

/* --------------------------------------------------- 4. review items are safe */

const REVIEW_ONLY: ReviewReason[] = [
  "structural", "foundation", "mold-hazmat", "asbestos-lead", "electrical-service",
  "sewer-septic", "hvac-replacement", "gas", "fire-damage", "engineering", "out-of-scope",
];

for (const reason of REVIEW_ONLY) {
  const est = estimateRe10([
    { id: "1", kind: "drywall-patch", description: "patch", quantity: 10 },
    { id: "2", kind: "drywall-patch", description: "flagged", quantity: 10, needsReview: reason },
  ]);
  check(est.review.length === 1, `${reason}: flagged item was not routed to review`);
  check(est.priced.length === 1, `${reason}: flagged item leaked into the priced list`);
  check(est.review[0].text === REVIEW_REASON_TEXT[reason], `${reason}: review text missing`);
  check(
    est.priced.every((p) => p.input.id !== "2"),
    `${reason}: flagged item appears in priced output`,
  );
}

// A list that is entirely review items must produce no price at all, not a zero
// that reads as "free".
const allReview = estimateRe10([
  { id: "1", kind: "drywall-patch", description: "x", needsReview: "structural" },
  { id: "2", kind: "flooring-patch", description: "y", needsReview: "foundation" },
]);
check(allReview.sellingPrice === 0, "all-review list still produced a selling price");
check(allReview.low === 0 && allReview.high === 0, "all-review list produced a non-zero range");
check(allReview.trades.length === 0, "all-review list produced trade groups");
check(
  allReview.warnings.some((w) => /could not be priced|onsite/i.test(w.message)),
  "all-review list did not warn that nothing could be priced",
);

/* ------------------------------------------------- 5. THE MARGIN INVARIANTS */

const CONTEXTS: Re10Context[] = [
  {},
  { occupancy: "vacant", access: "standard", daysToDeadline: 45, hasInspectionReport: true },
  { occupancy: "occupied", access: "limited", daysToDeadline: 5, hasInspectionReport: true },
  { occupancy: "occupied", access: "difficult", daysToDeadline: 3, hasInspectionReport: false },
  { occupancy: "unknown", access: "difficult", daysToDeadline: 10 },
  { occupancy: "vacant", access: "standard", daysToDeadline: 0 },
];

function sampleList(n: number, seedKinds: RepairKind[]): RepairItemInput[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    kind: seedKinds[i % seedKinds.length],
    description: `item ${i}`,
    quantity: i % 3 === 0 ? undefined : (i % 17) + 1,
  }));
}

const KIND_POOLS: RepairKind[][] = [
  ["drywall-patch"],
  ["drywall-patch", "outlet-switch-replace"],
  ["drywall-repaint-wall", "toilet-repair", "gfci-install", "caulking-weatherproofing"],
  ["trim-repair", "interior-door-adjust", "flooring-patch", "faucet-replace", "light-fixture-replace", "siding-repair"],
  ALL_KINDS.filter((k) => !RECIPES[k].alwaysReview),
];

for (const ctx of CONTEXTS) {
  for (const pool of KIND_POOLS) {
    for (const n of [1, 2, 5, 12, 25]) {
      const est = estimateRe10(sampleList(n, pool), ctx);
      if (est.priced.length === 0) continue;

      const label = `n=${n} pool=${pool.length} ctx=${JSON.stringify(ctx)}`;

      // (a0) The minimum visit price may only ever RAISE the price. Rounding
      //      to a quoting step can shave the realised margin slightly below
      //      the APPLIED (uplifted) margin - that is fine; what it may never
      //      do is take it below the FLOOR, which (b) asserts on the quote.
      check(est.minimumPriceApplied >= -0.01, `${label}: minimum price reduced the price`);

      // (a) The floor is absolute.
      check(est.appliedMargin >= RE10_MARGIN_FLOOR - 1e-9, `${label}: margin ${est.appliedMargin} below the 50% floor`);
      check(est.appliedMargin <= RE10_MARGIN_CEILING + 1e-9, `${label}: margin ${est.appliedMargin} above the ceiling`);

      // (b) TRUE GROSS MARGIN, recomputed - ON THE QUOTED PRICE. Every guard
      //     used to be asserted on sellingPrice while the customer, the email
      //     and the CRM carried quotedPrice, and nearest-step rounding was
      //     quietly taking a quarter of small lists below the floor. The
      //     number the business runs on is the number the checks run on.
      const realised = est.grossProfit / est.quotedPrice;
      check(near(realised, est.realisedMargin, 1e-6), `${label}: reported realised margin does not match profit/price`);
      check(realised >= RE10_MARGIN_FLOOR - 1e-9, `${label}: realised margin ${realised} below the 50% floor`);
      check(near(est.quotedPrice - est.totalInternalCost, est.grossProfit, 0.01), `${label}: gross profit does not reconcile`);
      // Derived from the floor, not hardcoded: a 50% floor doubles cost, a 30%
      // floor multiplies it by 1/0.7. Hardcoding the multiple meant this check
      // asserted a policy that had already changed.
      check(
        est.quotedPrice >= est.totalInternalCost / (1 - RE10_MARGIN_FLOOR) - 0.01,
        `${label}: quoted price does not clear the ${(RE10_MARGIN_FLOOR * 100).toFixed(0)}% margin floor over cost`,
      );
      // The quote never drifts more than one rounding step from the priced
      // figure, and only ever upward past it (the floor guard rounds up).
      check(
        est.quotedPrice >= est.sellingPrice - 250 && est.quotedPrice <= est.sellingPrice + 500,
        `${label}: quoted ${est.quotedPrice} strayed from selling ${est.sellingPrice}`,
      );

      // (c) NO DOUBLE COUNTING. The total must be exactly the sum of its parts.
      const parts = est.directCost + est.mobilization + est.coordination + est.contingency;
      check(near(parts, est.totalInternalCost, 0.01), `${label}: cost parts ${parts} != total ${est.totalInternalCost}`);
      check(
        near(est.contingency, (est.directCost + est.mobilization + est.coordination) * RE10_CONTINGENCY_RATE, 0.01),
        `${label}: contingency is not the stated rate on the pre-contingency cost`,
      );

      // (d) Trade rollup must reconcile to the whole, so parent and child cannot
      //     drift apart and no trade is priced independently.
      const tradeSum = est.trades.reduce((s, t) => s + t.customerAmount, 0);
      check(near(tradeSum, est.sellingPrice, 0.5), `${label}: trade amounts ${tradeSum} != selling price ${est.sellingPrice}`);
      const adjustedSum = est.trades.reduce((s, t) => s + t.adjustedCost, 0);
      check(near(adjustedSum, est.directCost, 0.01), `${label}: trade adjusted costs != direct cost`);

      // (e) Coordination is per priced item, never per review item.
      check(
        near(est.coordination, est.priced.length * COORDINATION_COST_PER_ITEM, 0.01),
        `${label}: coordination not charged per priced item`,
      );

      // (f) Mobilization: one full, the rest reduced. Never one per repair.
      const crews = new Set(est.trades.map((t) => t.crew));
      const expectedMob =
        crews.size === 0 ? 0 : MOBILIZATION_COST * (1 + (crews.size - 1) * ADDITIONAL_TRADE_MOBILIZATION_FACTOR);
      check(near(est.mobilization, expectedMob, 0.01), `${label}: mobilization ${est.mobilization} != expected ${expectedMob}`);
      check(est.mobilization <= MOBILIZATION_COST * crews.size + 0.01, `${label}: mobilization exceeds one per crew`);
      if (est.priced.length > crews.size) {
        check(
          est.mobilization < MOBILIZATION_COST * est.priced.length,
          `${label}: mobilization charged per repair rather than per crew`,
        );
      }

      // (g) The range must bracket the price and never invert.
      check(est.low <= est.sellingPrice && est.sellingPrice <= est.high, `${label}: price outside its own range`);
      check(est.low < est.high, `${label}: range did not widen`);
      check(est.low > 0, `${label}: range low fell to zero on a priced list`);

      // (h) Every priced repair belongs to exactly one trade group.
      const grouped = est.trades.reduce((s, t) => s + t.repairs.length, 0);
      check(grouped === est.priced.length, `${label}: ${grouped} grouped vs ${est.priced.length} priced`);
    }
  }
}

/* ------------------------------------- 6. crew minimums, and their absence */

for (const kind of ALL_KINDS) {
  if (!isCommerciallyPriced(kind)) continue;
  const crew = CREW_FOR_TRADE[RECIPES[kind].trade];
  const est = estimateRe10([{ id: "1", kind, description: "single tiny item", quantity: 1 }]);
  if (est.priced.length === 0) continue;

  // One small repair must never bill under what it costs to send that crew out.
  // The minimum is a PRICE, so it is checked against the QUOTED price - the
  // selling price cleared it while nearest-step rounding took the quote under.
  check(
    est.quotedPrice >= CREW_MINIMUM_PRICE[crew] - 0.01,
    `${kind}: single-item job quoted at ${est.quotedPrice}, under the ${crew} minimum ${CREW_MINIMUM_PRICE[crew]}`,
  );
}

/* Multi-crew lists carry the SUM of the crew minimums, and the quote must
   clear that sum after rounding - the exact shape the audit caught quoting
   $500 against a $530 two-crew floor. */
for (const pair of [
  ["supply-valve-replace", "outlet-switch-replace"],
  ["safety-correction", "supply-valve-replace"],
  ["toilet-repair", "gfci-install"],
] as const) {
  const est = estimateRe10(pair.map((kind, i) => ({ id: String(i), kind: kind as RepairKind, description: "" })));
  if (est.priced.length < 2) continue;
  const crews = new Set(est.trades.map((t) => t.crew));
  const minSum = [...crews].reduce((s2, c) => s2 + CREW_MINIMUM_PRICE[c], 0);
  check(
    est.quotedPrice >= minSum - 0.01,
    `${pair.join("+")}: quoted ${est.quotedPrice} under the ${[...crews].join("+")} minimum sum ${minSum}`,
  );
}

/* ------------------------------- 6b. THE MARKET BAND. The competitiveness guard.

   Every priceable repair kind is quoted standalone and must land inside its
   researched market band. This is the check that matters commercially: the
   engine shipped its first version with all 32 kinds between 114% and 535% over
   band, which is the difference between winning RE-10 work and never hearing
   back. A margin floor protects profit; only this protects the revenue.        */

const bandCtx: Re10Context = {
  occupancy: "vacant",
  access: "standard",
  daysToDeadline: 45,
  hasInspectionReport: true,
};

let inBand = 0;
for (const [kind, band] of Object.entries(MARKET_PRICE_BAND)) {
  const [lo, hi] = band as [number, number];
  const est = estimateRe10([{ id: "1", kind: kind as RepairKind, description: "" }], bandCtx);
  if (est.priced.length === 0) continue;
  /* The QUOTED price is the market-facing number. The band constrains the
     price before quantization; rounding to the $100 quoting step (or up past
     a floor) may carry it at most one step beyond the researched edge. */
  const price = est.quotedPrice;
  const BAND_STEP_ALLOWANCE = 100;

  /* These four kinds ALWAYS sat past their researched ceilings once the real
     quoted number was checked - the selling price passed while the $100 step
     (or the margin-floor round-up) carried the quote over. The one-step
     allowance is quantization, not policy: anything further out fails. */
  check(
    price <= hi + BAND_STEP_ALLOWANCE,
    `${kind}: quoted ${Math.round(price)} against a market ceiling of ${hi} - priced out of the job`,
  );
  check(
    price >= lo - BAND_STEP_ALLOWANCE,
    `${kind}: quoted ${Math.round(price)} against a market floor of ${lo} - leaving money on the table`,
  );
  if (price >= lo - BAND_STEP_ALLOWANCE && price <= hi + BAND_STEP_ALLOWANCE) inBand++;

  // Margin must survive the whole recalibration. Competitiveness that costs the
  // margin floor is not competitiveness, it is a discount.
  check(
    est.realisedMargin >= RE10_MARGIN_FLOOR - 1e-9,
    `${kind}: landed in band but at ${(est.realisedMargin * 100).toFixed(1)}% margin, under the floor`,
  );
}
check(inBand === Object.keys(MARKET_PRICE_BAND).length, `only ${inBand}/${Object.keys(MARKET_PRICE_BAND).length} kinds are inside their market band`);

/* ------------- 6b-ii. urgency may cost more, but it may not run away.

   The bands above are for STANDARD conditions, so holding a rush job to them
   would not be like for like: an occupied house on a two-day deadline with
   difficult access legitimately costs more, and every trade charges for it.
   What must not happen is the uplifts compounding into a number that reads as
   opportunism to an agent who is already under pressure. This caps the premium
   the worst realistic case may carry over the market ceiling.                 */

const MAX_URGENCY_PREMIUM = 0.3;
const worstCtx: Re10Context = {
  occupancy: "occupied",
  access: "difficult",
  daysToDeadline: 1,
  hasInspectionReport: false,
};

for (const [kind, band] of Object.entries(MARKET_PRICE_BAND)) {
  const [, hi] = band as [number, number];
  const est = estimateRe10([{ id: "1", kind: kind as RepairKind, description: "" }], worstCtx);
  if (est.priced.length === 0) continue;
  check(
    est.quotedPrice <= hi * (1 + MAX_URGENCY_PREMIUM) + 100,
    `${kind}: worst-case rush quote ${est.quotedPrice} is more than ` +
      `${(MAX_URGENCY_PREMIUM * 100).toFixed(0)}% over the ${hi} market ceiling`,
  );
  // And urgency must actually cost more, or the uplifts are decorative.
  // Compared on the pre-quantization price: a $30 uplift can vanish into the
  // same $100 step without being decorative.
  const standard = estimateRe10([{ id: "1", kind: kind as RepairKind, description: "" }], bandCtx);
  check(est.sellingPrice >= standard.sellingPrice, `${kind}: a rush job priced at or below a relaxed one`);
}

/* --------------- 6c. bundled work must be cheaper per item than standalone */

// Bundling economics are asserted on the pre-quantization selling price:
// the marginal cost of one added item can legitimately round into the same
// $100 step, and that is quantization, not a bundling failure.
for (const kind of ALL_KINDS) {
  if (!isCommerciallyPriced(kind)) continue;
  const solo = estimateRe10([{ id: "1", kind, description: "" }], bandCtx).sellingPrice;
  const base = Array.from({ length: 6 }, (_, i) => ({
    id: "b" + i, kind: "drywall-patch" as RepairKind, description: "", quantity: 10,
  }));
  const basePrice = estimateRe10(base, bandCtx).sellingPrice;
  const marginal = estimateRe10([...base, { id: "x", kind, description: "" }], bandCtx).sellingPrice - basePrice;

  // Adding a repair to a visit already happening must cost less than sending
  // someone out for it alone. If it does not, bundling is not being rewarded and
  // the whole "one company for the whole list" pitch is hollow.
  check(marginal < solo, `${kind}: costs ${Math.round(marginal)} inside a bundle vs ${Math.round(solo)} standalone - bundling is not cheaper`);
  check(marginal > 0, `${kind}: adds nothing to the price when bundled`);
}

// A list whose own work exceeds every minimum must not receive a top-up, so the
// floors stop applying rather than stacking on top of genuine cost.
const bigDrywall = estimateRe10(
  Array.from({ length: 12 }, (_, i) => ({ id: String(i), kind: "drywall-repaint-wall" as const, description: "", quantity: 40 })),
);
check(bigDrywall.minimumsApplied === 0, `large single-crew list still applied a labor-floor top-up of ${bigDrywall.minimumsApplied}`);
check(bigDrywall.minimumPriceApplied === 0, `large single-crew list still applied a minimum visit price`);
check(bigDrywall.worthwhile, "a twelve-item drywall list should clear the worthwhile threshold");

// The worthwhile flag has to track the threshold exactly, because the team will
// act on it.
for (const kind of ALL_KINDS) {
  if (!isCommerciallyPriced(kind)) continue;
  const est = estimateRe10([{ id: "1", kind, description: "", quantity: 1 }]);
  if (est.priced.length === 0) continue;
  check(
    est.worthwhile === est.sellingPrice >= WORTHWHILE_JOB_PRICE,
    `${kind}: worthwhile flag disagrees with the ${WORTHWHILE_JOB_PRICE} threshold`,
  );
}

/* ------------- 6d. no internal vocabulary in customer-facing strings.

   Everything the estimator returns as prose - assumptions, uncertainty, review
   reasons, trade and recipe labels - can end up in front of a real estate agent
   via the wizard or the customer email. Cost structure, margin, and trade
   jargon do not belong there. This caught "Work is done in one mobilization per
   trade", which was neither a cost disclosure nor comprehensible to an agent.

   `warnings` is excluded on purpose: it is the internal channel, and its
   worthwhile-threshold and minimum-price notes are explicitly for the team.   */

const FORBIDDEN_CUSTOMER_WORDS = [
  "mobilization", "mobilisation", "margin", "markup", "gross profit",
  "internal cost", "direct cost", "unit cost", "our cost", "crew rate",
  "cost code", "overhead",
];

for (const ctx of CONTEXTS) {
  for (const pool of KIND_POOLS) {
    const est = estimateRe10(sampleList(8, pool), ctx);
    if (est.priced.length === 0) continue;
    const customerText = [
      ...est.assumptions,
      ...est.uncertainty,
      ...est.review.map((r) => r.text),
      ...est.trades.map((t) => t.label),
      ...est.priced.map((p) => p.recipe.label),
      ...est.priced.flatMap((p) => p.lines.map((l) => l.assumption ?? "")),
    ]
      .join(" ")
      .toLowerCase();

    for (const word of FORBIDDEN_CUSTOMER_WORDS) {
      check(
        !customerText.includes(word),
        `customer-facing text contains internal vocabulary "${word}"`,
      );
    }
  }
}

/* ------------------------- 7. more information must never widen the range */

const vague: RepairItemInput[] = [
  { id: "1", kind: "drywall-patch", description: "" },
  { id: "2", kind: "trim-repair", description: "" },
  { id: "3", kind: "flooring-patch", description: "" },
];
const precise: RepairItemInput[] = vague.map((v) => ({ ...v, quantity: 12 }));

const vagueEst = estimateRe10(vague, { hasInspectionReport: false });
const preciseEst = estimateRe10(precise, { hasInspectionReport: true });
check(preciseEst.bandWidth < vagueEst.bandWidth, "supplying measurements and photos did not narrow the range");
check(vagueEst.uncertainty.length > 0, "a list with no measurements reported no uncertainty");
check(preciseEst.confidence !== "low", "a fully documented list still reported low confidence");
check(
  vagueEst.assumptions.some((a) => /no measurement|assumed/i.test(a)),
  "assumed quantities were not disclosed in the assumptions",
);

/* ------------------------------- 8. context uplifts move in the right direction */

const baseList = sampleList(6, ["drywall-patch", "toilet-repair", "gfci-install"]);
const relaxed = estimateRe10(baseList, { occupancy: "vacant", access: "standard", daysToDeadline: 60 });
const urgent = estimateRe10(baseList, { occupancy: "occupied", access: "difficult", daysToDeadline: 2 });
check(urgent.appliedMargin > relaxed.appliedMargin, "an urgent occupied job did not price above a relaxed vacant one");
check(urgent.sellingPrice > relaxed.sellingPrice, "urgency did not raise the price");
check(urgent.marginUplifts.length > relaxed.marginUplifts.length, "urgency uplifts were not explained");
check(
  relaxed.appliedMargin >= RE10_MARGIN_FLOOR,
  "the most relaxed possible job still must not price below the 50% floor",
);

/* -------------------------------------------------------------------- done */


/* ------------------------------------------- 9. GOLDEN QUOTED SCENARIOS

   Exact-dollar regression traps on the number the customer, the email and
   the CRM carry. Every other check in this file is an invariant, and a
   uniform repricing sails through invariants. Snapshot 2026-08-07, after the
   quoted-price floor guard and quantity clamps. To intentionally reprice:
   verify the new numbers by hand, then update this table in the same commit. */
{
  const goldCtx: Re10Context = { occupancy: "vacant", access: "standard", daysToDeadline: 45, hasInspectionReport: true };
  const mk = (list: [RepairKind, number | null][]): RepairItemInput[] =>
    list.map(([kind, quantity], i) => ({ id: String(i), description: kind, kind, quantity }));

  const GOLDEN: { name: string; ctx: Re10Context; list: [RepairKind, number | null][]; quoted: number }[] = [
    { name: "single small repair", ctx: goldCtx, list: [["drywall-patch", null]], quoted: 400 },
    { name: "two-crew minimum-bound pair", ctx: goldCtx, list: [["supply-valve-replace", null], ["outlet-switch-replace", null]], quoted: 600 },
    { name: "medium mixed list", ctx: goldCtx, list: [["drywall-repaint-wall", 2], ["toilet-repair", 1], ["gfci-install", 3], ["caulking-weatherproofing", 40]], quoted: 1200 },
    { name: "large multi-trade list", ctx: goldCtx, list: [["trim-repair", 24], ["interior-door-replace", 2], ["flooring-patch", 30], ["faucet-replace", 2], ["light-fixture-replace", 3], ["siding-repair", 60]], quoted: 3700 },
    { name: "caveat kind in a real list", ctx: goldCtx, list: [["general-minor-repair", null], ["drywall-patch", 8]], quoted: 600 },
    { name: "occupied rush with uplifts", ctx: { occupancy: "occupied", access: "difficult", daysToDeadline: 3, hasInspectionReport: false }, list: [["drywall-patch", 12], ["interior-door-adjust", 2]], quoted: 800 },
  ];

  for (const g of GOLDEN) {
    const est = estimateRe10(mk(g.list), g.ctx);
    check(
      est.quotedPrice === g.quoted,
      `golden "${g.name}": quoted ${est.quotedPrice}, expected ${g.quoted}. If this repricing is intentional, update the golden in the same commit.`,
    );
  }
}

/* ------------------------- 10. GRADE FACTORS RESOLVE, EXPLICITLY, ALWAYS

   REPAIR_GRADE_BY_DIVISION is keyed on the catalog's division STRINGS with a
   silent 0.42 fallback. A catalog rename used to degrade a researched factor
   to the default with no failure anywhere. Every key must name a real
   division, and every division a recipe touches must carry an explicit entry. */
{
  const catalogDivisions = new Set(LINE_ITEMS.map((li) => li.division));
  for (const key of Object.keys(REPAIR_GRADE_BY_DIVISION)) {
    check(catalogDivisions.has(key), `grade factor key "${key}" matches no catalog division - a rename broke it`);
  }
  const usedDivisions = new Set<string>();
  for (const recipe of Object.values(RECIPES)) {
    for (const c of recipe.components) {
      for (const li of LINE_ITEMS) {
        if (li.code === c.code || li.code === `${c.code}-M` || li.code === `${c.code}-L`) usedDivisions.add(li.division);
      }
    }
  }
  for (const d of usedDivisions) {
    check(
      d in REPAIR_GRADE_BY_DIVISION,
      `division "${d}" is priced by a recipe but has no explicit grade factor - it is silently taking the 0.42 default`,
    );
  }
}

console.log(
  failures === 0
    ? `verify:re10: OK (${checks} invariant checks across ${ALL_KINDS.length} repair kinds)`
    : `verify:re10: FAILED with ${failures} problem(s) across ${checks} checks`,
);
process.exit(failures === 0 ? 0 : 1);
