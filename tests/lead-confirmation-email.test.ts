/**
 * Lead confirmation wording and the Schedule now button. No mail is sent.
 *
 * After an estimate (owner request, 16 November 2026): every customer email
 * about an estimate opens with "Hey" where it has a greeting, invites changes
 * before the disclaimer, keeps one Schedule now button and ends with the
 * family P.S. after the sign-off. Request confirmations and team emails carry
 * none of it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { customerEstimateDocument, customerLayout, estimateEmail } from "../lib/p5/estimateEmail.ts";
import { renderIntakeEmail } from "../lib/p5/intakeEmail.ts";
import { emptyIntakeDetails, type IntakeSnapshot } from "../lib/p5/intakeContract.ts";
import { routeIntake } from "../lib/p5/intakePolicy.ts";
import {
  ESTIMATE_ADJUST_NOTE,
  ESTIMATE_DISCLAIMER,
  ESTIMATE_FAMILY_PS,
  SCHEDULE_URL,
  SHARED_DISCLAIMER,
  scheduleBlockHtml,
  scheduleBlockText,
  scheduleIntentFor,
} from "../lib/p5/scheduleEmail.ts";
import { buildCustomerEmailHtml, buildCustomerSubject, buildAdminEmailHtml } from "../server/services/consultationEmail.ts";
import { htmlToPlainText, wrapEmailHtml } from "../server/services/emailLayout.ts";
import { buildLeadConfirmation } from "../server/services/leadConfirmation.ts";
import { buildPlanCustomerEmail } from "../server/services/planEmail.ts";
import { buildRe10CustomerEmail } from "../server/services/re10Email.ts";
import { BASELINE_SQFT } from "../shared/costs/scopeRules.ts";
import { resolveQuotedRange } from "../shared/costs/resolve.ts";
import {
  EMPTY_REFINEMENTS,
  calculateEstimate,
  countVisibleUserRefinements,
  getAvailableFinishLevels,
  getSetRefinementKeys,
} from "../shared/estimateEngine.ts";

const EM_DASH = String.fromCharCode(8212);
function banned(value: string): boolean {
  return value.includes(EM_DASH) || /Perkins 5|showroom|\bshop\b/i.test(value);
}

function visible(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

const lead = {
  name: "Ada Lovelace",
  phone: "(208) 555-0100",
  email: "ada@example.com",
  address: "1 Main St",
  projectType: "Kitchen remodel",
  message: "We want a new kitchen.",
};

const NEXT_STEP = "The next step is a home walkthrough, so we can see the property and turn this estimate into a true bid";
const SIGNOFF = "The Boise Remodeling Co team";
const MARK = "ZZLASTPARAGRAPHZZ";

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Everything a reader sees after the last occurrence of `marker`. */
function tailAfter(text: string, marker: string): string {
  const at = text.lastIndexOf(marker);
  assert.ok(at >= 0, `missing: ${marker.slice(0, 40)}`);
  return text.slice(at + marker.length).trim();
}

/** What the charcoal shell prints after the letter itself: the footer, nothing else. */
const SHELL_FOOTER = tailAfter(visible(wrapEmailHtml({ title: "x", content: `<p>${MARK}</p>` })), MARK);
/** One Schedule now button, as the block renders it (the label sits in the anchor and in the Outlook VML). */
const ONE_BUTTON = count(scheduleBlockHtml({ kind: "estimate" }), ">Schedule now<");

/**
 * The approved wording on one customer estimate email: the walkthrough
 * sentence, one Schedule now button, the adjust note before the disclaimer and
 * the P.S. as the last paragraph, with only `footer` after it.
 */
