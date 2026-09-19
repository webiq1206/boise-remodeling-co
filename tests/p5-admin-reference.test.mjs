import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import test from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const compiled = ts.transpileModule(readFileSync("lib/p5/adminEndpoint.ts", "utf8"), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const id = "00000000-0000-4000-8000-000000000001";
const current = {
  id, brand: "Example Remodeler", revision: 4, status: "submitted",
  payload: {answers: {service: "handyman"}, text: "Current scope"},
  internal_estimate: {lines: [{description: "Current internal detail"}]},
  customer_estimate: {summary: "Current customer detail"},
};
const historical = {
  revision: 3, created_at: "2026-09-01T00:00:00Z",
  record: {
    payload: {answers: {service: "handyman"}, text: "Exact saved scope"},
    internal: {lines: [{description: "Exact saved confidential detail", unitCost: 123}]},
    customer: {summary: "Exact saved customer detail"},
  },
};

// Execute the real route body; substitute only its I/O dependencies. No
// database, auth cookie, provider, delivery endpoint or external fetch exists.
function harness({authorized = true, saved = historical} = {}) {
  const queries = [];
  let schemaCalls = 0;
  class DraftError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
  }
  const dependencies = {
    DraftError,
    requireEstimatorAdmin: async () => { if (!authorized) throw new DraftError("Unauthorized", 401); },
    ensureReviewSchema: async () => { schemaCalls++; },
    query: async (sql, parameters) => {
      assert.match(sql, /^SELECT /, "reference reads must never mutate saved detail or ledgers");
      queries.push({sql, parameters});
      if (sql.startsWith("SELECT id,brand,revision")) return [structuredClone(current)];
      if (sql.includes("p5_estimator_history WHERE draft_id=$1 AND revision=$2")) {
        assert.deepEqual(Array.from(parameters), [id, 3]);
        return saved ? [structuredClone(saved)] : [];
      }
      return [];
    },
    draftEvents: async () => [],
    json: value => Response.json(value),
    failed: error => Response.json({error: error.message}, {status: error.status || 500}),
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: () => dependencies, URL, Response, Request, Buffer,
  });
  return {
    read: revision => exports.getAdminEstimates(new Request(
      `https://example.test/api/admin/p5-estimators?id=${id}&revision=${revision}`,
    )),
    queries, schemaCalls: () => schemaCalls,
  };
}

test("current reference resolves exact authorized detail with read-only queries", async () => {
  const h = harness();
  const response = await h.read(4);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.estimate, current);
  assert.equal(body.reference.historical, false);
});

test("historical reference resolves immutable detail instead of the latest revision", async () => {
  const h = harness();
  const response = await h.read(3);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.reference.historical, true);
  assert.equal(body.estimate.revision, 3);
  assert.deepEqual(body.estimate.payload, historical.record.payload);
  assert.deepEqual(body.estimate.internal_estimate, historical.record.internal);
  assert.deepEqual(body.estimate.customer_estimate, historical.record.customer);
  assert.equal(current.revision, 4);
});

test("unauthorized references cannot read confidential detail or initialize schema", async () => {
  const h = harness({authorized: false});
  const response = await h.read(3);
  assert.equal(response.status, 401);
  assert.equal(h.queries.length, 0);
  assert.equal(h.schemaCalls(), 0);
  assert.doesNotMatch(await response.text(), /confidential|unitCost/);
});

test("missing and malformed revisions fail without falling back to another estimate", async () => {
  assert.equal((await harness({saved: null}).read(3)).status, 404);
  const invalid = harness();
  assert.equal((await invalid.read("3%26revision%3D4")).status, 400);
  assert.equal(invalid.queries.length, 0);
});