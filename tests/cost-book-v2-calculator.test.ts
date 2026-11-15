/**
 * The homepage calculator shows the shared engine's customer range, not the
 * book's direct cost. Totals are Signature at each baseline size.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { calculateEstimate, EMPTY_REFINEMENTS } from "../shared/estimateEngine";
import { customerRangeForLines, lineAmount, planningLines, planningTotal } from "../shared/planningBookPrice";
import { sharedBookRate } from "../lib/p5/priceBook";

const SCENARIOS = [
  { project: "kitchen" as const, sqft: 250, low: 57900, high: 64100 },
  { project: "bathroom" as const, sqft: 80, low: 24900, high: 27600 },
  { project: "whole-home" as const, sqft: 1800, low: 313000, high: 346000 },
  { project: "addition" as const, sqft: 400, low: 86900, high: 96200 },
  { project: "basement" as const, sqft: 900, low: 64600, high: 71500 },
];

test("the homepage calculator shows the shared engine customer range", () => {
  for (const scenario of SCENARIOS) {
    const lines = planningLines(scenario.project, "mid-range", scenario.sqft, EMPTY_REFINEMENTS);
    let direct = 0;
    for (const line of lines) {
      const rate = sharedBookRate(line.code, "mid", line.remodel);
      assert.ok(rate, line.code);
      assert.equal(lineAmount(line, "mid-range"), rate.amount * line.quantity, line.code);
      direct += rate.amount * line.quantity;
    }
    assert.equal(planningTotal(scenario.project, "mid-range", scenario.sqft), direct, scenario.project);
    const engine = customerRangeForLines(lines, scenario.project, "mid-range");
    assert.deepEqual(engine, { low: scenario.low, high: scenario.high }, scenario.project);
    const shown = calculateEstimate({
      project: scenario.project,
      finish: "mid-range",
      sqft: scenario.sqft,
      refinements: EMPTY_REFINEMENTS,
    });
    assert.equal(shown.priceLow, scenario.low, scenario.project);
    assert.equal(shown.priceHigh, scenario.high, scenario.project);
    assert.ok(shown.priceLow > direct, `${scenario.project} customer price is above the direct book cost`);
  }
});

test("Signature direct unit prices match the book and are not the shown range", () => {
  const expected: [string, boolean, number][] = [
    ["90-20-02", true, 145],
    ["90-30-02", true, 15240],
    ["90-40-01", true, 110],
    ["90-50-01", false, 135],
    ["90-40-02", true, 45],
    ["00-20-02", false, 575],
    ["00-20-03", false, 1250],
  ];
  for (const [code, remodel, amount] of expected) {
    assert.equal(sharedBookRate(code, "mid", remodel)?.amount, amount, code);
  }
});
