import test from "node:test";
import assert from "node:assert/strict";

/**
 * One team email per request (owner, 17 November 2026). The p5 "New lead" email is the team
 * email; this site's own is the fallback, sent to the shared family inbox only when p5 did not
 * confirm that its email went. A lead must never end with zero team emails.
 *
 * These drive the real bridge (with a fake fetch) into the real fallback (with a fake mail
 * transport). The route-level proof, through the real POST handlers, is in
 * scripts/verify-estimate-routes.ts.
 */

import {
  P5_ESTIMATE_MAX_LINES,
  TEAM_INTERNAL_NOTES_MAX_LINES,
  TEAM_NOTES_MAX_LINES,
  TEAM_NOTE_BLOCKED,
  TEAM_NOTE_MAX_LENGTH,
  buildP5IntakeBody,
  cleanP5Estimate,
  cleanTeamInternalNotes,
  cleanTeamNotes,
  forwardConsultationToP5Intake,
} from "../server/services/p5IntakeBridge.ts";
import {
  SHARED_FAMILY_INBOX_DOMAINS,
  isSharedFamilyInbox,
  sendSiteTeamEmail,
  siteTeamEmailRecipients,
} from "../server/services/teamEmailFallback.ts";
import { buildAdminEmailHtml, buildConsultationP5Estimate, buildConsultationTeamInternalNotes, buildConsultationTeamNotes, formatUsd, type VerifiedEstimate } from "../server/services/consultationEmail.ts";
import { escapeHtml } from "../server/services/emailLayout.ts";
import { readFileSync } from "node:fs";
import { calculateEstimate, getProjectSizeConfig, EMPTY_REFINEMENTS, type EstimateRefinements } from "../shared/estimateEngine.ts";
import { resolveInternalEstimate, resolveQuotedRange } from "../shared/costs/resolve.ts";

const SHARED = "hello@boiseremodeling.co";
const OWNER = "owner@example.com";
const input = { name: "Ada Example", phone: "2085550100", projectType: "kitchen" };

/** A fake mail transport that records who the site's team email went to. */
function transport(options: { failFor?: string; throwFor?: string } = {}) {
  const sent: string[] = [];
  let opened = 0;
  return {
    sent,
    opened: () => opened,
    open: async () => {
      opened += 1;
      return async (to: string) => {
        if (to === options.throwFor) throw new Error("provider did not accept the message");
        if (to === options.failFor) return { error: { message: "rejected" } };
        sent.push(to);
        return { data: { id: "email-1" }, error: null };
      };
    },
  };
}

const answers = (text: string, status = 200) => async () => new Response(text, { status });

test("the shared family inbox is hello@ at any family domain, in any letter case", () => {
  assert.deepEqual([...SHARED_FAMILY_INBOX_DOMAINS].sort(), [
    "boiseadu.co",
    "boisecabinet.co",
    "boiseconstruction.co",
    "boisehandyman.co",
    "boiseremodeling.co",
    "p5homeco.com",
  ]);
  for (const domain of SHARED_FAMILY_INBOX_DOMAINS) {
    assert.equal(isSharedFamilyInbox(`hello@${domain}`), true, domain);
    assert.equal(isSharedFamilyInbox(`  HELLO@${domain.toUpperCase()} `), true, domain);
    assert.equal(isSharedFamilyInbox(`Boise Remodeling Co <Hello@${domain}>`), true, domain);
  }
  // Anything else is another recipient, and another recipient is always emailed.
  for (const other of [
    "owner@example.com",
    "nick@boiseremodeling.co",
    "hello@example.com",
    "hello@mail.boiseremodeling.co",
    "hello@boiseremodeling.com",
    "hello+leads@boiseremodeling.co",
    "sayhello@boiseremodeling.co",
    "hello@boiseremodeling.co.evil.example",
    "hello",
    "@boiseremodeling.co",
    "",
    null,
    undefined,
  ]) {
    assert.equal(isSharedFamilyInbox(other), false, String(other));
  }
});

test("only a confirmed p5 email takes the shared inbox off the list", () => {
  const recipients = [SHARED, OWNER, "Hello@P5HomeCo.com"];
  assert.deepEqual(siteTeamEmailRecipients(recipients, "sent"), [OWNER]);
  for (const alert of ["failed", "none", "unknown"] as const) {
    assert.deepEqual(siteTeamEmailRecipients(recipients, alert), recipients, alert);
  }
  assert.deepEqual(siteTeamEmailRecipients([SHARED], "sent"), []);
});

test("p5 confirmed its email: the shared inbox is skipped, another admin recipient is still emailed", async () => {
  const mail = transport();
  const outcome = await sendSiteTeamEmail({
    bridge: forwardConsultationToP5Intake(input, answers('{"ok":true,"accepted":true,"alert":"sent"}', 201)),
    recipients: async () => [SHARED, OWNER],
    open: mail.open,
    label: "test",
  });
  assert.deepEqual(mail.sent, [OWNER]);
  assert.deepEqual(outcome, { status: "sent", alert: "sent", sentTo: [OWNER] });

  // The shared inbox alone (this site's list today): nothing is sent, and no transport is opened.
  const alone = transport();
  const skipped = await sendSiteTeamEmail({
    bridge: forwardConsultationToP5Intake(input, answers('{"alert":"sent"}')),
    recipients: async () => [SHARED],
    open: alone.open,
    label: "test",
  });
  assert.deepEqual(alone.sent, []);
  assert.equal(alone.opened(), 0);
  assert.deepEqual(skipped, { status: "skipped", alert: "sent", sentTo: [] });
});

