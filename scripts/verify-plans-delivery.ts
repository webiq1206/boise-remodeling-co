/**
 * Invariants for the plans delivery layer: emails, CRM record, funnel events.
 *
 * The gates have their own suite (`verify:plans`) and the estimator has three.
 * This one guards the boundary where an estimate turns into things people
 * receive, and the expensive mistakes there are disclosure mistakes rather than
 * arithmetic ones. A margin in a customer email is not a rounding error.
 *
 * THE SAME WALL, THE THIRD TIME. The main estimator and the RE-10 flow both
 * enforce it by construction: the customer builder is never handed an object it
 * could leak from. The plans customer email takes a LeadView and never an
 * AdminView, and these checks prove it stays that way against a estimate whose
 * admin side is full of costs.
 */
import {
  buildPlanCustomerEmail,
  buildPlanAdminEmail,
  buildPlanCustomerSubject,
  buildPlanAdminSubject,
  type PlanContact,
} from "../server/services/planEmail";
import { estimateProject } from "../shared/costs";
import { LEAD_FORBIDDEN_PHRASES } from "../shared/costs/outputs";
import { planMeasurements } from "../shared/plans/estimateInput";
import type { PlanExtractionResult } from "../shared/plans/extraction";
import { PLAN_EVENTS, PLAN_FUNNEL } from "../shared/plans/analyticsEvents";
import { UPLOAD_ACCEPT, classifyUpload, isStoredDocumentUrl } from "../shared/re10/uploads";
import fs from "fs";

let checks = 0;
let failures = 0;
const fail = (m: string) => {
  failures++;
  if (failures <= 25) console.log("  FAIL: " + m);
};
const check = (c: boolean, m: string) => {
  checks++;
  if (!c) fail(m);
};

const strip = (h: string) =>
  h.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

/* ---------------------------------------------------------- the fixtures */

const CONTACT: PlanContact = {
  name: "Dana Squier",
  email: "dana@example.com",
  phone: "2085550100",
  preferredContact: "email",
  propertyAddress: "2609 N Mountain View Dr, Boise ID",
  projectType: "Whole home remodel",
  finishLevel: "Mid-range",
  timeline: "Spring",
  notes: "The basement is out of scope.",
};

/** The Squier read, as it arrives once the customer supplies the total. */
const READ: PlanExtractionResult = {
  looksLikePlans: true,
  projectType: "remodel",
  statedTotalSqFt: 1800,
  roomAreaTotalSqFt: 1714,
  rooms: [
    ["Entry", 230],
    ["Kitchen", 303],
    ["Breakfast Room", 207],
    ["Living Room", 277],
    ["Mudroom", 107],
    ["Bedroom 1", 306],
    ["Closet 1", 122],
    ["Bath 1", 117],
    ["Guest Bath", 45],
  ].map(([name, area]) => ({
    name: name as string,
    areaSqFt: area as number,
    areaSource: "printed" as const,
    dimensionText: null,
    ceilingHeightFt: null,
    sheet: "A105",
    inScope: true,
  })),
  counts: [],
  sheetsUsed: ["A103", "A105", "A106"],
  scopeNotes: [],
  warnings: ["The W.C. 1 area tag was not legible at the resolution provided."],
};
READ.rooms.push({
  name: "W.C. 1",
  areaSqFt: null,
  areaSource: "printed",
  dimensionText: null,
  ceilingHeightFt: null,
  sheet: "A105",
  inScope: true,
});

const MEASUREMENTS = planMeasurements(READ);
const ESTIMATE = estimateProject(
  "whole-home",
  { quality: "mid-range", sqft: 1714, interiorPerimeterFt: 490 },
  [
    { label: "Project", value: "Whole home remodel" },
    { label: "Size", value: "1,714 sq ft measured from your drawings" },
  ],
);

const VIEW = {
  measurements: MEASUREMENTS,
  statedTotalSqFt: 1800,
  blockers: [] as string[],
  notMeasured: ["W.C. 1"],
};

/* ------------------------------------------------ 1. the disclosure wall */

