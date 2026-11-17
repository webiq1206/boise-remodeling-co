import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE_CONFIG } from "../shared/siteConfig.ts";
import {
  P5_CONSULTATION_FORM,
  P5_INTAKE_TIMEOUT_MS,
  P5_INTAKE_URL,
  P5_PROJECT_TYPE_BY_VISITOR_LABEL,
  P5_REMODEL_BRAND,
  TEAM_NOTES_MAX_LINES,
  TEAM_NOTE_MAX_LENGTH,
  UNMAPPED_P5_PROJECT_TYPES,
  buildP5IntakeBody,
  cleanTeamNotes,
  forwardConsultationToP5Intake,
  p5ProjectType,
  readP5TeamAlert,
} from "../server/services/p5IntakeBridge.ts";

/**
 * Values p5 hubspotProjectType keeps at tip 8a33b28c: a HUBSPOT_PROJECT_TYPES
 * member, or a PROJECT_TYPE_ALIASES key. Alias keys are listed because the
 * intake stores the visitor string and HubSpot mapping happens inside p5.
 */
const ACCEPTED_BY_P5 = new Set([
  "kitchen",
  "Kitchen remodel",
  "bathroom",
  "Bathroom remodel",
  "whole-home",
  "Whole-home remodel",
  "addition",
  "Home addition",
  "adu",
  "Accessory dwelling unit (ADU)",
  "Basement finishing",
  "Home repairs or handyman work",
]);

const FORM_VALUES: Record<string, string> = {
  kitchen: "kitchen",
  "Kitchen Remodel": "kitchen",
  bathroom: "bathroom",
  "Bathroom Remodel": "bathroom",
  "whole-home": "whole-home",
  "Whole-Home Remodel": "whole-home",
  addition: "addition",
  "Room Addition": "Home addition",
  adu: "adu",
  "ADU / Guest House": "Accessory dwelling unit (ADU)",
  basement: "Basement finishing",
  "Basement Finishing": "Basement finishing",
  "Home repair or remodel": "Home repairs or handyman work",
  other: "other",
};

test("brand string is the p5 BRANDS value and the live site name", () => {
  assert.equal(P5_REMODEL_BRAND, "Boise Remodeling Co");
  assert.equal(SITE_CONFIG.name, P5_REMODEL_BRAND);
  assert.equal(P5_CONSULTATION_FORM, "Remodeling consultation");
});

test("known consultation choices map onto p5 project types, and unknown ones pass through", () => {
  for (const [slug, expected] of Object.entries(FORM_VALUES)) {
    assert.equal(p5ProjectType(slug), expected, slug);
  }
  for (const label of UNMAPPED_P5_PROJECT_TYPES) {
    assert.equal(p5ProjectType(label), label);
    assert.equal(P5_PROJECT_TYPE_BY_VISITOR_LABEL[label], undefined);
  }
  for (const [from, to] of Object.entries(P5_PROJECT_TYPE_BY_VISITOR_LABEL)) {
    assert.ok(ACCEPTED_BY_P5.has(to), `${from} -> ${to} is not a p5 alias or HubSpot option`);
  }
  assert.equal(p5ProjectType("  kitchen  "), "kitchen");
  assert.equal(p5ProjectType("Home repairs or handyman work"), "Home repairs or handyman work");
  assert.equal(p5ProjectType("Mystery wing"), "Mystery wing");
  assert.equal(p5ProjectType(""), null);
});

test("intake body uses the fields the p5 route already reads", () => {
  const body = buildP5IntakeBody({
    name: "  Ada Example  ",
    email: "ada@example.com",
    phone: "(208) 555-0100",
    address: "123 Main St",
    city: "Boise",
    zip: "83702",
    projectType: "Room Addition",
    message: "Add a bedroom over the garage.",
    inquiryId: "11111111-1111-4111-8111-111111111111",
  });
  assert.deepEqual(body, {
    brand: "Boise Remodeling Co",
    name: "Ada Example",
    form: P5_CONSULTATION_FORM,
    source: "Organic Website",
    sourceDetail: "boiseremodeling.co consultation",
    projectType: "Home addition",
    email: "ada@example.com",
    phone: "(208) 555-0100",
    address: "123 Main St, 83702",
    city: "Boise",
    summary: "Visitor project: Room Addition\n\nAdd a bedroom over the garage.",
    externalLeadId: "boiseremodeling-consultation:11111111-1111-4111-8111-111111111111",
    // Quote form v2 contract: the same id as external_id, and this is the first submission.
    external_id: "boiseremodeling-consultation:11111111-1111-4111-8111-111111111111",
    submission_kind: "initial",
    // One team email per request: p5 is asked to confirm its own team email on every post.
    team_alert: "confirm",
  });
});

