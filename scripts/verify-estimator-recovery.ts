/**
 * Exercises partial-completion tracking end to end against an in-process
 * Postgres (pglite) and a capturing mailer, so retention, completion and
 * callback semantics are proven without Neon or Resend:
 *
 *   1. partial-completion staff email stays off
 *   2. an un-engaged session never emails
 *   3. an engaged idle session never sends a `[Partial]` drop-off email
 *   4. a second sweep still sends nothing and does not claim the row
 *   5. a row already notified by an older build still becomes recovered
 *   6. a completion before the sweep is never emailed
 *   7. a callback request emails once, and a retried request does not send again
 *   8. an abandonment sweep does not call the mailer, even when it would fail
 *   9. sensitive selection keys are dropped, query strings are stripped
 *
 * Run: npm run verify:estimator-recovery
 */
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";
import { buildAbandonmentEmail } from "../server/services/estimatorSessionEmail";
import {
  INACTIVITY_MS,
  MAX_NOTIFY_ATTEMPTS,
  SEND_PARTIAL_COMPLETION_EMAILS,
  installEstimatorSessionsTestAdapter,
  recordCallbackRequest,
  recordProgress,
  sweepAbandonedSessions,
} from "../server/services/estimatorSessions";

async function main() {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  const sent: Array<{ subject: string; html: string }> = [];
  let failNext = 0;
  installEstimatorSessionsTestAdapter({
    // The service is typed against the neon-http client; both expose the same
    // query builder surface, which is all the service uses.
    db: db as unknown as never,
    mailer: async (email) => {
      if (failNext > 0) { failNext -= 1; throw new Error("simulated mailer outage"); }
      sent.push(email);
    },
  });

  const t0 = new Date("2026-09-08T10:00:00Z");
  const later = (ms: number) => new Date(t0.getTime() + ms);
  const idle = INACTIVITY_MS + 5 * 60_000;
  const { estimatorSessions } = schema;
  const partialSubjects = () => sent.filter((email) => email.subject.startsWith("[Partial]"));

  // 1. The kill switch is the contract. Turning it on has to update this file.
  assert.equal(SEND_PARTIAL_COMPLETION_EMAILS, false, "partial-completion staff email stays off");

  // 2. Not engaged: first step, a few seconds in.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000001", flow: "estimate", currentStep: "project", currentStepIndex: 0, totalSteps: 9, startedAt: t0.getTime() }, t0);
  let r = await sweepAbandonedSessions({ now: later(idle) });
  assert.equal(r.partialCompletionEmails, false);
  assert.equal(r.sent, 0, "un-engaged session must not email");
  assert.equal(r.considered, 0, "the sweep does not look for partial-completion recipients");

  // 3. Engaged and idle: the old `[Partial]` drop-off email must not send.
  await recordProgress({
    sessionId: "aaaaaaaa-0000-4000-8000-000000000002", flow: "estimate", currentStep: "size", currentStepIndex: 3, totalSteps: 9,
    lastCompletedStep: "layout", startedAt: t0.getTime(), pagePath: "/estimate?gclid=secret&utm_source=x",
    selections: { project: "kitchen", sqft: 180, email: "leak@example.com", contact_phone: "2085551234", finish: "mid-range" },
    validationErrors: ["address_required"],
  }, later(120_000));
  r = await sweepAbandonedSessions({ now: later(idle) });
  assert.equal(r.sent, 0, "an abandoned session does not email staff");
  assert.equal(r.failed, 0, "a suppressed partial email is not a failed send");
  assert.equal(r.considered, 0);
  assert.equal(sent.length, 0);
  assert.equal(partialSubjects().length, 0);
  let row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000002")))[0];
  assert.equal(row.status, "active", "an unsent abandonment stays unclaimed");
  assert.equal(row.notifiedAt, null);
  assert.equal(row.notifyAttemptCount, 0);
  assert.equal(row.notifyLockedAt, null);
  assert.equal(row.pagePath, "/estimate");
  assert.equal("email" in (row.selections as object), false);
  assert.equal("contact_phone" in (row.selections as object), false);
  const preview = buildAbandonmentEmail(row);
  assert.match(preview.subject, /^\[Partial\] Anonymous Project estimator drop-off/);
  assert.match(preview.html, /kitchen/);
  assert.doesNotMatch(preview.html, /leak@example\.com|2085551234|gclid/, "sensitive keys and query strings never reach the email copy");
  assert.equal(partialSubjects().length, 0, "building the old copy does not send it");

  // 4. Another sweep still sends nothing and still does not claim the row.
  r = await sweepAbandonedSessions({ now: later(idle + 600_000) });
  assert.equal(r.sent, 0, "partial-completion email stays suppressed");
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000002")))[0];
  assert.equal(row.notifyAttemptCount, 0);

  // 5. A row already marked notified by an older build still becomes recovered,
  //    and completing it does not send a partial-completion email.
  await db.update(estimatorSessions).set({ status: "notified", notifiedAt: later(idle) }).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000002"));
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000002", flow: "estimate", currentStep: "result", currentStepIndex: 9, totalSteps: 9, status: "completed" }, later(idle + 700_000));
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000002")))[0];
  assert.equal(row.status, "recovered");
  assert.equal(sent.length, 0);

  // 6. Completion before any sweep: never emailed, and a late beacon cannot downgrade it.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000003", flow: "re10", currentStep: "contact", currentStepIndex: 2, totalSteps: 5, startedAt: t0.getTime() }, later(60_000));
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000003", flow: "re10", currentStep: "result", currentStepIndex: 4, totalSteps: 5, status: "completed" }, later(120_000));
  r = await sweepAbandonedSessions({ now: later(idle + 900_000) });
  assert.equal(r.sent, 0, "completed sessions are never emailed");
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000003", flow: "re10", currentStep: "contact", currentStepIndex: 2, totalSteps: 5 }, later(130_000));
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000003")))[0];
  assert.equal(row.status, "completed");

  // 7. Callback: one real-lead email, retry does not duplicate, sweep adds no partial email.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000004", flow: "plans", currentStep: "measure", currentStepIndex: 1, totalSteps: 4, startedAt: t0.getTime() }, later(30_000));
  let cb = await recordCallbackRequest({ sessionId: "aaaaaaaa-0000-4000-8000-000000000004", flow: "plans", phone: "(208) 555-0100", name: "Test Caller" }, later(40_000));
  assert.equal(cb.notified, true);
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /^Callback requested: Test Caller, \(208\) 555-0100/);
  assert.doesNotMatch(sent[0].subject, /\[Partial\]/);
  cb = await recordCallbackRequest({ sessionId: "aaaaaaaa-0000-4000-8000-000000000004", flow: "plans", phone: "2085550100" }, later(41_000));
  assert.equal(cb.notified, false, "a retried callback request does not send twice");
  assert.equal(sent.length, 1);
  r = await sweepAbandonedSessions({ now: later(idle + 2_000_000) });
  assert.equal(r.sent, 0, "the sweep does not add a partial-completion email for a callback session");
  assert.equal(partialSubjects().length, 0);

  // 8. A mailer outage cannot produce a partial-completion email, a claim, or a retry.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000005", flow: "consultation", currentStep: "filling", currentStepIndex: 1, totalSteps: 2, startedAt: t0.getTime() }, later(50_000));
  failNext = 1;
  r = await sweepAbandonedSessions({ now: later(idle + 3_000_000) });
  assert.equal(r.failed, 0);
  assert.equal(r.sent, 0);
  assert.equal(failNext, 1, "the abandonment sweep does not call the mailer");
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000005")))[0];
  assert.equal(row.status, "active");
  assert.equal(row.notifyLastError, null);
  assert.equal(row.notifyAttemptCount, 0);
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000006", flow: "estimate", currentStep: "size", currentStepIndex: 3, totalSteps: 9, startedAt: t0.getTime() }, later(60_000));
  failNext = MAX_NOTIFY_ATTEMPTS + 2;
  for (let i = 0; i < MAX_NOTIFY_ATTEMPTS + 2; i += 1) {
    await sweepAbandonedSessions({ now: later(idle + 4_000_000 + i * 700_000) });
  }
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000006")))[0];
  assert.equal(row.notifyAttemptCount, 0, "partial-completion sends are not attempted");
  assert.equal(failNext, MAX_NOTIFY_ATTEMPTS + 2, "repeated sweeps still do not call the mailer");
  assert.equal(partialSubjects().length, 0);

  // Explicit estimator-exit callbacks freeze their first phone and share the existing claim.
  failNext = 0;
  const beforeExit = sent.length;
  const exitRequest = {sessionId: "aaaaaaaa-0000-4000-8000-000000000007", flow: "p5-exit", phone: "2085550100", note: "Explicit callback consent; no marketing."};
  await Promise.all([recordCallbackRequest(exitRequest), recordCallbackRequest(exitRequest)]);
  assert.equal(sent.length, beforeExit + 1, "concurrent callback retries send once");
  const conflict = await recordCallbackRequest({...exitRequest, phone: "2085550101"});
  assert.equal(conflict.error, "callback_conflict");
  assert.equal(conflict.stored, false);
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, exitRequest.sessionId)))[0];
  assert.equal(row.contactPhone, "2085550100", "retry cannot change an already-requested number");
  failNext = 1;
  const retryRequest = {...exitRequest, sessionId: "aaaaaaaa-0000-4000-8000-000000000008"};
  const failedCallback = await recordCallbackRequest(retryRequest);
  assert.equal(failedCallback.stored, true);
  assert.equal(failedCallback.notified, false);
  assert.equal((await recordCallbackRequest(retryRequest)).notified, true);
  assert.equal(sent.length, beforeExit + 2);
  assert.equal(partialSubjects().length, 0, "no partial-completion email was sent");
  for (const email of sent) assert.match(email.subject, /^Callback requested:/, email.subject);

  console.log(`verify-estimator-recovery: all checks passed (${sent.length} emails captured)`);
  await pg.close();
}

main().catch((error) => {
  console.error("verify-estimator-recovery FAILED:", error);
  process.exit(1);
});
