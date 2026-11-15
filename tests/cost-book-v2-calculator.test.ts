/**
 * The homepage calculator and the shared estimator both price from the v2
 * cost book. Totals below are Signature (mid) at each project's baseline
 * size, with no extra rooms. They are the book's assembly plus the book's
 * permit, and the range the calculator shows around that total.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { calculateEstimate, EMPTY_REFINEMENTS } from "../shared/estimateEngine";
import { lineAmount, planningLines, planningTotal } from "../shared/planningBookPrice";
import { sharedBookRate } from "../lib/p5/priceBook";

const SCENARIOS = [
  { project: "kitchen" as const, sqft: 250, total: 36825, low: 29000, high: 45000 },
  { project: "bathroom" as const, sqft: 80, total: 15815, low: 12000, high: 19000 },
  { project: "whole-home" as const, sqft: 1800, total: 198575, low: 153000, high: 244000 },
  { project: "addition" as const, sqft: 400, total: 55250, low: 46000, high: 64000 },
  { project: "basement" as const, sqft: 900, total: 41075, low: 32000, high: 50000 },
];

test("homepage calculator and the shared book return the v2 totals", () => {
  for (const scenario of SCENARIOS) {
    const lines = planningLines(scenario.project, "mid-range", scenario.sqft, EMPTY_REFINEMENTS);
    let fromBook = 0;
    for (const line of lines) {
      const rate = sharedBookRate(line.code, "mid", line.remodel);
      assert.ok(rate, line.code);
      assert.equal(lineAmount(line, "mid-range"), rate.amount * line.quantity, line.code);
      fromBook += rate.amount * line.quantity;
    }
    assert.equal(fromBook, scenario.total, scenario.project);
    assert.equal(planningTotal(scenario.project, "mid-range", scenario.sqft), scenario.total, scenario.project);
    const shown = calculateEstimate({
      project: scenario.project,
      finish: "mid-range",
      sqft: scenario.sqft,
      refinements: EMPTY_REFINEMENTS,
    });
    assert.equal(shown.priceLow, scenario.low, scenario.project);
    assert.equal(shown.priceHigh, scenario.high, scenario.project);
  }
});

test("Signature unit prices are the v2 book, not a local table", () => {
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