test("anything short of a confirmation sends the site's team email to everyone", async () => {
  const hangsUntilAborted = (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      const open = setTimeout(() => reject(new Error("the bridge never aborted")), 4_000);
      init.signal?.addEventListener("abort", () => {
        clearTimeout(open);
        reject(init.signal?.reason ?? new Error("aborted"));
      });
    });
  const cases: Array<{ name: string; bridge: () => PromiseLike<{ forwarded: boolean; alert: string }> | null; alert: string }> = [
    { name: "p5 says its email failed", bridge: () => forwardConsultationToP5Intake(input, answers('{"ok":true,"alert":"failed"}')), alert: "failed" },
    { name: "p5 sent no email for this post", bridge: () => forwardConsultationToP5Intake(input, answers('{"ok":true,"alert":"none"}')), alert: "none" },
    { name: "an older p5 with no alert field", bridge: () => forwardConsultationToP5Intake(input, answers('{"ok":true,"accepted":true}')), alert: "unknown" },
    { name: "an alert value outside the contract", bridge: () => forwardConsultationToP5Intake(input, answers('{"alert":"queued"}')), alert: "unknown" },
    { name: "an HTTP error", bridge: () => forwardConsultationToP5Intake(input, answers('{"alert":"sent"}', 503)), alert: "unknown" },
    { name: "a thrown fetch", bridge: () => forwardConsultationToP5Intake(input, async () => { throw new Error("network down"); }), alert: "unknown" },
    { name: "a timeout", bridge: () => forwardConsultationToP5Intake(input, hangsUntilAborted, 25), alert: "unknown" },
    { name: "a bridge promise that rejects", bridge: () => Promise.reject(new Error("bridge threw")), alert: "unknown" },
    { name: "a bridge that was never called", bridge: () => null, alert: "unknown" },
    { name: "a bridge result with no alert", bridge: () => Promise.resolve({ forwarded: true } as never), alert: "unknown" },
  ];
  for (const scenario of cases) {
    const mail = transport();
    const outcome = await sendSiteTeamEmail({
      bridge: scenario.bridge() as never,
      recipients: async () => [SHARED, OWNER],
      open: mail.open,
      label: "test",
    });
    assert.deepEqual(mail.sent, [SHARED, OWNER], scenario.name);
    assert.deepEqual(outcome, { status: "sent", alert: scenario.alert, sentTo: [SHARED, OWNER] }, scenario.name);
  }
});

test("the team email waits for the bridge, and never throws when the mail transport fails", async () => {
  // Nothing is sent until p5 has answered.
  let release: (response: Response) => void = () => {};
  const pending = new Promise<Response>((resolve) => {
    release = resolve;
  });
  const mail = transport();
  const running = sendSiteTeamEmail({
    bridge: forwardConsultationToP5Intake(input, () => pending),
    recipients: async () => [SHARED],
    open: mail.open,
    label: "test",
  });
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.deepEqual(mail.sent, [], "undecided while p5 has not answered");
  assert.equal(mail.opened(), 0);
  release(new Response('{"alert":"failed"}', { status: 200 }));
  assert.deepEqual((await running).sentTo, [SHARED]);

  // One recipient failing does not stop the next, and the outcome says failed.
  const partial = transport({ failFor: SHARED });
  const failed = await sendSiteTeamEmail({ bridge: null, recipients: async () => [SHARED, OWNER], open: partial.open, label: "test" });
  assert.deepEqual(partial.sent, [OWNER]);
  assert.equal(failed.status, "failed");
  assert.deepEqual(failed.sentTo, [OWNER]);
  assert.match(String(failed.error), /rejected/);

  const throwing = transport({ throwFor: SHARED });
  const thrown = await sendSiteTeamEmail({ bridge: null, recipients: async () => [SHARED, OWNER], open: throwing.open, label: "test" });
  assert.deepEqual(throwing.sent, [OWNER]);
  assert.equal(thrown.status, "failed");

  // No transport at all, or no recipient list: reported as failed, so the delivery retry picks it up.
  const noTransport = await sendSiteTeamEmail({
    bridge: null,
    recipients: async () => [SHARED],
    open: async () => { throw new Error("Email delivery is not configured"); },
    label: "test",
  });
  assert.deepEqual(noTransport, { status: "failed", alert: "unknown", sentTo: [], error: "Email delivery is not configured" });
  const noList = await sendSiteTeamEmail({
    bridge: null,
    recipients: async () => { throw new Error("recipients unavailable"); },
    open: transport().open,
    label: "test",
  });
  assert.equal(noList.status, "failed");
});

const PROJECTS = ["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"] as const;
const FINISHES = ["refresh", "mid-range", "high-end", "luxury"] as const;

function estimateFor(project: (typeof PROJECTS)[number], finish: (typeof FINISHES)[number], sqft: number): VerifiedEstimate {
  const refinements = {
    ...EMPTY_REFINEMENTS,
    layoutChanges: "major",
    plumbingElectrical: "full",
    cabinetTier: "custom",
    fixtureCount: 5,
    bathroomCount: 3,
    kitchenIncluded: true,
    stories: 2,
    aduConfig: "detached",
  } as EstimateRefinements;
  const guide = calculateEstimate({ project, finish, sqft, refinements }, 3);
  const range = resolveQuotedRange(project, finish, sqft, refinements) ?? guide;
  return {
    project,
    finish,
    sqft,
    priceLow: range.priceLow,
    priceHigh: range.priceHigh,
    roi: guide.roi,
    confidence: guide.confidenceLabel,
    refinements,
    included: guide.included,
    layoutLabel: "L-Shape",
    upgradeLabels: ["Cabinets", "Counters"],
    statedBudget: Math.round(range.priceLow * 0.8),
  };
}

