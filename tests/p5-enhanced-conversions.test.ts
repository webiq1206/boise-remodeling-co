import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyGoogleAdsUserData,
  googleAdsUserData,
  trackGoogleAdsLeadConversion,
} from "../lib/googleAdsConversion.ts";
import { trackAcceptedInquiry, type AcceptedInquiryResponse } from "../lib/inquiryTracking.ts";

const accepted: AcceptedInquiryResponse = {
  accepted: true,
  inquiryId: "8f3907a0-4a78-4da8-9b80-8ab980da60db",
  duplicate: false,
  conversionEligible: true,
  delivery: "sent",
};

function restore(name: "window" | "navigator", prior: PropertyDescriptor | undefined) {
  if (prior) Object.defineProperty(globalThis, name, prior);
  else delete (globalThis as Record<string, unknown>)[name];
}

function withBrowser(run: (calls: unknown[][]) => void, options: { denied?: boolean; disabled?: boolean; webdriver?: boolean } = {}) {
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const priorNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const calls: unknown[][] = [];
  const store = new Map<string, string>();
  const fakeWindow = {
    location: { hostname: "boiseremodeling.co" },
    sessionStorage: { getItem: (key: string) => (options.disabled && key === "p5_analytics_disabled" ? "1" : null), setItem: () => {} },
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() { return store.size; },
    },
    dataLayer: options.denied ? [["consent", "update", { ad_user_data: "denied" }]] : [],
    gtag: (...args: unknown[]) => calls.push(args),
    setTimeout,
  };
  Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
  Object.defineProperty(globalThis, "navigator", {
    value: { webdriver: options.webdriver === true, doNotTrack: "0", globalPrivacyControl: false },
    configurable: true,
  });
  try {
    run(calls);
  } finally {
    restore("window", priorWindow);
    restore("navigator", priorNavigator);
  }
  return calls;
}

test("user data keeps normalized email, a 10-digit phone, name parts and ZIP, and drops everything else", () => {
  const payload = googleAdsUserData({
    email: "  Ada@Example.COM ",
    phone: "(208) 555-0100",
    name: "Jane Q Public",
    postalCode: "83702",
  });
  assert.deepEqual(payload, {
    email: "ada@example.com",
    phone_number: "+12085550100",
    address: { first_name: "Jane", last_name: "Q Public", postal_code: "83702", country: "US" },
  });
  assert.equal(googleAdsUserData({ phone: "12085550100" })?.phone_number, undefined);
  assert.equal(googleAdsUserData({ phone: "555-0148" })?.phone_number, undefined);
  assert.equal(googleAdsUserData({ phone: "1-800-FLOWERS" }), null);
  assert.equal(googleAdsUserData({ postalCode: "123 Main Street, Boise ID" }), null);
  const encoded = JSON.stringify(payload);
  assert.equal(encoded.includes("Main"), false);
  assert.equal(encoded.includes("description"), false);
  assert.equal(encoded.includes("street"), false);
});

test("an accepted inquiry sets user_data before the conversion and keeps transaction_id", () => {
  const calls = withBrowser((gtagCalls) => {
    trackAcceptedInquiry(accepted, "addition", 0, {
      email: "ada@example.com",
      phone: "2085550100",
      name: "Ada Lovelace",
      postalCode: "83702",
    });
    trackAcceptedInquiry({ ...accepted, accepted: false, conversionEligible: false }, "addition", 0, {
      email: "ada@example.com",
      name: "Ada Lovelace",
    });
  });
  const setAt = calls.findIndex((call) => call[0] === "set" && call[1] === "user_data");
  const conversionAt = calls.findIndex((call) => call[0] === "event" && call[1] === "conversion");
  assert.equal(setAt >= 0 && conversionAt > setAt, true);
  assert.equal(calls.filter((call) => call[0] === "set").length, 1);
  const userData = calls[setAt][2] as { email: string; address: { first_name: string } };
  assert.equal(userData.email, "ada@example.com");
  assert.equal(userData.address.first_name, "Ada");
  assert.equal((calls[conversionAt][2] as { transaction_id: string }).transaction_id, accepted.inquiryId);
  assert.equal(JSON.stringify(calls).includes("Main Street"), false);
});

test("denied consent and a disabled tag skip user_data and the conversion still fires", () => {
  const denied = withBrowser((calls) => {
    trackAcceptedInquiry({ ...accepted, inquiryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, "kitchen", 0, { email: "ada@example.com", name: "Ada Lovelace" });
  }, { denied: true });
  assert.equal(denied.some((call) => call[0] === "set"), false);
  assert.equal(denied.some((call) => call[1] === "conversion"), true);

  const disabled = withBrowser((calls) => {
    assert.equal(applyGoogleAdsUserData({ email: "ada@example.com" }), false);
    assert.equal(calls.length, 0);
  }, { disabled: true });
  assert.equal(disabled.length, 0);
});

test("an estimator finish that stored a lead sets user_data from contact fields only", () => {
  const calls = withBrowser(() => {
    const draft = {
      id: "11111111-1111-4111-8111-111111111111",
      text: "Replace the kitchen and describe the island.",
      contact: { name: "Sam Rivera", email: " Sam@Example.com ", phone: "208-555-0199" },
      answers: { address: "123 Main Street, Boise, ID 83702", service: "kitchen" },
      intake: { projectId: "remodeling:11111111-1111-4111-8111-111111111111" },
    };
    window.localStorage.setItem("p5-project-draft-v2", JSON.stringify(draft));
    assert.equal(trackGoogleAdsLeadConversion({ service: "kitchen" }, `estimator:${draft.id}`), true);
    assert.equal(trackGoogleAdsLeadConversion({ service: "kitchen" }, `intake:${draft.intake.projectId}`), true);
  });
  const sets = calls.filter((call) => call[0] === "set" && call[1] === "user_data");
  assert.equal(sets.length, 2);
  const first = sets[0][2] as { email: string; phone_number: string; address: Record<string, string> };
  assert.equal(first.email, "sam@example.com");
  assert.equal(first.phone_number, "+12085550199");
  assert.deepEqual(first.address, { first_name: "Sam", last_name: "Rivera", postal_code: "83702", country: "US" });
  const encoded = JSON.stringify(sets);
  assert.equal(encoded.includes("Main Street"), false);
  assert.equal(encoded.includes("kitchen and describe"), false);
  const conversions = calls.filter((call) => call[1] === "conversion");
  assert.equal(conversions.length, 2);
  assert.ok(calls.indexOf(sets[0]) < calls.indexOf(conversions[0]));
  assert.equal((conversions[0][2] as { transaction_id: string }).transaction_id, "estimator:11111111-1111-4111-8111-111111111111");
});

test("consultation passes contact fields and leaves the message and street address out of the tracker call", () => {
  const form = readFileSync(new URL("../components/ConsultationForm.tsx", import.meta.url), "utf8");
  assert.match(form, /postalCode: deriveZip\(variables\.address\)/);
  assert.match(form, /email: variables\.email/);
  assert.match(form, /phone: variables\.phone/);
  assert.match(form, /name: variables\.name/);
  assert.equal(form.includes("message: variables.message"), false);
  assert.equal(form.includes("address: variables.address"), false);
  assert.match(form, /data-testid="input-name"/);
  assert.match(form, /data-testid="textarea-message"/);
});
