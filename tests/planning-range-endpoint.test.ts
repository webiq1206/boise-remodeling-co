import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planningRangePost } from "../server/services/planningRangeEndpoint.ts";
import { calculateEstimate, EMPTY_REFINEMENTS } from "../shared/estimateEngine.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/remodeling-planning-parity.json", import.meta.url), "utf8"));
const request = (body: unknown) => new Request("http://127.0.0.1/api/planning-range", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const baseline = { project: "kitchen", finish: "mid-range", sqft: 250, refinements: {} };

test("every project, finish, size and refinement branch preserves the exact pre-boundary range", async () => {
  assert.equal(fixture.sourceCommit, "4c06a725ac330d46cad09fa11b5173a7cb78fabc");
  assert.ok(fixture.cases.length > 2000);
  const prior = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("Pure planning calculation attempted external I/O"); };
  try {
    for (const item of fixture.cases) {
      const response = await planningRangePost(request(item.input));
      if (item.rejected) { assert.equal(response.status, 400, JSON.stringify(item.input)); continue; }
      assert.equal(response.status, 200, JSON.stringify(item.input));
      const value = await response.json();
      assert.deepEqual(Object.keys(value).sort(), ["priceHigh", "priceLow"]);
      assert.deepEqual(value, item.range, JSON.stringify(item.input));
      const calculated = calculateEstimate({ ...item.input, refinements: { ...EMPTY_REFINEMENTS, ...item.input.refinements } });
      assert.deepEqual({ priceLow: calculated.priceLow, priceHigh: calculated.priceHigh }, item.range);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  } finally { globalThis.fetch = prior; }
});

test("the public boundary rejects private fields, unknown choices, unsupported sizes and oversized streams", async () => {
  for (const input of [
    { ...baseline, annualOverhead: 1 }, { ...baseline, finance: {} },
    { ...baseline, project: "unknown" }, { ...baseline, finish: "unknown" },
    { ...baseline, sqft: 99 }, { ...baseline, sqft: 601 }, { ...baseline, sqft: 100.5 },
    { ...baseline, sqft: null }, { ...baseline, refinements: { arbitrary: true } },
    { ...baseline, refinements: { upgradeScope: ["private-cost-code"] } },
    { ...baseline, refinements: { upgradeScope: ["cabinets", "cabinets"] } },
    { ...baseline, refinements: { upgradeScope: ["shower"] } },
    { ...baseline, refinements: { bathroomCount: 13 } },
  ]) {
    const response = await planningRangePost(request(input));
    assert.equal(response.status, 400, JSON.stringify(input));
    assert.deepEqual(Object.keys(await response.json()), ["error"]);
  }
  assert.equal((await planningRangePost(new Request("http://127.0.0.1/api/planning-range", { method: "POST", body: "{}" }))).status, 415);
  assert.equal((await planningRangePost(new Request("http://127.0.0.1/api/planning-range", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }))).status, 400);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(" ".repeat(4097))); controller.close(); } });
  assert.equal((await planningRangePost(new Request("http://127.0.0.1/api/planning-range", { method: "POST", headers: { "Content-Type": "application/json" }, body: stream, duplex: "half" } as RequestInit))).status, 413);
});