test("a junk optional phone is left off when the email can still be stored", () => {
  const body = buildP5IntakeBody({
    name: "Ada Example",
    email: "ada@example.com",
    phone: "555",
    projectType: "other",
    message: "Not sure yet.",
  });
  assert.equal(body.email, "ada@example.com");
  assert.equal(body.phone, undefined);
  assert.equal(body.projectType, "other");
  assert.equal(body.summary, "Not sure yet.");
});

test("the short home-hero project type maps to the handyman alias and omits a blank address", () => {
  const body = buildP5IntakeBody({
    name: "Ada Example",
    email: "ada@example.com",
    phone: "2085550100",
    projectType: "Home repair or remodel",
    message: "The hallway door sticks.",
    inquiryId: "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(body.email, "ada@example.com");
  assert.equal(body.phone, "2085550100");
  assert.equal(body.address, undefined);
  assert.equal(body.projectType, "Home repairs or handyman work");
  assert.equal(body.form, "Remodeling consultation");
  assert.equal(body.externalLeadId, "boiseremodeling-consultation:22222222-2222-4222-8222-222222222222");
  assert.match(body.summary, /Visitor project: Home repair or remodel/);
  assert.match(body.summary, /The hallway door sticks\./);
});

test("bridge posts once, swallows transport and HTTP failures, and reports them as unknown", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const ok = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true, accepted: true }), { status: 201 });
  };
  const forwarded = await forwardConsultationToP5Intake(
    { name: "Ada Example", email: "ada@example.com", projectType: "basement" },
    ok,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, P5_INTAKE_URL);
  assert.equal(calls[0].init.method, "POST");
  const sent = JSON.parse(String(calls[0].init.body));
  assert.equal(sent.brand, "Boise Remodeling Co");
  assert.equal(sent.projectType, "Basement finishing");
  assert.equal(sent.form, "Remodeling consultation");
  assert.equal(sent.source, "Organic Website");
  assert.equal(sent.sourceDetail, "boiseremodeling.co consultation");
  // An older p5 answers without `alert`: forwarded, but its team email is not confirmed.
  assert.deepEqual(forwarded, { forwarded: true, alert: "unknown" });

  const thrown = await forwardConsultationToP5Intake(
    { name: "Ada Example", email: "ada@example.com", projectType: "other" },
    async () => {
      throw new Error("network down");
    },
  );
  assert.deepEqual(thrown, { forwarded: false, alert: "unknown" });
  // An HTTP error confirms nothing, even when its body claims the email went.
  const rejected = await forwardConsultationToP5Intake(
    { name: "Ada Example", email: "ada@example.com", projectType: "other" },
    async () => new Response(JSON.stringify({ alert: "sent" }), { status: 500 }),
  );
  assert.deepEqual(rejected, { forwarded: false, alert: "unknown" });
});

test("every post asks p5 to confirm its team email and carries well-formed team notes", () => {
  const input = { name: "Ada Example", phone: "2085550100", inquiryId: "33333333-3333-4333-8333-333333333333" };
  for (const submissionKind of ["initial", "details"] as const) {
    const body = buildP5IntakeBody({ ...input, submissionKind });
    assert.equal(body.team_alert, "confirm", submissionKind);
    assert.equal(body.team_notes, undefined, "no notes: the field is left off");
  }
  const body = buildP5IntakeBody({
    ...input,
    teamNotes: [
      "Lead dashboard: https://leads.boiseremodeling.co",
      "  Planning range shown to the visitor:   $48,000 to $62,000  ",
      "Two\nlines:\tone note",
      "",
      "   ",
      `Long: ${"x".repeat(400)}`,
    ],
  });
  assert.deepEqual((body.team_notes as string[]).slice(0, 3), [
    "Lead dashboard: https://leads.boiseremodeling.co",
    "Planning range shown to the visitor: $48,000 to $62,000",
    "Two lines: one note",
  ]);
  const notes = body.team_notes as string[];
  assert.equal(notes.length, 4, "blank lines are dropped");
  assert.equal(notes[3].length, TEAM_NOTE_MAX_LENGTH);
  assert.ok(notes[3].endsWith("..."));
  assert.equal(TEAM_NOTES_MAX_LINES, 40);
  assert.equal(TEAM_NOTE_MAX_LENGTH, 300);

  const many = cleanTeamNotes(Array.from({ length: 55 }, (_, index) => `Line ${index + 1}: value`));
  assert.equal(many.length, 40);
  assert.equal(many[39], "Line 40: value", "the first 40 lines are kept, in order");
  assert.ok(many.every((line) => line.length <= 300 && !/[\r\n\t]/.test(line)));
  assert.deepEqual(cleanTeamNotes([null, 12, { a: 1 }, "Kept: yes"]), ["Kept: yes"], "only strings travel");
  // Costs and margins stay out of HubSpot, and the p5 team email is copied there: a line that
  // names one never leaves this site (tests/team-email-fallback.test.ts has the full proof).
  assert.deepEqual(
    cleanTeamNotes(["Our cost: $5,649", "Gross margin: 30%", "Markup: 42.9%", "Gross profit: $5,819", "Contingency: $1,234", "Overhead: $900", "Planning range shown to the visitor: $48,000 to $62,000"]),
    ["Planning range shown to the visitor: $48,000 to $62,000"],
  );
  assert.deepEqual(cleanTeamNotes(null), []);
});

