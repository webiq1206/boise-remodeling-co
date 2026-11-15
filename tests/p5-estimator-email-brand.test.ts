/**
 * Boise Remodeling Co estimator mail. Renders only. Does not send.
 * P5 Home Co is the From name. The message itself is this brand.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

import { ESTIMATOR_BRAND } from "../lib/p5/brand.ts";
import { estimatorFromAddress } from "../lib/p5/deliveryAdapter.ts";
import { assertCopy, ESTIMATE_DISCLAIMER, VALUE_TIERS, valueTier } from "../lib/p5/emailKit.ts";
import { estimateEmail } from "../lib/p5/estimateEmail.ts";
import { renderIntakeEmail } from "../lib/p5/intakeEmail.ts";
import { emptyIntakeDetails, type IntakeSnapshot } from "../lib/p5/intakeContract.ts";
import { routeIntake } from "../lib/p5/intakePolicy.ts";
import { projectReviewHandler } from "../lib/p5/reviewRequest.ts";
import type { IntakeRow } from "../lib/p5/intakeStore.ts";
import { EMAIL_FIXTURES, estimateRecord, storedAmount, type EmailFixture } from "./estimator-email-fixtures.ts";

const FROM = "P5 Home Co <hello@p5homeco.com>";
const LOGO = `https://${ESTIMATOR_BRAND.domain}${ESTIMATOR_BRAND.logo}`;
const SHARED = ["emailKit.ts", "estimateEmail.ts", "intakeEmail.ts", "outbox.ts", "reviewRequest.ts", "phoneHref.ts"];

function bodyOf(html: string, text: string): string {
  return `${html}\n${text}`;
}

function assertThisBrand(html: string, text: string, where: string, options: { city?: boolean; phone?: boolean } = {}) {
  const body = bodyOf(html, text);
  assert.match(html, new RegExp(ESTIMATOR_BRAND.name), where);
  assert.match(html, new RegExp(LOGO.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), where);
  assert.match(html, new RegExp(ESTIMATOR_BRAND.domain), where);
  assert.match(html, new RegExp(ESTIMATOR_BRAND.accent, "i"), where);
  if (options.city !== false) assert.match(body, /Meridian, ID 83646/, where);
  if (options.phone) assert.match(body, /\(208\) 477-1169/, where);
  assert.doesNotMatch(body, /P5 Home Co/, where);
  assert.doesNotMatch(body, /p5homeco\.com/, where);
  assert.doesNotMatch(body, /showroom|\bshop\b/i, where);
  const dash = new RegExp("[" + String.fromCharCode(0x2013, 0x2014) + "]");
  assert.doesNotMatch(body, dash, where);
  assert.doesNotMatch(body, /4031|Wapoot/i, where);
  assertCopy(html, text, { customerAddresses: ["100 Example Ave, Boise, ID 83702"] });
}

test("shared mail matches the p5-home-co kit, and From is P5 Home Co", () => {
  const manifest = JSON.parse(readFileSync("lib/p5/shared-manifest.json", "utf8")) as { files: Record<string, string> };
  for (const file of SHARED) {
    const source = readFileSync(`lib/p5/${file}`, "utf8");
    const hash = createHash("sha256").update(source).digest("hex");
    assert.equal(hash, manifest.files[`lib/p5/${file}`], file);
    assert.doesNotMatch(source, /useBrandFrom|allowBrandFrom/, file);
  }
  assert.equal(estimatorFromAddress({}), FROM);
  assert.equal(estimatorFromAddress({ SMTP_FROM: "Desk <desk@p5homeco.com>" }), "P5 Home Co <desk@p5homeco.com>");
  assert.equal(estimatorFromAddress({ SMTP_FROM: "Boise Remodeling Co <hello@boiseremodeling.co>" }), FROM);
  assert.equal(ESTIMATOR_BRAND.name, "Boise Remodeling Co");
  assert.equal(ESTIMATOR_BRAND.domain, "boiseremodeling.co");
  assert.equal(ESTIMATOR_BRAND.email, "hello@boiseremodeling.co");
  assert.equal(ESTIMATOR_BRAND.phone, "(208) 477-1169");
  assert.equal(ESTIMATOR_BRAND.accent, "#7D9479");
  assert.equal(ESTIMATOR_BRAND.ink, "#383837");
  assert.equal(ESTIMATOR_BRAND.cityLine, "Meridian, ID 83646");
  assert.deepEqual(VALUE_TIERS, { smallUnder: 10_000, majorOver: 75_000 });
});

test("every remodeling estimate email uses this brand and the stored range", () => {
  const roles = new Set<string>();
  for (const fixture of EMAIL_FIXTURES) {
    const before = structuredClone(fixture);
    const record = estimateRecord(fixture);
    const customer = estimateEmail(fixture.draftId, record, false);
    const admin = estimateEmail(fixture.draftId, record, true);
    assert.deepEqual(fixture, before, "rendering does not change the stored fixture");
    assert.ok(customer.html.startsWith("<!doctype html>"), fixture.id);
    assert.ok(admin.html.startsWith("<!doctype html>"), fixture.id);
    assertThisBrand(customer.html, customer.text, `${fixture.id} customer`, { phone: true, city: true });
    assertThisBrand(admin.html, admin.text, `${fixture.id} admin`, { city: false });
    const amount = storedAmount(fixture);
    if (amount && fixture.high != null) {
      const tier = valueTier(fixture.high);
      roles.add(tier === "small" ? "small" : tier === "major" ? "major" : "mid");
      for (const part of [customer.html, customer.text, admin.html, admin.text]) {
        assert.ok(part.includes(amount), `${fixture.id} missing stored ${amount}`);
      }
      assert.ok(customer.text.includes(ESTIMATE_DISCLAIMER), fixture.id);
      assert.match(customer.html, /Schedule now/);
      assert.match(customer.text, /https:\/\/meetings-na2\.hubspot\.com\/client3/);
      if (tier === "small") {
        assert.match(customer.text, /quick visit/);
        assert.doesNotMatch(customer.text, /home walkthrough|planning consultation/);
      } else if (tier === "major") {
        assert.match(customer.text, /planning consultation/);
        assert.match(customer.text, /plans and permits/);
        assert.doesNotMatch(customer.text, /quick visit|home walkthrough/);
      } else {
        assert.match(customer.text, /home walkthrough/);
        assert.doesNotMatch(customer.text, /quick visit|planning consultation/);
      }
    } else {
      roles.add("withheld");
      assert.match(customer.text, /Pricing pending review/);
      assert.doesNotMatch(`${customer.text}\n${admin.text}`, /\$\d/);
    }
    if (fixture.uploads.length) assert.match(admin.html, /View uploaded files/);
    else assert.doesNotMatch(admin.html, /View uploaded files/);
    assert.doesNotMatch(admin.html, /Open in QuickBooks/);
    if (fixture.phone) assert.match(admin.html, /Call \(208\) 555/);
    else assert.doesNotMatch(admin.html, /Call \(208\) 555/);
    assert.doesNotMatch(customer.html, /<script>/);
  }
  assert.ok(roles.has("small") && roles.has("mid") && roles.has("major") && roles.has("withheld"));
});

test("intake and review mail for this brand keep P5 Home Co out of the message", async () => {
  const snapshot = {
    schema: 1,
    projectId: "p5:12345678-1234-4234-8234-123456789abc",
    originSite: "remodeling",
    currentSite: "remodeling",
    draftId: "12345678-1234-4234-8234-123456789abc",
    revision: 1,
    contextVersion: 1,
    contact: { name: "Ada Lovelace", email: "ada@example.com", phone: "2085550100", preferredContact: "email" },
    details: emptyIntakeDetails(),
    scope: { text: "Kitchen remodel", answers: { service: "kitchen" }, uploads: [] },
    routing: routeIntake("remodeling", "kitchen", []),
    unresolved: [],
    savedAt: "2099-01-02T12:00:00.000Z",
  } as IntakeSnapshot;
  const customer = renderIntakeEmail(snapshot, false, []);
  const team = renderIntakeEmail(snapshot, true, []);
  assertThisBrand(customer.html, customer.text, "intake customer", { phone: true, city: true });
  assertThisBrand(team.html, team.text, "intake team", { phone: true, city: true });
  assert.match(customer.text, /Schedule now/);
  assert.doesNotMatch(team.html, /Schedule now/);
  assert.match(customer.html, /#7D9479/i);

  const db = new PGlite();
  const id = "12345678-1234-4234-8234-123456789abc";
  const key = "a".repeat(64);
  await db.exec(`CREATE TABLE p5_estimator_work(draft_id uuid,work_key text,payload jsonb);CREATE TABLE p5_estimator_drafts(id uuid PRIMARY KEY,revision integer,status text);INSERT INTO p5_estimator_drafts VALUES('${id}',1,'draft')`);
  let html = "";
  let text = "";
  const handler = projectReviewHandler({
    readDraft: async () => ({
      id,
      brand: ESTIMATOR_BRAND.id,
      revision: 1,
      status: "draft" as const,
      updatedAt: "",
      text: "Kitchen remodel",
      answers: { service: "kitchen" },
      extraction: null,
      reviewed: null,
      uploads: [],
      contact: { name: "Ada Lovelace", email: "", phone: "" },
    }),
    query: async (sql: string, values: unknown[] = []) => (await db.query(sql, values)).rows as IntakeRow[],
    adminRecipients: async () => ["hello@boiseremodeling.co"],
    sendEmail: async (input: { html?: string; text: string }) => {
      html = input.html || "";
      text = input.text;
      return "render-only";
    },
  });
  try {
    const response = await handler(new Request(`https://${ESTIMATOR_BRAND.domain}/api/p5-estimator/review`, {
      method: "POST",
      headers: { "x-p5-draft-id": id, "x-p5-draft-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada Lovelace", email: "ada@example.com", phone: "2085550100" }),
    }));
    assert.equal(response.status, 200);
    assertThisBrand(html, text, "review", { city: true, phone: true });
    assert.match(html, /tel:\+12085550100/);
  } finally {
    await db.close();
  }
});

test("fixture services are this brand's services", () => {
  const services = new Set<string>(ESTIMATOR_BRAND.services);
  for (const fixture of EMAIL_FIXTURES) assert.ok(services.has(fixture.service), fixture.service);
  const labels = EMAIL_FIXTURES.map((fixture: EmailFixture) => fixture.label);
  assert.deepEqual(labels, ["small", "mid", "major", "uploads", "withheld"]);
});
