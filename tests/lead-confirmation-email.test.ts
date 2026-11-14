/**
 * Lead confirmation wording and the Schedule now button. No mail is sent.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { estimateEmail } from "../lib/p5/estimateEmail.ts";
import { renderIntakeEmail } from "../lib/p5/intakeEmail.ts";
import { emptyIntakeDetails, type IntakeSnapshot } from "../lib/p5/intakeContract.ts";
import { routeIntake } from "../lib/p5/intakePolicy.ts";
import {
  ESTIMATE_DISCLAIMER,
  SCHEDULE_URL,
  SHARED_DISCLAIMER,
  scheduleBlockHtml,
  scheduleBlockText,
  scheduleIntentFor,
} from "../lib/p5/scheduleEmail.ts";
import { buildCustomerEmailHtml, buildCustomerSubject, buildAdminEmailHtml } from "../server/services/consultationEmail.ts";
import { htmlToPlainText } from "../server/services/emailLayout.ts";
import { buildLeadConfirmation } from "../server/services/leadConfirmation.ts";
import { buildPlanCustomerEmail } from "../server/services/planEmail.ts";
import { buildRe10CustomerEmail } from "../server/services/re10Email.ts";

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