test("the p5 answer is read defensively: only the three contract values count", async () => {
  assert.equal(readP5TeamAlert({ alert: "sent" }), "sent");
  assert.equal(readP5TeamAlert({ alert: "failed" }), "failed");
  assert.equal(readP5TeamAlert({ alert: "none" }), "none");
  for (const answer of [undefined, null, "sent", 1, [], ["sent"], {}, { alert: "Sent" }, { alert: " sent" }, { alert: true }, { alert: { status: "sent" } }, { alert: ["sent"] }, { team_alert: "sent" }]) {
    assert.equal(readP5TeamAlert(answer), "unknown", JSON.stringify(answer));
  }

  const input = { name: "Ada Example", phone: "2085550100", projectType: "kitchen" };
  const answer = (text: string, status = 200) => async () => new Response(text, { status });
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer('{"ok":true,"accepted":true,"alert":"sent"}', 201)), { forwarded: true, alert: "sent" });
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer('{"ok":true,"alert":"failed"}')), { forwarded: true, alert: "failed" });
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer('{"ok":true,"alert":"none"}')), { forwarded: true, alert: "none" });
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer('{"ok":true}')), { forwarded: true, alert: "unknown" }, "an older p5");
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer('{"alert":"SENT"}')), { forwarded: true, alert: "unknown" });
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer("<html>sent</html>")), { forwarded: true, alert: "unknown" }, "not JSON");
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer("")), { forwarded: true, alert: "unknown" }, "an empty answer");
  assert.deepEqual(await forwardConsultationToP5Intake(input, answer('{"alert":"sent"}', 422)), { forwarded: false, alert: "unknown" });
});

test("the bridge waits 30 seconds for p5, and a timeout is unknown, never thrown", async () => {
  assert.equal(P5_INTAKE_TIMEOUT_MS, 30_000);
  const source = readFileSync(new URL("../server/services/p5IntakeBridge.ts", import.meta.url), "utf8");
  assert.match(source, /timeoutMs: number = P5_INTAKE_TIMEOUT_MS/);
  assert.match(source, /signal: AbortSignal\.timeout\(timeoutMs\)/);
  assert.doesNotMatch(source, /AbortSignal\.timeout\(10_000\)/);

  // A p5 that never answers: the request is aborted by the bridge's own signal.
  // (The timeout signal's timer does not hold the event loop open on its own, as a
  // real socket would, so the fake request holds it.)
  let aborted = false;
  const never = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const open = setTimeout(() => reject(new Error("the bridge never aborted")), 4_000);
      init.signal?.addEventListener("abort", () => {
        clearTimeout(open);
        aborted = true;
        reject(init.signal?.reason ?? new Error("aborted"));
      });
    });
  const started = Date.now();
  const result = await forwardConsultationToP5Intake({ name: "Ada Example", phone: "2085550100" }, never, 25);
  assert.deepEqual(result, { forwarded: false, alert: "unknown" });
  assert.equal(aborted, true);
  assert.ok(Date.now() - started < 5_000);
});