const profile = {
  county: "ada" as const,
  parcelId: "R1234567890",
  lotSizeSqFt: 8276,
  lotSizeAcres: 0.19,
  zoning: "R-1C",
  zoningCategory: "Residential",
  subdivision: "Example Subdivision No. 2",
  ownerName: "EXAMPLE JORDAN",
  ownerOccupied: true,
  assessedValue: 512300,
  permittingAuthority: "City of Boise Planning and Development Services",
  jurisdiction: "Boise",
};

const attribution = {
  version: 1 as const,
  consent: "granted" as const,
  first: { at: 1, landingPage: "https://boiseremodeling.co/kitchen-remodeling-boise", utm_source: "google", utm_medium: "cpc", utm_campaign: "kitchens", gclid: "abc123" },
  latest: { at: 2, landingPage: "https://boiseremodeling.co/", utm_source: "google", utm_medium: "cpc", utm_campaign: "kitchens", gclid: "abc123" },
};

test("team notes carry what the visitor was shown and priced at, as Label: value lines", () => {
  const estimate = estimateFor("kitchen", "mid-range", 180);
  const notes = buildConsultationTeamNotes({ estimate, profile, pricingAlerts: ["recompute-mismatch"], attribution, requestId: "7d1c3f7e-0000-4000-8000-000000000001" });
  const text = notes.join("\n");
  assert.equal(notes[0], "Lead dashboard: https://leads.boiseremodeling.co");
  assert.equal(notes[1], "Website request id: 7d1c3f7e-0000-4000-8000-000000000001");
  assert.match(notes[2], /^Planning range shown to the visitor: \$[\d,]+ to \$[\d,]+ \(.+\), typical resale ROI about \d+%$/);
  assert.match(text, /^Their budget: \$[\d,]+\. Your target sits below this range\./m);
  assert.match(text, /^Selections: Layout \/ type: L-Shape; Approx\. size: 180 sq ft; Upgrading: Cabinets, Counters; Finish level: /m);
  // Pricing alerts are counted, never named.
  assert.match(text, /^Pricing alerts: 1$/m);
  assert.doesNotMatch(text, /recompute-mismatch/);
  // The price of each trade: the admin email's "Customer" column, one line each.
  const admin = resolveInternalEstimate(estimate.project, estimate.finish, estimate.sqft, estimate.refinements)!.admin;
  const trades = notes.filter((line) => line.startsWith("Price by trade, "));
  assert.equal(trades.length, admin.trades.length, "one line per trade");
  assert.ok(trades.length >= 8);
  admin.trades.forEach((trade, index) => {
    assert.ok(trades[index].startsWith(`Price by trade, ${trade.division}: ${formatUsd(trade.customerAmount)}`), trades[index]);
  });
  // The county record and the permitting authority.
  assert.match(text, /^County record: Parcel: R1234567890; Zoning: R-1C \(Residential\); Lot: 0\.19 acres \(8,276 sq ft\); Assessed value: \$512,300; Owner of record: EXAMPLE JORDAN; /m);
  assert.match(text, /^Permits: City of Boise Planning and Development Services$/m);
  assert.match(text, /^Marketing source: paid, google; campaign kitchens; Google Ads click ID on file$/m);
  assert.match(text, /^Landing page: https:\/\/boiseremodeling\.co\/kitchen-remodeling-boise$/m);
  // Never what the bridge already sends as its own fields.
  assert.doesNotMatch(text, /^(Name|Phone|Email|Address|Project type|Message|Timing|Files):/m);
  assert.doesNotMatch(text, /Selections: Project type/);

  // No planning range, no county record, no attribution: the dashboard link alone.
  assert.deepEqual(buildConsultationTeamNotes({ estimate: null }), ["Lead dashboard: https://leads.boiseremodeling.co"]);
  assert.deepEqual(buildConsultationTeamNotes({ estimate: null, profile: {}, pricingAlerts: ["zero-total"] }), ["Lead dashboard: https://leads.boiseremodeling.co"]);
});

/**
 * Costs and margins stay out of HubSpot, and the p5 team email is copied into HubSpot with its
 * full body. So no team note may carry our cost, a margin, a markup, a profit, a contingency or
 * an overhead figure. Checked by VALUE as well as by word, so rewording a line cannot pass.
 */