console.log("THE DISCLOSURE WALL\n");

const customerHtml = buildPlanCustomerEmail(CONTACT, { lead: ESTIMATE.lead, ...VIEW });
const customerText = strip(customerHtml).toLowerCase();

for (const phrase of LEAD_FORBIDDEN_PHRASES) {
  check(
    !customerText.includes(phrase.toLowerCase()),
    `the customer email contains the forbidden phrase "${phrase}"`,
  );
}

// The specific numbers, not just the vocabulary. A cost can leak without ever
// using the word "cost".
const leakyNumbers = [
  Math.round(ESTIMATE.admin.directCost),
  Math.round(ESTIMATE.admin.totalInternalCost),
  Math.round(ESTIMATE.admin.contingency),
  Math.round(ESTIMATE.admin.grossProfit),
];
for (const n of leakyNumbers) {
  const rendered = n.toLocaleString("en-US");
  check(
    !strip(customerHtml).includes(rendered),
    `the customer email renders the internal figure ${rendered}`,
  );
}

// And it must still say the useful things.
check(customerHtml.includes(ESTIMATE.lead.range), "the customer email does not show the range");
check(customerText.includes("1,714"), "the customer email does not say what we measured");
check(customerText.includes("w.c. 1"), "the customer email drops the room we could not measure");
check(
  customerText.includes("2609 n mountain view"),
  "the customer email does not name the property",
);

/* THE ADMIN EMAIL IS THE OPPOSITE TEST. It has to carry the economics, because
   an estimator who cannot see them cannot judge the job. If this ever stops
   being true, the wall has been built in the wrong place. */
const adminHtml = buildPlanAdminEmail(CONTACT, ESTIMATE.admin, VIEW, {
  documents: [],
  missingAttachments: [],
  warnings: READ.warnings,
  sheetsUsed: READ.sheetsUsed,
});
const adminText = strip(adminHtml);
check(
  adminText.includes(Math.round(ESTIMATE.admin.totalInternalCost).toLocaleString("en-US")),
  "the admin email does not carry the internal cost",
);
check(
  adminText.toLowerCase().includes("margin"),
  "the admin email does not state the margin applied",
);
check(
  adminText.toLowerCase().includes("measured"),
  "the admin email does not say whether the price came from the drawings",
);

/* PROVENANCE HAS TO SURVIVE THE UNMEASURED CASE TOO. Three of the four real
   plan sets do not clear the gates, so this is the common path, not the edge. */
const unmeasuredView = {
  measurements: null,
  statedTotalSqFt: 3487,
  blockers: ["We could only measure 33% of the rooms from these drawings."],
  notMeasured: ["Living Room", "Dining", "Kitchen"],
};
const unmeasuredCustomer = buildPlanCustomerEmail(CONTACT, { lead: ESTIMATE.lead, ...unmeasuredView });
const unmeasuredText = strip(unmeasuredCustomer).toLowerCase();
check(
  unmeasuredText.includes("did not carry enough measurement"),
  "the customer email does not say the price was NOT built from the drawings",
);
check(
  unmeasuredText.includes("33%"),
  "the customer email hides why the drawings were not used",
);
for (const phrase of LEAD_FORBIDDEN_PHRASES) {
  check(
    !unmeasuredText.includes(phrase.toLowerCase()),
    `the unmeasured customer email contains the forbidden phrase "${phrase}"`,
  );
}

const unmeasuredAdmin = buildPlanAdminEmail(CONTACT, ESTIMATE.admin, unmeasuredView, {
  documents: [],
  missingAttachments: ["giant-set.pdf"],
  warnings: [],
  sheetsUsed: [],
});
check(
  strip(unmeasuredAdmin).includes("giant-set.pdf"),
  "a document we failed to attach is not named in the admin email, so it looks like it was included",
);
check(
  strip(unmeasuredAdmin).toLowerCase().includes("stated area"),
  "the admin email does not flag that the number came from a typed figure",
);