test("the visitor response and the customer email never wait on the bridge; only the team email does, inside after()", () => {
  // Code only: the comments in the route explain this rule and name the bridge freely.
  const source = readFileSync(new URL("../app/api/consultation/route.ts", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const acceptCall = source.indexOf("acceptance = await acceptInquiry");
  const rejected = source.indexOf("if (err instanceof InquiryRejectedError)");
  const duplicateGate = source.indexOf("if (acceptance.duplicate)");
  const bridge = source.indexOf("bridge = forwardConsultationToP5Intake(");
  const keptAlive = source.indexOf("after(() => bridge)");
  const dashboard = source.indexOf("forwardToLeadDashboardAsync(");
  const customerEmail = source.indexOf("buildCustomerEmailHtml(");
  const teamEmail = source.indexOf("const teamEmail = sendSiteTeamEmail({");
  const teamEmailScheduled = source.indexOf("after(() => teamEmail)");
  const adminHtml = source.indexOf("buildAdminEmailHtml(");
  const response = source.lastIndexOf("return NextResponse.json({");
  const duplicateReturnEnd = source.indexOf("});", duplicateGate);
  assert.ok(acceptCall >= 0 && bridge > acceptCall, "bridge runs only after acceptInquiry");
  assert.ok(rejected >= 0 && rejected < duplicateGate && duplicateGate < bridge, "bridge is after reject and duplicate returns");
  assert.ok(duplicateReturnEnd > duplicateGate && duplicateReturnEnd < bridge, "duplicate return finishes before the bridge");
  assert.equal(source.slice(rejected, duplicateGate).includes("forwardConsultationToP5Intake"), false);
  assert.match(source.slice(duplicateGate, duplicateReturnEnd), /return NextResponse\.json/);
  assert.equal(source.slice(duplicateGate, duplicateReturnEnd).includes("after("), false);
  assert.equal(source.slice(duplicateGate, duplicateReturnEnd).includes("forwardConsultationToP5Intake"), false);
  assert.ok(keptAlive > bridge, "bridge is kept alive with after(), not awaited");
  assert.ok(dashboard > bridge, "BRC dashboard forward still runs and is not the bridge");

  // The visitor's path: nothing awaits the bridge, anywhere in the route.
  assert.doesNotMatch(source, /await\s+forwardConsultationToP5Intake/);
  assert.doesNotMatch(source, /await\s+bridge\b/);
  assert.doesNotMatch(source, /await\s+teamEmail\b/);
  assert.doesNotMatch(source, /await\s+sendSiteTeamEmail/);
  assert.doesNotMatch(source, /bridge\s*\.then\(/);

  // The customer email is sent on the visitor's path, before the team email is even
  // set up, and the bridge appears nowhere in it.
  assert.ok(customerEmail > bridge && customerEmail < teamEmail, "customer email runs before the team email is set up");
  assert.equal(/\bbridge\b/.test(source.slice(dashboard, teamEmail)), false, "nothing between the dashboard forward and the team email reads the bridge");

  // The team email: handed the bridge, built only inside the fallback, kept alive
  // with after(), and the response is returned without waiting for it.
  assert.ok(teamEmail > bridge && teamEmailScheduled > teamEmail && response > teamEmailScheduled);
  assert.match(source.slice(teamEmail, teamEmailScheduled), /\bbridge,/);
  assert.ok(adminHtml > teamEmail && adminHtml < teamEmailScheduled, "the team email is built only inside the fallback");
  assert.equal(source.indexOf("buildAdminEmailHtml(", adminHtml + 1), -1, "one place builds the team email");
  assert.equal(source.indexOf("getAdminRecipientEmails(SITE_CONFIG.email)") > teamEmail, true, "recipients are resolved inside the fallback");
  assert.equal(/\bteamEmail\b/.test(source.slice(teamEmailScheduled + "after(() => teamEmail)".length)), false, "the response does not read the team email");

  assert.doesNotMatch(source, /HUBSPOT_TOKEN|@hubspot/);
  assert.match(source, /requestKind: "short"/);
});

test("step 2 runs wholly inside after(): its team email waits for the bridge, the visitor does not", () => {
  const route = readFileSync(new URL("../app/api/consultation/details/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(route, /await\s+deliverRequestDetails/);
  assert.doesNotMatch(route, /await\s+delivery\b/);
  assert.match(route, /after\(\(\) => delivery\)/);
  const delivery = readFileSync(new URL("../server/services/requestDetailsDelivery.ts", import.meta.url), "utf8");
  assert.match(delivery, /sendDetailsEmail\(input, p5\)/, "the details email is handed the bridge call");
  assert.match(delivery, /await sendSiteTeamEmail\(\{\s*bridge,/);
  assert.equal(delivery.match(/client\.emails\.send\(/g)?.length, 1, "one place sends the team's details email");
  assert.ok(delivery.indexOf("client.emails.send(") > delivery.indexOf("await sendSiteTeamEmail({"), "and it is inside the fallback");
});