test("team notes never carry a cost, margin, markup, profit, contingency or overhead figure", () => {
  const dollars = (line: string) => line.match(/\$[\d,]+/g) ?? [];
  let checked = 0;
  let totals = 0;
  let proved = 0;
  for (const project of PROJECTS) {
    const size = getProjectSizeConfig(project);
    for (const finish of FINISHES) {
      for (const sqft of [size.min, Math.round((size.min + size.max) / 2), size.max]) {
        const estimate = estimateFor(project, finish, sqft);
        const where = `${project} ${finish} ${sqft}`;
        const admin = resolveInternalEstimate(estimate.project, estimate.finish, estimate.sqft, estimate.refinements)!.admin;
        const notes = buildConsultationTeamNotes({
          estimate,
          profile,
          pricingAlerts: ["recompute-mismatch", "implausible-total"],
          attribution,
          requestId: "isolated-1",
        });
        const text = notes.join("\n");

        // By word: nothing the builder writes names one of them, so the bridge's wall drops nothing.
        for (const line of notes) assert.equal(TEAM_NOTE_BLOCKED.test(line), false, `${where}: ${line}`);
        assert.doesNotMatch(text, /\bcost|margin|mark-?up|profit|contingenc|overhead|internal/i, where);
        assert.doesNotMatch(text, /\d\s?%\s*(gross|net)|\dx to \d/i, `${where}: no margin or range-basis line`);

        // By value: every dollar figure in the notes is one the visitor was shown or priced at.
        const allowed = new Set<string>([
          formatUsd(estimate.priceLow),
          formatUsd(estimate.priceHigh),
          formatUsd(estimate.statedBudget ?? 0),
          formatUsd(profile.assessedValue),
          ...admin.trades.map((trade) => formatUsd(trade.customerAmount)),
        ]);
        for (const line of notes) {
          for (const amount of dollars(line)) assert.ok(allowed.has(amount), `${where}: ${amount} is not a visitor-facing figure: ${line}`);
        }
        // Each trade line carries its price and only its price: never the cost beside it.
        const trades = notes.filter((line) => line.startsWith("Price by trade, "));
        assert.equal(trades.length, admin.trades.length, where);
        admin.trades.forEach((trade, index) => {
          assert.deepEqual(dollars(trades[index]), [formatUsd(trade.customerAmount)], `${where}: ${trades[index]}`);
        });
        // The internal totals appear nowhere, under any label. (A total that happens to
        // equal a visitor-facing figure cannot be told apart by value, so it is not counted.)
        for (const [label, value] of [
          ["total internal cost", admin.totalInternalCost],
          ["direct cost", admin.directCost],
          ["contingency", admin.contingency],
          ["gross profit", admin.grossProfit],
        ] as const) {
          totals += 1;
          if (allowed.has(formatUsd(value))) continue;
          assert.equal(text.includes(formatUsd(value)), false, `${where}: ${label} is in the team notes`);
          proved += 1;
        }
        assert.equal(text.includes(admin.marginLabel), false, where);
        assert.equal(text.includes(admin.rangeLabel), false, where);
        // Alerts and warnings are a count, never their wording.
        assert.match(text, new RegExp(`^Pricing alerts: ${2 + admin.warnings.length}$`, "m"), where);
        for (const warning of admin.warnings) assert.equal(text.includes(warning.message), false, where);
        assert.doesNotMatch(text, /recompute-mismatch|implausible-total/, where);

        // The fixture is real: the site's own team email (the fallback) does carry these figures.
        if (checked === 0) {
          const html = buildAdminEmailHtml({ name: "Ada Example", phone: "2085550100", email: "", address: "", projectType: project }, estimate, profile);
          assert.ok(html.includes("Our cost") && html.includes("Gross profit") && html.includes(formatUsd(admin.totalInternalCost)));
        }
        checked += 1;
      }
    }
  }
  assert.equal(checked, PROJECTS.length * FINISHES.length * 3);
  assert.ok(proved >= totals * 0.9, `the by-value check ran for ${proved} of ${totals} internal totals`);
});