function assertEstimateLetterHtml(label: string, html: string, footer: string, greeting?: string): void {
  const seen = visible(html);
  assert.ok(seen.includes(NEXT_STEP), `${label}: walkthrough sentence`);
  assert.ok(html.includes(`href="${SCHEDULE_URL}"`), `${label}: schedule link`);
  assert.equal(count(html, ">Schedule now<"), ONE_BUTTON, `${label}: exactly one Schedule now button`);
  assert.equal(count(seen, ESTIMATE_ADJUST_NOTE), 1, `${label}: adjust note once`);
  assert.equal(count(seen, ESTIMATE_DISCLAIMER), 1, `${label}: disclaimer once`);
  assert.ok(seen.indexOf(ESTIMATE_ADJUST_NOTE) < seen.indexOf(ESTIMATE_DISCLAIMER), `${label}: adjust note before the disclaimer`);
  assert.equal(count(seen, ESTIMATE_FAMILY_PS), 1, `${label}: P.S. once`);
  assert.ok(html.includes(`${ESTIMATE_FAMILY_PS}</p>`), `${label}: P.S. is its own paragraph`);
  assert.equal(tailAfter(seen, ESTIMATE_FAMILY_PS), footer, `${label}: nothing but the footer follows the P.S.`);
  if (greeting) assert.ok(seen.includes(greeting), `${label}: greeting "${greeting}"`);
  assert.equal(banned(seen), false, `${label}: house style`);
}

function assertNoEstimateWording(label: string, value: string): void {
  const seen = visible(value);
  assert.ok(!seen.includes("P.S."), `${label}: no P.S.`);
  assert.ok(!seen.includes("Anything else on your list"), `${label}: no family question`);
  assert.ok(!seen.includes(ESTIMATE_ADJUST_NOTE), `${label}: no adjust note`);
}

/** A planning range from the real engine, the way the consultation route verifies one. */
function planningRange() {
  const project = "kitchen" as const;
  const finish = getAvailableFinishLevels(project)[0];
  const sqft = BASELINE_SQFT[project];
  const refinements = { ...EMPTY_REFINEMENTS };
  const quoted = resolveQuotedRange(project, finish as never, sqft, refinements)!;
  const guide = calculateEstimate(
    { project, finish: finish as never, sqft, refinements },
    countVisibleUserRefinements(project, getSetRefinementKeys(refinements)),
  );
  return {
    project,
    finish: finish as never,
    sqft,
    priceLow: quoted.priceLow,
    priceHigh: quoted.priceHigh,
    roi: guide.roi,
    confidence: guide.confidenceLabel,
    refinements,
    included: guide.included,
  };
}