/* Subjects carry the property, so a full inbox is still navigable. */
check(
  buildPlanCustomerSubject(CONTACT).includes("2609 N Mountain View"),
  "the customer subject does not name the property",
);
check(
  buildPlanAdminSubject(CONTACT, ESTIMATE.lead.range).includes(ESTIMATE.lead.range),
  "the admin subject does not carry the range",
);
check(
  !LEAD_FORBIDDEN_PHRASES.some((p) => buildPlanCustomerSubject(CONTACT).toLowerCase().includes(p)),
  "the customer subject line leaks internal vocabulary",
);

console.log(`  ${checks} disclosure checks run\n`);

/* ------------------------------------------------------ 2. funnel events */

console.log("FUNNEL EVENTS\n");

const names = Object.values(PLAN_EVENTS);
check(new Set(names).size === names.length, "two funnel events share a name, so the report merges them");
for (const n of names) {
  check(/^plans?_[a-z0-9_]+$/.test(n), `"${n}" is not in the plans_ namespace, so it will not group`);
}
for (const n of PLAN_FUNNEL) {
  check(names.includes(n), `the funnel references "${n}", which is not a declared event`);
}
check(
  PLAN_FUNNEL[0] === PLAN_EVENTS.started,
  "the funnel does not start at the impression, so every rate has the wrong denominator",
);
/* THE ONE EVENT WITHOUT AN RE-10 EQUIVALENT. The square footage question is the
   single input standing between a good read and a tightened price. If it leaves
   the funnel, a leak there becomes invisible. */
check(
  PLAN_FUNNEL.includes(PLAN_EVENTS.totalSqFtSupplied),
  "the square footage step is not in the funnel, so nobody would see it leaking",
);

/* The wizard has to actually fire them. A named constant nothing references is
   a funnel that reports zero forever. */
const wizard = fs.readFileSync("components/plans/PlansWizard.tsx", "utf8");
for (const key of Object.keys(PLAN_EVENTS)) {
  check(
    wizard.includes(`PLAN_EVENTS.${key}`) || key === "consultationRequested",
    `PLAN_EVENTS.${key} is declared but never fired by the wizard`,
  );
}

console.log(`  ${names.length} events, all namespaced and fired\n`);

/* -------------------------------------------------- 3. the upload contract */

console.log("UPLOAD CONTRACT\n");

// One module for both sides, same as the RE-10 flow: a browser check is a
// courtesy, the route is the control, and two copies would drift.
check(UPLOAD_ACCEPT.includes("application/pdf"), "the picker does not accept PDFs, which plan sets are");
check(classifyUpload("A105.pdf", "") === "readable", "a PDF with no declared type is not readable");
check(
  classifyUpload("plans.dwg", "") === "rejected",
  "a DWG is accepted, but nothing downstream can read one",
);
check(
  isStoredDocumentUrl("/api/documents/local/plans%2Fabc%2F0-A105.pdf"),
  "a root-relative stored path is rejected, which is the bug that broke every RE-10 submission",
);

const route = fs.readFileSync("app/api/plans/estimate/route.ts", "utf8");
check(
  route.includes("isStoredDocumentUrl"),
  "the estimate route does not use the shared stored-document rule",
);
/* THE PRICE IS NOT ACCEPTED FROM THE CLIENT. There must be nowhere in the body
   to put one, or a browser could quote itself whatever it liked. */
for (const forbidden of ["price:", "low:", "high:", "range:", "canTightenPrice"]) {
  const inSchema = new RegExp(`\\b${forbidden.replace(":", "")}\\s*:\\s*z\\.`).test(route);
  check(!inSchema, `the estimate request schema accepts "${forbidden}" from the client`);
}
check(
  route.includes("assessPlanQuality") && route.includes("planMeasurements"),
  "the estimate route does not re-run the gates, so a client could skip them",
);

console.log(`  upload and request contract checked\n`);

console.log(
  failures === 0
    ? `verify:plans-delivery: OK (${checks} checks across emails, funnel events and the request contract)`
    : `verify:plans-delivery: FAILED with ${failures} problem(s) across ${checks} checks`,
);
process.exit(failures === 0 ? 0 : 1);