test("the bridge is the wall behind the builder: a line that names a cost or margin never leaves the site", () => {
  const leaked = [
    "Internal cost: $13,577 (direct $12,343, contingency $1,234)",
    "Gross profit: $5,819",
    "Margin: 30%",
    "Markup: 42.9%",
    "Mark-up: 42.9%",
    "Contingency: $1,234",
    "Overhead: $900",
    "Trade, CABINETRY: our cost $5,649, customer $8,877",
    "Needs review: GROSS MARGIN trimmed to stay within the market ceiling",
    "Pricing alerts: below-margin-floor",
  ];
  assert.deepEqual(cleanTeamNotes(leaked), []);
  const kept = ["Lead dashboard: https://leads.boiseremodeling.co", "Planning range shown to the visitor: $48,000 to $62,000", "Price by trade, CABINETRY: $8,877 (16 LF)", "Pricing alerts: 2"];
  assert.deepEqual(cleanTeamNotes([leaked[0], kept[0], leaked[1], kept[1], kept[2], leaked[8], kept[3]]), kept);
  const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", teamNotes: [...leaked, kept[0]] });
  assert.deepEqual(body.team_notes, [kept[0]]);
  assert.equal(JSON.stringify(body).toLowerCase().includes("margin"), false);
  assert.equal(buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", teamNotes: leaked }).team_notes, undefined, "nothing left: the field is left off");
});

test("team notes fit the p5 limits for every project, finish and size, with nothing cut", () => {
  let fullest = 0;
  for (const project of PROJECTS) {
    const size = getProjectSizeConfig(project);
    for (const finish of FINISHES) {
      for (const sqft of [size.min, Math.round((size.min + size.max) / 2), size.max]) {
        const notes = buildConsultationTeamNotes({
          estimate: estimateFor(project, finish, sqft),
          profile,
          pricingAlerts: ["recompute-mismatch", "estimate-unresolvable"],
          attribution,
          requestId: "7d1c3f7e-0000-4000-8000-000000000001",
        });
        const where = `${project} ${finish} ${sqft}`;
        fullest = Math.max(fullest, notes.length);
        assert.ok(notes.length <= TEAM_NOTES_MAX_LINES, `${where}: ${notes.length} lines`);
        for (const line of notes) {
          assert.ok(line.length <= TEAM_NOTE_MAX_LENGTH, `${where}: ${line.length} characters: ${line}`);
          assert.match(line, /^[^:\n]{2,60}: \S/, `${where}: not Label: value: ${line}`);
          assert.equal(/[\r\n\t]/.test(line), false, `${where}: one note is one line`);
        }
        assert.deepEqual(cleanTeamNotes(notes), notes, `${where}: the bridge sends them unchanged`);
        // The lines at the end of the list are the first a cut would take: they are all there.
        assert.ok(notes.some((line) => line.startsWith("Permits: ")), where);
        assert.equal(notes[notes.length - 1], "Landing page: https://boiseremodeling.co/kitchen-remodeling-boise", where);
        assert.ok(notes.some((line) => line.startsWith("Price by trade, ")), `${where}: trades are one per line`);
      }
    }
  }
  assert.ok(fullest >= 28, "the fullest case is a real test of the limit");
});

/**
 * Internal pricing in the one team email (owner, 17 November 2026). Our cost, margin and the
 * wording of pricing checks travel in team_internal_notes, a field of their own: when it is
 * present p5 sends "Lead and pricing" instead of "New lead", and only "New lead" mail is copied
 * into HubSpot. team_notes is unchanged and still never carries any of it.
 */
test("internal pricing travels in team_internal_notes, with the admin email's own figures, and never in team_notes", () => {
  const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const alerts = ["recompute-mismatch", "implausible-total"];
  let checked = 0;
  let fullest = 0;
  let warned = 0;
  for (const project of PROJECTS) {
    const size = getProjectSizeConfig(project);
    for (const finish of FINISHES) {
      for (const sqft of [size.min, Math.round((size.min + size.max) / 2), size.max]) {
        const estimate = estimateFor(project, finish, sqft);
        const where = `${project} ${finish} ${sqft}`;
        const admin = resolveInternalEstimate(estimate.project, estimate.finish, estimate.sqft, estimate.refinements)!.admin;
        const internal = buildConsultationTeamInternalNotes({ estimate, pricingAlerts: alerts });

        // The totals and the alert and needs-review wording come first, in this order, so the
        // 60-line limit can never cut them. Our cost by trade follows, one line each.
        const expected = [
          `Direct cost: ${formatUsd(admin.directCost)}`,
          `Contingency: ${formatUsd(admin.contingency)}`,
          `Total internal cost: ${formatUsd(admin.totalInternalCost)}`,
          `Gross profit: ${formatUsd(admin.grossProfit)}`,
          `Margin: ${admin.marginLabel}`,
          `Quoted range basis: ${admin.rangeLabel}`,
          "Pricing alerts: recompute-mismatch, implausible-total",
          ...admin.warnings.map((warning) => `Needs review: ${warning.message}`),
          ...admin.trades.map(
            (trade) =>
              `Trade, ${trade.division}: our cost ${formatUsd(trade.internalCost)}, customer ${formatUsd(trade.customerAmount)}${trade.scopeSummary ? ` (${trade.scopeSummary})` : ""}`,
          ),
        ];
        assert.deepEqual(internal, expected, where);
        assert.ok(admin.trades.length >= 8, where);
        warned += admin.warnings.length;

        // By value against the site's own team email for the same request: the same numbers, in
        // the same rows of its "Internal breakdown" block.
        const html = buildAdminEmailHtml({ name: "Ada Example", phone: "2085550100", email: "", address: "", projectType: project }, estimate, profile);
        assert.ok(html.includes("Internal breakdown (not shown to the lead)"), where);
        for (const [label, value] of [
          ["Direct cost", admin.directCost],
          ["Contingency", admin.contingency],
          ["Total internal cost", admin.totalInternalCost],
          ["Gross profit", admin.grossProfit],
        ] as const) {
          assert.match(html, new RegExp(`>${label}</td><td[^>]*>${escapeRegExp(formatUsd(value))}</td>`), `${where}: ${label}`);
        }
        assert.ok(html.includes(`${escapeHtml(admin.marginLabel)}<br>`), `${where}: margin line`);
        assert.ok(html.includes(`Quoted range ${escapeHtml(admin.rangeLabel)}`), `${where}: quoted range basis`);
        for (const warning of admin.warnings) assert.ok(html.includes(escapeHtml(warning.message)), `${where}: needs review`);
        for (const trade of admin.trades) {
          assert.match(
            html,
            new RegExp(`${escapeRegExp(escapeHtml(trade.division))}<br>[^\\n]*?>${escapeRegExp(formatUsd(trade.internalCost))}</td><td[^>]*>${escapeRegExp(formatUsd(trade.customerAmount))}</td>`),
            `${where}: ${trade.division}`,
          );
        }

        // Within the p5 limits, and the bridge sends them unchanged.
        fullest = Math.max(fullest, internal.length);
        assert.ok(internal.length <= TEAM_INTERNAL_NOTES_MAX_LINES, `${where}: ${internal.length} lines`);
        for (const line of internal) {
          assert.ok(line.length <= TEAM_NOTE_MAX_LENGTH, `${where}: ${line.length} characters: ${line}`);
          assert.match(line, /^[^:\n]{2,60}: \S/, `${where}: not Label: value: ${line}`);
          assert.equal(/[\r\n\t]/.test(line), false, `${where}: one note is one line`);
        }
        assert.deepEqual(cleanTeamInternalNotes(internal), internal, where);

        // The two fields never share a line, and team_notes for the same request stays clean.
        const notes = buildConsultationTeamNotes({ estimate, profile, pricingAlerts: alerts, attribution, requestId: "isolated-1" });
        for (const line of notes) {
          assert.equal(internal.includes(line), false, `${where}: ${line}`);
          assert.equal(TEAM_NOTE_BLOCKED.test(line), false, `${where}: ${line}`);
        }
        const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", teamNotes: notes, teamInternalNotes: internal });
        assert.deepEqual(body.team_internal_notes, internal, where);
        assert.deepEqual(body.team_notes, notes, where);
        assert.doesNotMatch(JSON.stringify(body.team_notes), /cost|margin|mark-?up|profit|contingenc|overhead|recompute-mismatch|implausible-total/i, where);
        // Outside team_internal_notes, nothing in the posted body names a cost or margin.
        const { team_internal_notes: _internal, ...rest } = body;
        assert.doesNotMatch(JSON.stringify(rest), /cost|margin|mark-?up|profit|contingenc|overhead/i, where);
        checked += 1;
      }
    }
  }
  assert.equal(checked, PROJECTS.length * FINISHES.length * 3);
  assert.ok(fullest >= 25 && fullest <= 40, `the fullest case is ${fullest} lines, well inside 60`);
  assert.ok(warned > 0, "the sweep includes estimates with a needs-review warning");

  // No alert kinds: no alerts line, and the totals still lead.
  const quiet = buildConsultationTeamInternalNotes({ estimate: estimateFor("kitchen", "mid-range", 180) });
  assert.ok(quiet[0].startsWith("Direct cost: $"));
  assert.equal(quiet.some((line) => line.startsWith("Pricing alerts:")), false);
});

test("a request with no planning range sends no team_internal_notes, and step 2 never does", () => {
  assert.deepEqual(buildConsultationTeamInternalNotes({ estimate: null }), []);
  assert.deepEqual(buildConsultationTeamInternalNotes({ estimate: null, pricingAlerts: ["zero-total"] }), []);
  for (const teamInternalNotes of [undefined, null, [], ["", "   ", "\n"]]) {
    const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", teamNotes: ["Lead dashboard: https://leads.boiseremodeling.co"], teamInternalNotes });
    assert.equal("team_internal_notes" in body, false, JSON.stringify(teamInternalNotes));
    assert.deepEqual(body.team_notes, ["Lead dashboard: https://leads.boiseremodeling.co"]);
  }
  // Step 2 ("Details added") has no planning range of its own: it never sets the field.
  const details = readFileSync(new URL("../server/services/requestDetailsDelivery.ts", import.meta.url), "utf8");
  assert.equal(/teamInternalNotes|team_internal_notes/.test(details), false);
  // Step 1 builds both, each from its own builder, and hands each to its own bridge input.
  const route = readFileSync(new URL("../app/api/consultation/route.ts", import.meta.url), "utf8");
  assert.match(route, /teamNotes = buildConsultationTeamNotes\(/);
  assert.match(route, /teamInternalNotes = buildConsultationTeamInternalNotes\(/);
  assert.doesNotMatch(route, /teamNotes:\s*teamInternalNotes|teamNotes\.push|teamNotes\.concat|\.\.\.teamInternalNotes/);
});

test("the bridge cleans team_internal_notes like team_notes, without the blocked-word wall, and caps them at 60", () => {
  assert.equal(TEAM_INTERNAL_NOTES_MAX_LINES, 60);
  const internal = [
    "Direct cost: $12,343",
    "  Contingency:   $1,234  ",
    "Total internal cost: $13,577",
    "Gross profit: $5,819",
    "Margin: 30% gross margin (42.9% markup)",
    "Needs review:\nthe margin was\ttrimmed",
    "",
    "   ",
    `Long: ${"x".repeat(400)}`,
  ];
  const cleaned = cleanTeamInternalNotes(internal);
  assert.deepEqual(cleaned.slice(0, 6), [
    "Direct cost: $12,343",
    "Contingency: $1,234",
    "Total internal cost: $13,577",
    "Gross profit: $5,819",
    "Margin: 30% gross margin (42.9% markup)",
    "Needs review: the margin was trimmed",
  ]);
  assert.equal(cleaned.length, 7, "blank lines are dropped, cost and margin lines are kept");
  assert.equal(cleaned[6].length, TEAM_NOTE_MAX_LENGTH);
  assert.ok(cleaned[6].endsWith("..."));
  assert.deepEqual(cleanTeamInternalNotes([null, 12, { a: 1 }, "Our cost: $5,649"]), ["Our cost: $5,649"], "only strings travel");
  assert.deepEqual(cleanTeamInternalNotes(null), []);

  const many = cleanTeamInternalNotes(Array.from({ length: 75 }, (_, index) => `Trade ${index + 1}: our cost $${index + 1}`));
  assert.equal(many.length, 60);
  assert.equal(many[59], "Trade 60: our cost $60", "the first 60 lines are kept, in order");

  // The same lines in the wrong field are still withheld: the wall on team_notes has not moved.
  const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", teamNotes: [...internal, "Pricing alerts: 2"], teamInternalNotes: internal });
  assert.deepEqual(body.team_notes, [`Long: ${"x".repeat(291)}...`, "Pricing alerts: 2"]);
  assert.deepEqual(body.team_internal_notes, cleaned);
  assert.equal(body.team_alert, "confirm");
});

/**
 * The planning range as figures (owner, 13 and 17 November 2026): every estimate a visitor is
 * given becomes a customer and an UNSENT estimate in QuickBooks, and p5 creates both from the
 * `estimate` field. QuickBooks holds the customer's estimate, so it carries customer amounts
 * only: the price of each trade, never what it costs us.
 */
test("the estimate carries the customer price by trade, to the cent, for every project, finish and size", () => {
  const toCents = (value: number) => Math.round(value * 100);
  let checked = 0;
  let measured = 0;
  let described = 0;
  for (const project of PROJECTS) {
    const size = getProjectSizeConfig(project);
    for (const finish of FINISHES) {
      for (const sqft of [size.min, Math.round((size.min + size.max) / 2), size.max]) {
        const verified = estimateFor(project, finish, sqft);
        const where = `${project} ${finish} ${sqft}`;
        const admin = resolveInternalEstimate(verified.project, verified.finish, verified.sqft, verified.refinements)!.admin;
        const estimate = buildConsultationP5Estimate(verified)!;
        assert.ok(estimate, where);

        // The range the customer was shown, verified by this site's server, with no base:
        // p5 totals the lines.
        assert.equal(estimate.kind, "planning-range", where);
        assert.equal(estimate.low, verified.priceLow, where);
        assert.equal(estimate.high, verified.priceHigh, where);
        assert.equal(estimate.verified, true, where);
        assert.equal("base" in estimate, false, where);
        assert.match(estimate.label!, /^[A-Z][A-Za-z\/ -]+, (Refresh|Mid-Range|High-End|Luxury) finish, [\d,]+ sq ft$/, where);
        assert.deepEqual(Object.keys(estimate).sort(), ["high", "kind", "label", "lines", "low", "verified"], where);

        // One line per trade with a price, in the admin email's order, named as the trade.
        const priced = admin.trades.filter((trade) => toCents(trade.customerAmount) > 0).flatMap(trade=>
          trade.children.some(line=>line.qboServiceId)
            ?trade.children.map(line=>({...trade,division:line.description,customerAmount:Math.round(line.quantity*120*100)/100,
              internalCost:line.cost,scopeSummary:`${line.quantity} hour`}))
            :[trade]);
        const lines = estimate.lines!;
        const ownerLines=lines.filter(line=>line.qboServiceId);
        assert.deepEqual(ownerLines.map(line=>line.qboServiceId),['48','49','47'],where);
        for(const line of ownerLines){assert.equal(line.unitPrice,120);assert.equal(line.amount,Math.round(line.quantity!*120*100)/100);}
        assert.equal(lines.length, priced.length, where);
        assert.ok(lines.length >= 8 && lines.length <= P5_ESTIMATE_MAX_LINES, where);
        lines.forEach((line, index) => {
          const trade = priced[index];
          assert.equal(line.title, trade.division, where);
          assert.equal(line.division, line.qboServiceId?'Project services':trade.division, where);
          // The CUSTOMER amount of that trade (the email's "Customer" column), to the cent...
          assert.ok(Math.abs(line.amount - trade.customerAmount) <= 0.0101, `${where}: ${line.title} ${line.amount} vs ${trade.customerAmount}`);
          assert.ok(Math.abs(line.amount * 100 - toCents(line.amount)) < 1e-6, `${where}: ${line.amount} is whole cents`);
          // ...and never what the trade costs us.
          assert.notEqual(toCents(line.amount), toCents(trade.internalCost), `${where}: ${line.title}`);
          assert.ok(line.amount > trade.internalCost, `${where}: ${line.title} is a price, above its cost`);
          // One clear quantity travels as quantity and unit; several are said in words.
          const single = /^(\d[\d,.]*) ([A-Za-z]+)$/.exec(trade.scopeSummary);
          if (single && Number(single[1].replace(/,/g, "")) > 0) {
            assert.deepEqual([line.quantity, line.unit, line.description], [Number(single[1].replace(/,/g, "")), single[2], undefined], `${where}: ${line.title}`);
            measured += 1;
          } else {
            assert.deepEqual([line.quantity, line.unit, line.description], [undefined, undefined, trade.scopeSummary || undefined], `${where}: ${line.title}`);
            described += 1;
          }
          assert.deepEqual(Object.keys(line).filter((key) => !["title", "division", "amount", "quantity", "unit", "description","qboServiceId","serviceCode","unitPrice"].includes(key)), [], where);
        });

        // The lines sum to the customer price to the cent, and that total sits inside the range.
        const total = lines.reduce((sum, line) => sum + toCents(line.amount), 0);
        assert.equal(total, toCents(admin.customerPrice), `${where}: lines sum to the customer price`);
        assert.ok(total >= toCents(estimate.low) && total <= toCents(estimate.high), `${where}: ${total / 100} is inside ${estimate.low} to ${estimate.high}`);

        // No cost or margin word anywhere in it, and no internal figure by value.
        assert.doesNotMatch(JSON.stringify(estimate), /cost|margin|mark-?up|profit|contingenc|overhead|internal/i, where);
        const figures = new Set([toCents(estimate.low), toCents(estimate.high), ...lines.map((line) => toCents(line.amount))]);
        for (const [label, value] of [
          ["total internal cost", admin.totalInternalCost],
          ["direct cost", admin.directCost],
          ["contingency", admin.contingency],
          ["gross profit", admin.grossProfit],
        ] as const) {
          assert.equal(figures.has(toCents(value)), false, `${where}: ${label} is in the estimate`);
        }

        // The bridge sends it unchanged, beside the notes, and the rest of the body is as before.
        assert.deepEqual(cleanP5Estimate(estimate), estimate, where);
        const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", estimate });
        assert.deepEqual(body.estimate, estimate, where);
        checked += 1;
      }
    }
  }
  assert.equal(checked, PROJECTS.length * FINISHES.length * 3);
  assert.ok(measured > 0 && described > 0, "the sweep covers single quantities and several");

  // Plain words in the label.
  assert.equal(buildConsultationP5Estimate(estimateFor("kitchen", "mid-range", 180))!.label, "Kitchen, Mid-Range finish, 180 sq ft");
  assert.equal(buildConsultationP5Estimate(estimateFor("whole-home", "luxury", 2400))!.label, "Whole-Home, Luxury finish, 2,400 sq ft");
});

test("no planning range, a callback and step 2 send no estimate, and building one never throws", () => {
  assert.equal(buildConsultationP5Estimate(null), null);
  for (const estimate of [undefined, null]) {
    const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", teamNotes: ["Lead dashboard: https://leads.boiseremodeling.co"], estimate });
    assert.equal("estimate" in body, false);
  }
  // A broken estimate is no estimate, never an exception: the request still goes.
  assert.equal(buildConsultationP5Estimate({ project: "pool", finish: "mid-range", sqft: 180 } as never), null);
  assert.equal(buildConsultationP5Estimate({} as never), null);
  const body = buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", estimate: { kind: "planning-range", low: Number.NaN, high: 10 } });
  assert.equal("estimate" in body, false);
  assert.equal(body.team_alert, "confirm");
  assert.equal(body.name, "Ada Example");

  // Step 1 sends it only when there is a range and the request is not a callback.
  const route = readFileSync(new URL("../app/api/consultation/route.ts", import.meta.url), "utf8");
  assert.match(route, /estimate: data\.callback \? null : buildConsultationP5Estimate\(estimate\),/);
  assert.equal(route.match(/buildConsultationP5Estimate\(/g)?.length, 1, "one place builds it");
  // Step 2 ("Details added") never does: nothing in its bridge call is an estimate.
  const details = readFileSync(new URL("../server/services/requestDetailsDelivery.ts", import.meta.url), "utf8");
  const call = details.slice(details.indexOf("forwardConsultationToP5Intake({"), details.indexOf("});", details.indexOf("forwardConsultationToP5Intake({")));
  assert.ok(call.length > 100);
  assert.equal(/\bestimate\b/.test(call), false);
  assert.equal(/buildConsultationP5Estimate/.test(details), false);
});

test("the bridge is the wall behind the estimate: customer amounts only, all or nothing, never an exception", () => {
  assert.equal(P5_ESTIMATE_MAX_LINES, 60);
  const good = {
    kind: "planning-range" as const,
    low: 21000,
    high: 28500,
    label: "Kitchen, Mid-Range finish, 180 sq ft",
    verified: true as const,
    lines: [
      { title: "COUNTERTOPS + CABINETRY", division: "COUNTERTOPS + CABINETRY", amount: 12296.4, quantity: 20, unit: "LF" },
      { title: "ADMINISTRATION", division: "ADMINISTRATION", amount: 1871.13, description: "1 MO, 0 EA" },
    ],
  };
  assert.deepEqual(cleanP5Estimate(good), good);

  // A cost or margin word in any text withholds the whole estimate.
  for (const leaked of [
    { ...good, label: "Kitchen at 30% gross margin" },
    { ...good, lines: [{ ...good.lines[0], description: "our cost $7,825" }, good.lines[1]] },
    { ...good, lines: [{ ...good.lines[0], title: "Contingency" }, good.lines[1]] },
    { ...good, lines: [good.lines[0], { ...good.lines[1], division: "OVERHEAD + PROFIT" }] },
    { ...good, lines: [{ ...good.lines[0], unit: "markup" }, good.lines[1]] },
  ]) {
    assert.equal(cleanP5Estimate(leaked), null, JSON.stringify(leaked).slice(0, 120));
    assert.equal("estimate" in buildP5IntakeBody({ name: "Ada Example", phone: "2085550100", estimate: leaked as never }), false);
  }

  // Bad numbers, a bad shape or too many lines: no estimate, because p5 totals the lines.
  for (const bad of [
    null,
    undefined,
    5,
    "planning-range",
    [],
    {},
    { ...good, kind: "document" },
    { ...good, low: Number.NaN },
    { ...good, high: Number.POSITIVE_INFINITY },
    { ...good, low: 0 },
    { ...good, low: -5 },
    { ...good, low: 30000, high: 28500 },
    { ...good, low: "21000" },
    { ...good, lines: "none" },
    { ...good, lines: [null] },
    { ...good, lines: [{ title: "", amount: 5 }] },
    { ...good, lines: [{ title: "FLOORING" }] },
    { ...good, lines: [{ title: "FLOORING", amount: -1 }] },
    { ...good, lines: [{ title: "FLOORING", amount: Number.NaN }] },
    { ...good, lines: [{ title: "FLOORING", amount: "900" }] },
    { ...good, lines: Array.from({ length: 61 }, (_, index) => ({ title: `Trade ${index + 1}`, amount: 100 })) },
  ]) {
    assert.equal(cleanP5Estimate(bad), null, JSON.stringify(bad)?.slice(0, 80));
  }
  assert.doesNotThrow(() => cleanP5Estimate(Object.defineProperty({}, "kind", { get() { throw new Error("boom"); } })));
  assert.equal(cleanP5Estimate(Object.defineProperty({}, "kind", { get() { throw new Error("boom"); } })), null);

  // What is tidied rather than refused: zero lines left out, cents, single lines, only a true `verified`.
  const tidied = cleanP5Estimate({
    kind: "planning-range",
    low: 21000.004,
    high: 28500.006,
    label: "  Kitchen,\nMid-Range finish  ",
    verified: "true",
    base: 24800.126,
    lines: [
      { title: "FLOORING", amount: 1701.234, quantity: 180, unit: " SF ", division: "FLOORING" },
      { title: "FREE", amount: 0 },
      { title: "PLUMBING", amount: 982.005, quantity: 0, unit: "SF", description: "" },
    ],
  });
  assert.deepEqual(tidied, {
    kind: "planning-range",
    low: 21000,
    high: 28500.01,
    label: "Kitchen, Mid-Range finish",
    base: 24800.13,
    lines: [
      { title: "FLOORING", amount: 1701.23, division: "FLOORING", quantity: 180, unit: "SF" },
      { title: "PLUMBING", amount: 982.01 },
    ],
  });
  assert.equal(cleanP5Estimate({ ...good, lines: Array.from({ length: 60 }, (_, index) => ({ title: `Trade ${index + 1}`, amount: 100 })) })!.lines!.length, 60);
  assert.deepEqual(cleanP5Estimate({ kind: "planning-range", low: 100, high: 200 }), { kind: "planning-range", low: 100, high: 200 });
});
