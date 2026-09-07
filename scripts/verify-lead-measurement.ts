/**
 * Isolated lead measurement checks.
 *
 * Uses browser and network fakes only. It does not write to a database, send
 * email, call the CRM, contact Meta or emit real Google events.
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  trackAcceptedInquiry,
  type AcceptedInquiryResponse,
} from "../lib/inquiryTracking";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

async function verifyClientDedupe() {
  const gtagCalls: unknown[][] = [];
  const fbqCalls: unknown[][] = [];
  const capiBodies: unknown[] = [];
  const conversionAcks: unknown[] = [];
  const storage = new MemoryStorage();

  Object.assign(globalThis, {
    window: {
      localStorage: storage,
      sessionStorage: new MemoryStorage(),
      location: { href: "https://example.test/services/kitchen-remodel" },
      setTimeout,
      gtag: (...args: unknown[]) => gtagCalls.push(args),
      fbq: (...args: unknown[]) => fbqCalls.push(args),
    },
    document: { cookie: "" },
    fetch: async (url: string, init?: RequestInit) => {
      if (url === "/api/meta-capi") {
        capiBodies.push(JSON.parse(String(init?.body)));
      } else if (url === "/api/lead-conversion/ack") {
        conversionAcks.push(JSON.parse(String(init?.body)));
      } else {
        assert.fail(`unexpected request to ${url}`);
      }
      return new Response(null, { status: 200 });
    },
  });

  const accepted: AcceptedInquiryResponse = {
    accepted: true,
    inquiryId: "8f3907a0-4a78-4da8-9b80-8ab980da60db",
    duplicate: false,
    conversionEligible: true,
    delivery: "sent",
  };
  trackAcceptedInquiry(accepted, "kitchen");
  trackAcceptedInquiry(accepted, "kitchen");
  trackAcceptedInquiry(
    { ...accepted, duplicate: true, conversionEligible: false },
    "kitchen",
  );
  await Promise.resolve();

  const gaLeads = gtagCalls.filter((call) => call[0] === "event" && call[1] === "generate_lead");
  const adsLeads = gtagCalls.filter((call) => call[0] === "event" && call[1] === "conversion");
  const metaLeads = fbqCalls.filter((call) => call[0] === "track" && call[1] === "Lead");
  assert.equal(gaLeads.length, 1, "GA4 must receive one new-lead event");
  assert.equal(adsLeads.length, 1, "Google Ads must receive one conversion");
  assert.equal(metaLeads.length, 1, "Meta Pixel must receive one Lead");
  assert.equal(capiBodies.length, 1, "Meta CAPI must receive one deduped Lead");
  assert.equal(conversionAcks.length, 2, "initial dispatch and safe duplicate must acknowledge");

  const adsParams = adsLeads[0][2] as Record<string, unknown>;
  assert.equal(adsParams.send_to, "AW-18354188204/LE2vCPXstO8cEKzf-q9E");
  assert.equal(adsParams.transaction_id, accepted.inquiryId);
  const metaOptions = metaLeads[0][3] as Record<string, unknown>;
  assert.equal(metaOptions.eventID, accepted.inquiryId);

  const allPayloads = JSON.stringify({ gtagCalls, fbqCalls, capiBodies });
  for (const pii of ["person@example.test", "2085550100", "123 Main"]) {
    assert.equal(allPayloads.includes(pii), false, `analytics contained PII: ${pii}`);
  }
}

async function verifyStorageFailureContract() {
  // Import the route only after disabling the DB so this can never insert a row
  // or notify staff. Persistence failure must return 503 before delivery code.
  const priorDatabaseUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  const { POST } = await import("../app/api/consultation/route");
  const request = new NextRequest("http://example.test/api/consultation", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.8" },
    body: JSON.stringify({
      inquiryId: "ea20a7cb-1883-470d-9d56-d1e7a9bb92e6",
      formStartedAt: Date.now() - 2000,
      website: "",
      name: "Test Homeowner",
      phone: "2085550100",
      email: "person@example.test",
      address: "123 Main Street",
      projectType: "kitchen",
    }),
  });
  const response = await POST(request);
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.accepted, false);

  const spamRequest = new NextRequest("http://example.test/api/consultation", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.8" },
    body: JSON.stringify({
      inquiryId: "de4ba3f7-2371-4c5c-91a3-2dbb579341e8",
      formStartedAt: Date.now() - 2000,
      website: "spam.example",
      name: "Test Homeowner",
      phone: "2085550100",
      email: "person@example.test",
      address: "123 Main Street",
      projectType: "kitchen",
    }),
  });
  const spamResponse = await POST(spamRequest);
  assert.equal(spamResponse.status, 400, "honeypot submissions must be rejected");

  const tooFastRequest = new NextRequest("http://example.test/api/consultation", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.8" },
    body: JSON.stringify({
      inquiryId: "e092878a-2d69-4481-b7da-2c7b31f20eb9",
      formStartedAt: Date.now(),
      website: "",
      name: "Test Homeowner",
      phone: "2085550100",
      email: "person@example.test",
      address: "123 Main Street",
      projectType: "kitchen",
    }),
  });
  const tooFastResponse = await POST(tooFastRequest);
  assert.equal(tooFastResponse.status, 400, "impossibly fast submissions must be rejected");
  if (priorDatabaseUrl) process.env.DATABASE_URL = priorDatabaseUrl;
}

async function main() {
  await verifyClientDedupe();
  await verifyStorageFailureContract();
  console.log("Lead measurement checks passed: native Ads destination, GA4 and Meta exactly-once browser dedupe, no PII, and storage failure contract.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});