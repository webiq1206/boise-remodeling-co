import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SITE_CONFIG } from "../shared/siteConfig.ts";
import {
  P5_CONSULTATION_FORM,
  P5_INTAKE_URL,
  P5_PROJECT_TYPE_BY_VISITOR_LABEL,
  P5_REMODEL_BRAND,
  UNMAPPED_P5_PROJECT_TYPES,
  buildP5IntakeBody,
  forwardConsultationToP5Intake,
  p5ProjectType,
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

test("bridge posts once and swallows transport and HTTP failures", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const ok = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true, accepted: true }), { status: 201 });
  };
  await forwardConsultationToP5Intake(
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

  await assert.doesNotReject(() =>
    forwardConsultationToP5Intake(
      { name: "Ada Example", email: "ada@example.com", projectType: "other" },
      async () => {
        throw new Error("network down");
      },
    ),
  );
  await assert.doesNotReject(() =>
    forwardConsultationToP5Intake(
      { name: "Ada Example", email: "ada@example.com", projectType: "other" },
      async () => new Response("no", { status: 500 }),
    ),
  );
});

test("consultation success path schedules the bridge without awaiting it", () => {
  const source = readFileSync(new URL("../app/api/consultation/route.ts", import.meta.url), "utf8");
  const acceptCall = source.indexOf("acceptance = await acceptInquiry");
  const rejected = source.indexOf("if (err instanceof InquiryRejectedError)");
  const duplicateGate = source.indexOf("if (acceptance.duplicate)");
  const bridge = source.indexOf("forwardConsultationToP5Intake(");
  const keptAlive = source.indexOf("after(() => bridge)");
  const resend = source.indexOf("await getUncachableEmailClient");
  const dashboard = source.indexOf("forwardToLeadDashboardAsync(");
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
  assert.ok(resend > bridge, "Resend still runs and is not gated on the bridge");
  assert.doesNotMatch(source, /await\s+forwardConsultationToP5Intake/);
  assert.doesNotMatch(source, /HUBSPOT_TOKEN|@hubspot/);
  assert.match(source, /requestKind: "short"/);
});