test("the approved after-estimate wording is exact and lives in one module", () => {
  assert.equal(
    ESTIMATE_ADJUST_NOTE,
    "If something is missing, or you'd like to change the scope, the finishes or the timing, tell us. It's easy to adjust, and we'd rather get it right than have you guessing.",
  );
  assert.equal(
    ESTIMATE_FAMILY_PS,
    "P.S. Anything else on your list? Boise Remodeling Co is part of P5 Home Co, the company behind Boise Construction Co, Boise Cabinet Co and Boise Handyman Co. So whether it's a few repairs, new cabinets, a full kitchen or bath remodel, an addition or a new home, tell us and we'll plan it alongside this project.",
  );
  assert.equal(SCHEDULE_URL, "https://meetings-na2.hubspot.com/client3");
  assert.equal(banned(`${ESTIMATE_ADJUST_NOTE}\n${ESTIMATE_FAMILY_PS}`), false);
  assert.doesNotMatch(`${ESTIMATE_ADJUST_NOTE}\n${ESTIMATE_FAMILY_PS}`, /\bquote\b|\bbid\b|near me/i);
  // No numbers to defend: the only digit is the one in the parent company's name.
  assert.doesNotMatch(`${ESTIMATE_ADJUST_NOTE}\n${ESTIMATE_FAMILY_PS}`.replaceAll("P5 Home Co", ""), /\d/);

  // The estimate block carries the adjust note, before the disclaimer. The request block does not.
  const text = scheduleBlockText({ kind: "estimate" });
  assert.ok(text.includes(`Schedule now: ${SCHEDULE_URL}`));
  assert.ok(text.endsWith(`${ESTIMATE_ADJUST_NOTE}\n\n${ESTIMATE_DISCLAIMER}`));
  assert.ok(!text.includes("P.S."), "the P.S. belongs to the end of the letter, not to the block");
  const html = scheduleBlockHtml({ kind: "estimate", panel: true });
  assert.ok(visible(html).indexOf(ESTIMATE_ADJUST_NOTE) > visible(html).indexOf("Schedule now"));
  assert.ok(visible(html).indexOf(ESTIMATE_ADJUST_NOTE) < visible(html).indexOf(ESTIMATE_DISCLAIMER));
  assertNoEstimateWording("request block text", scheduleBlockText({ kind: "request", intent: "walkthrough" }));
  assertNoEstimateWording("request block html", scheduleBlockHtml({ kind: "request", intent: "consult" }));

  // One home for the words: no email builder pastes them.
  for (const file of [
    "lib/p5/estimateEmail.ts",
    "lib/p5/intakeEmail.ts",
    "server/services/consultationEmail.ts",
    "server/services/leadConfirmation.ts",
    "server/services/planEmail.ts",
    "server/services/re10Email.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /Anything else on your list|easy to adjust|part of P5 Home Co/, file);
  }
});

test("customer emails about an estimate say Hey, invite changes, keep Schedule now and end with the P.S.", () => {
  // 1. Consultation request that carries a planning range (live: /api/consultation).
  const range = planningRange();
  const consultation = buildCustomerEmailHtml(lead, range);
  assertEstimateLetterHtml("consultation with a range", consultation, SHELL_FOOTER, "Hey Ada,");
  assert.ok(!visible(consultation).includes("Hi Ada,"));
  assert.ok(visible(consultation).indexOf(SIGNOFF) < visible(consultation).indexOf(ESTIMATE_FAMILY_PS), "P.S. follows the sign-off");
  // That route sends the plain-text part from the HTML.
  const consultationText = htmlToPlainText(consultation);
  assert.ok(consultationText.includes(ESTIMATE_ADJUST_NOTE));
  assert.ok(consultationText.includes(ESTIMATE_FAMILY_PS));
  assert.ok(consultationText.includes(SCHEDULE_URL));
  assert.ok(consultationText.indexOf(SIGNOFF) < consultationText.indexOf(ESTIMATE_FAMILY_PS));

  // 2. The short confirmation after the chat assistant priced something (live: assistantLead).
  const saved = buildLeadConfirmation({ name: "Ada Lovelace", intent: "walkthrough", kind: "estimate" });
  assert.ok(saved.text.startsWith("Hey Ada,\n"));
  assert.ok(saved.text.includes(`Schedule now: ${SCHEDULE_URL}`));
  assert.equal(count(saved.text, SCHEDULE_URL), 1);
  assert.ok(saved.text.includes(`${ESTIMATE_ADJUST_NOTE}\n\n${ESTIMATE_DISCLAIMER}`));
  assert.ok(saved.text.endsWith(`\n\n${SIGNOFF}\n\n${ESTIMATE_FAMILY_PS}`), "P.S. is the last text paragraph, after the sign-off");
  assertEstimateLetterHtml("saved estimate confirmation", saved.html, SHELL_FOOTER, "Hey Ada,");
  assert.ok(visible(saved.html).indexOf(SIGNOFF) < visible(saved.html).indexOf(ESTIMATE_FAMILY_PS));
  assert.equal(banned(`${saved.subject}\n${saved.text}`), false);

  // 3. The shared document estimator's customer estimate (live: /estimate/scope and staff-published estimates).
  const record = {
    customer: {
      summary: "Project type: kitchen",
      includedCategories: ["Plumbing"],
      range: { low: 100, high: 200 },
      lineItems: [],
      categoryRanges: [],
      assumptions: [],
      exclusions: ["Land"],
      allowances: [],
      factors: [],
      message: "Review your estimate.",
      nextStep: "Consultation",
      disclaimer: "Preliminary only.",
    },
    contact: { name: "QA Person" },
  };
  const document = estimateEmail("synthetic", record, false);
  const documentFooter = tailAfter(visible(customerLayout(customerEstimateDocument("synthetic", record), `<p>${MARK}</p>`)), MARK);
  assertEstimateLetterHtml("document estimate", document.html, documentFooter, "Hey QA,");
  assert.ok(!visible(document.html).includes("Hi QA,"));
  assert.ok(document.text.includes(`Schedule now: ${SCHEDULE_URL}`));
  assert.equal(count(document.text, `Schedule now: ${SCHEDULE_URL}`), 1);
  assert.ok(document.text.includes(`${ESTIMATE_ADJUST_NOTE}\n\n${ESTIMATE_DISCLAIMER}`));
  assert.ok(document.text.endsWith(`\n\n${ESTIMATE_FAMILY_PS}`), "P.S. is the last text paragraph");
  assert.equal(count(document.text, ESTIMATE_FAMILY_PS), 1);
  // No name, no first-name greeting: "Hello," stays.
  const unnamed = estimateEmail("synthetic", { customer: record.customer }, false);
  assert.ok(visible(unnamed.html).includes("Hello,"));
  assert.ok(!/\bHey\b/.test(visible(unnamed.html)));

  // 4. Plans (retired route, builder kept consistent).
  const plans = buildPlanCustomerEmail(
    {
      name: "Dana Squier",
      email: "dana@example.com",
      phone: "2085550100",
      preferredContact: "email",
      propertyAddress: "2609 N Mountain View",
      projectType: "Kitchen",
      finishLevel: "Mid",
    },
    {
      lead: { range: "$120,000 to $165,000", low: 120000, high: 165000, selections: [], disclaimers: ["This is a planning range only."] },
      measurements: null,
      statedTotalSqFt: 1714,
      blockers: [],
      notMeasured: [],
    },
  );
  assertEstimateLetterHtml("plans", plans, SHELL_FOOTER, "Hey Dana, here is your planning range.");

  // 5. RE-10 repairs (retired route, builder kept consistent).
  const repairs = buildRe10CustomerEmail(
    {
      name: "Pat Jones",
      email: "pat@example.com",
      phone: "2085551111",
      preferredContact: "email",
      role: "buyer",
      propertyAddress: "12 Oak Ave, Meridian ID",
    },
    { price: 4200, validDays: 30, categories: [], needsOnsite: [], uncertainty: [], assumptions: ["Standard access"] },
  );
  assertEstimateLetterHtml("repairs", repairs, SHELL_FOOTER, "Hey Pat, here is the price for the repairs on the RE-10 you sent.");
  assert.ok(visible(repairs).indexOf(SIGNOFF) < visible(repairs).indexOf(ESTIMATE_FAMILY_PS));
});

test("request confirmations and team emails carry no P.S., no adjust note and keep their greeting", () => {
  // Request confirmations: "we have your request", nothing about an estimate.
  const request = buildCustomerEmailHtml(lead, null);
  assertNoEstimateWording("consultation request", request);
  assert.ok(visible(request).includes("Hi Ada,"));
  assert.ok(!visible(request).includes("Hey Ada,"));
  assert.equal(tailAfter(visible(request), SIGNOFF), SHELL_FOOTER, "the request letter still ends at its sign-off");

  for (const intent of ["walkthrough", "consult"] as const) {
    const short = buildLeadConfirmation({ name: "Ada Lovelace", intent });
    assertNoEstimateWording(`short confirmation ${intent} text`, short.text);
    assertNoEstimateWording(`short confirmation ${intent} html`, short.html);
    assert.ok(short.text.startsWith("Hi Ada,\n"));
    assert.ok(short.text.endsWith(SIGNOFF));
    assert.ok(short.text.includes(`Schedule now: ${SCHEDULE_URL}`));
  }

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
    scope: { text: "Kitchen", answers: {}, uploads: [] },
    routing: routeIntake("remodeling", "kitchen", []),
    unresolved: [],
    savedAt: "2099-01-02T12:00:00.000Z",
  } as IntakeSnapshot;
  for (const team of [false, true]) {
    const intake = renderIntakeEmail(snapshot, team, []);
    assertNoEstimateWording(`intake ${team ? "team" : "customer"} text`, intake.text);
    assertNoEstimateWording(`intake ${team ? "team" : "customer"} html`, intake.html);
  }

  // Team emails, with and without an estimate behind them.
  const range = planningRange();
  for (const [label, admin] of [
    ["consultation team, with a range", buildAdminEmailHtml(lead, range)],
    ["consultation team, no range", buildAdminEmailHtml(lead, null)],
  ] as const) {
    assertNoEstimateWording(label, admin);
    assert.doesNotMatch(admin, /Schedule now/);
    assert.ok(!visible(admin).includes("Hey Ada"));
  }
  const internal = estimateEmail("synthetic", { customer: { summary: "Project type: kitchen", range: { low: 100, high: 200 } }, contact: { name: "QA Person" } }, true);
  assertNoEstimateWording("document estimate team text", internal.text);
  assertNoEstimateWording("document estimate team html", internal.html);
  assert.doesNotMatch(internal.text + internal.html, /Schedule now|Hey QA/);
});

