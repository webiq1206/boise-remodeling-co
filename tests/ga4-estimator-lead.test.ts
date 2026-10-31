import test from "node:test";
import assert from "node:assert/strict";
import { estimatorLeadGa4Params, trackGoogleAdsLeadConversion } from "../lib/googleAdsConversion.ts";

type Call = unknown[];

function install(): Call[] {
  const calls: Call[] = [];
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    location: { pathname: "/estimate" },
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
    setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
    gtag: (...args: unknown[]) => void calls.push(args),
  };
  return calls;
}

function leads(calls: Call[]) {
  return calls.filter((call) => call[0] === "event" && call[1] === "generate_lead").map((call) => call[2]);
}

test("an estimator finish sends one GA4 generate_lead next to the Ads lead and a repeat sends none", () => {
  const calls = install();
  assert.equal(trackGoogleAdsLeadConversion({ service: "kitchen" }, "estimator:ga4-a"), true);
  assert.deepEqual(leads(calls), [{ lead_source: "estimator", project_type: "kitchen", event_id: "estimator:ga4-a" }]);
  assert.equal(trackGoogleAdsLeadConversion({ service: "kitchen" }, "estimator:ga4-a"), false);
  assert.equal(leads(calls).length, 1);
  delete (globalThis as { window?: unknown }).window;
});

test("an intake finish is labelled as the intake path", () => {
  const calls = install();
  assert.equal(trackGoogleAdsLeadConversion({}, "intake:ga4-b"), true);
  assert.deepEqual(leads(calls), [{ lead_source: "estimator_intake", project_type: "unknown", event_id: "intake:ga4-b" }]);
  delete (globalThis as { window?: unknown }).window;
});

test("a form key sends no generate_lead here, because the form already sends it", () => {
  const calls = install();
  assert.equal(trackGoogleAdsLeadConversion({ service: "kitchen" }, "conv_ga4-c"), true);
  assert.equal(leads(calls).length, 0);
  assert.equal(estimatorLeadGa4Params({}, "conv_ga4-c"), null);
  assert.equal(estimatorLeadGa4Params({}, undefined), null);
  delete (globalThis as { window?: unknown }).window;
});