test("the schedule button is charcoal, full width, and names the booking page", () => {
  const html = scheduleBlockHtml({ kind: "request", intent: "walkthrough", accent: "#7D9479" });
  const text = scheduleBlockText({ kind: "request", intent: "walkthrough" });
  assert.match(html, /background-color:#383837/);
  assert.match(html, /color:#ffffff/);
  assert.match(html, /v:roundrect/);
  assert.match(html, /width="100%"/);
  assert.match(html, /#7D9479/);
  assert.ok(html.includes(`>${"Schedule now"}<`));
  assert.ok(text.includes(`Schedule now: ${SCHEDULE_URL}`));
  assert.match(text, /choose the 1 hour option for a home walkthrough/);
  assert.match(text, /any estimate we share/);
  assert.equal(banned(`${text}\n${visible(html)}`), false);
});

test("a callback names the 15 minute phone consult and a project names the walkthrough", () => {
  assert.equal(scheduleIntentFor({ requestKind: "callback" }), "consult");
  assert.equal(scheduleIntentFor({ requestKind: "quote" }), "walkthrough");
  assert.equal(scheduleIntentFor({ form: "Site Chat" }), "consult");
  const consult = buildLeadConfirmation({ name: "Ada Lovelace", intent: "consult" });
  const project = buildCustomerEmailHtml(lead, null, undefined, "walkthrough");
  assert.match(consult.text, /choose the 15 minute option for a phone consult/);
  assert.match(htmlToPlainText(project), /choose the 1 hour option for a home walkthrough/);
  assert.equal(consult.subject, "We have your request, Ada");
  assert.equal(buildCustomerSubject({ ...lead, name: "  " }, null), "We have your request, there");
  assert.match(consult.text, new RegExp(SHARED_DISCLAIMER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(banned(`${consult.subject}\n${consult.text}\n${visible(consult.html)}`), false);
});

test("a consultation with a planning range leads with Schedule now and the estimate disclaimer", () => {
  const html = buildCustomerEmailHtml(lead, null);
  assert.ok(html.includes(SCHEDULE_URL));
  assert.match(visible(html), /Schedule now/);
  assert.match(visible(html), /as realistic as we can/);
  assert.match(visible(html), /within your budget/);
  const admin = buildAdminEmailHtml(lead, null);
  assert.doesNotMatch(admin, /Schedule now/);
  assert.doesNotMatch(visible(admin), /as realistic as we can/);
});

test("saved estimate, plans, repairs and intake customer letters carry the button; team letters do not", () => {
  const result = {
    summary: "Project type: kitchen",
    includedCategories: ["Plumbing"],
    range: { low: 100, high: 200 },
    lineItems: [],
    categoryRanges: [],
    assumptions: [],
    exclusions: ["Land"],
    allowances: [],
    factors: [],
    message: "Review your estimate.",
    nextStep: "Consultation",
    disclaimer: "Preliminary only.",
  };
  const customer = estimateEmail("synthetic", { customer: result, contact: { name: "QA Person" } }, false);
  const internal = estimateEmail("synthetic", { customer: result, contact: { name: "QA Person" } }, true);
  assert.match(customer.text, /Schedule now: https:\/\/meetings-na2\.hubspot\.com\/client3/);
  assert.match(customer.text, /choose the 1 hour option/);
  assert.ok(customer.text.includes(ESTIMATE_DISCLAIMER));
  const scheduleAt = customer.html.indexOf(">Schedule now<");
  const viewAt = customer.html.indexOf(">View or update your estimate online<");
  assert.ok(scheduleAt >= 0);
  if (viewAt >= 0) assert.ok(scheduleAt < viewAt);
  assert.doesNotMatch(internal.text + internal.html, /Schedule now/);
  assert.equal(banned(`${customer.text}\n${visible(customer.html)}`), false);

  const plans = buildPlanCustomerEmail(
    {
      name: "Dana Squier",
      email: "dana@example.com",
      phone: "2085550100",
      preferredContact: "email",
      propertyAddress: "2609 N Mountain View",
      projectType: "Kitchen",
      finishLevel: "Mid",
    },
    {
      lead: { range: "$120,000 to $165,000", low: 120000, high: 165000, selections: [], disclaimers: ["This is a planning range, not a quote."] },
      measurements: null,
      statedTotalSqFt: 1714,
      blockers: [],
      notMeasured: [],
    },
  );
  assert.ok(visible(plans).indexOf("Schedule now") < visible(plans).indexOf("$120,000 to $165,000"));
  assert.match(visible(plans), /walk the property/);

  const repairs = buildRe10CustomerEmail(
    {
      name: "Pat Jones",
      email: "pat@example.com",
      phone: "2085551111",
      preferredContact: "email",
      role: "buyer",
      propertyAddress: "12 Oak Ave, Meridian ID",
    },
    { price: 4200, validDays: 30, categories: [], needsOnsite: [], uncertainty: [], assumptions: ["Standard access"] },
  );
  assert.match(visible(repairs), /Schedule now/);
  assert.match(repairs, /firm for the repairs listed/);
  assert.match(visible(repairs), /within your budget/);

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
    scope: { text: "Kitchen", answers: {}, uploads: [] },
    routing: routeIntake("remodeling", "kitchen", []),
    unresolved: [],
    savedAt: "2099-01-02T12:00:00.000Z",
  } as IntakeSnapshot;
  const customerIntake = renderIntakeEmail(snapshot, false, []);
  const teamIntake = renderIntakeEmail(snapshot, true, []);
  assert.ok(customerIntake.text.includes(SCHEDULE_URL));
  assert.match(customerIntake.text, /1 hour option for a home walkthrough/);
  assert.ok(!teamIntake.text.includes(SCHEDULE_URL));
  assert.ok(!teamIntake.html.includes("Schedule now"));
});

test("forms that previously skipped the customer letter now send one confirmation", () => {
  const facebook = readFileSync("app/api/facebook/leadgen/route.ts", "utf8");
  assert.match(facebook, /sendLeadConfirmation\(\{ email, name: fullName, intent: "walkthrough" \}\)/);
  const details = readFileSync("app/api/consultation/details/route.ts", "utf8");
  assert.match(details, /customerEmailJustAdded: Boolean\(merge\.patch\.email\)/);
  const assistant = readFileSync("server/services/assistantLead.ts", "utf8");
  assert.match(assistant, /sendLeadConfirmation/);
  assert.match(assistant, /kind: input\.estimate \? "estimate" : "request"/);
  const consultation = readFileSync("app/api/consultation/route.ts", "utf8");
  assert.match(consultation, /data\.callback \? "consult" : "walkthrough"/);
});
