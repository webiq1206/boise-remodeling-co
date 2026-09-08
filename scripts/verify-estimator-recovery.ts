/**
 * Exercises partial-completion tracking end to end against an in-process
 * Postgres (pglite) and a capturing mailer, so the claim, retry, completion and
 * callback semantics are proven without Neon or Resend:
 *
 *   1. an un-engaged session never emails
 *   2. an engaged session emails exactly once after 30 minutes idle
 *   3. a second sweep sends nothing
 *   4. a completion after the summary marks the session recovered
 *   5. a completion before the summary cancels it
 *   6. a callback request emails once, and a retried request does not send again
 *   7. a failed send is retried on the next pass and stops after MAX attempts
 *   8. sensitive selection keys are dropped, query strings are stripped
 *
 * Run: npm run verify:estimator-recovery
 */
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../shared/schema";
import {
  INACTIVITY_MS,
  MAX_NOTIFY_ATTEMPTS,
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

  // 1. Not engaged: first step, a few seconds in.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000001", flow: "estimate", currentStep: "project", currentStepIndex: 0, totalSteps: 9, startedAt: t0.getTime() }, t0);
  let r = await sweepAbandonedSessions({ now: later(idle) });
  assert.equal(r.sent, 0, "un-engaged session must not email");

  // 2. Engaged, idle 31 minutes: exactly one email.
  await recordProgress({
    sessionId: "aaaaaaaa-0000-4000-8000-000000000002", flow: "estimate", currentStep: "size", currentStepIndex: 3, totalSteps: 9,
    lastCompletedStep: "layout", startedAt: t0.getTime(), pagePath: "/estimate?gclid=secret&utm_source=x",
    selections: { project: "kitchen", sqft: 180, email: "leak@example.com", contact_phone: "2085551234", finish: "mid-range" },
    validationErrors: ["address_required"],
  }, later(120_000));
  r = await sweepAbandonedSessions({ now: later(idle) });
  assert.equal(r.sent, 1, "engaged idle session emails once");
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /^\[Partial\] Anonymous/);
  assert.match(sent[0].html, /No contact information was provided/);
  assert.doesNotMatch(sent[0].html, /leak@example\.com|2085551234|gclid/, "sensitive keys and query strings never reach the email");
  assert.match(sent[0].html, /kitchen/);
  let row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000002")))[0];
  assert.equal(row.status, "notified");
  assert.equal(row.pagePath, "/estimate");
  assert.equal("email" in (row.selections as object), false);

  // 3. Second sweep: nothing new.
  r = await sweepAbandonedSessions({ now: later(idle + 600_000) });
  assert.equal(r.sent, 0, "one summary per session");

  // 4. Completion after the summary: recovered.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000002", flow: "estimate", currentStep: "result", currentStepIndex: 9, totalSteps: 9, status: "completed" }, later(idle + 700_000));
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000002")))[0];
  assert.equal(row.status, "recovered");

  // 5. Completion before the summary: never emailed.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000003", flow: "re10", currentStep: "contact", currentStepIndex: 2, totalSteps: 5, startedAt: t0.getTime() }, later(60_000));
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000003", flow: "re10", currentStep: "result", currentStepIndex: 4, totalSteps: 5, status: "completed" }, later(120_000));
  r = await sweepAbandonedSessions({ now: later(idle + 900_000) });
  assert.equal(r.sent, 0, "completed sessions are never emailed");
  // A late beacon cannot downgrade a completed session.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000003", flow: "re10", currentStep: "contact", currentStepIndex: 2, totalSteps: 5 }, later(130_000));
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000003")))[0];
  assert.equal(row.status, "completed");

  // 6. Callback: one email, retry does not duplicate, sweep skips it.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000004", flow: "plans", currentStep: "measure", currentStepIndex: 1, totalSteps: 4, startedAt: t0.getTime() }, later(30_000));
  let cb = await recordCallbackRequest({ sessionId: "aaaaaaaa-0000-4000-8000-000000000004", flow: "plans", phone: "(208) 555-0100", name: "Test Caller" }, later(40_000));
  assert.equal(cb.notified, true);
  assert.equal(sent.length, 2);
  assert.match(sent[1].subject, /^Callback requested: Test Caller, \(208\) 555-0100/);
  cb = await recordCallbackRequest({ sessionId: "aaaaaaaa-0000-4000-8000-000000000004", flow: "plans", phone: "2085550100" }, later(41_000));
  assert.equal(cb.notified, false, "a retried callback request does not send twice");
  assert.equal(sent.length, 2);
  r = await sweepAbandonedSessions({ now: later(idle + 2_000_000) });
  assert.equal(r.sent, 0, "a callback session is excluded from the abandonment sweep");

  // 7. Mailer outage: retried next pass, capped.
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000005", flow: "consultation", currentStep: "filling", currentStepIndex: 1, totalSteps: 2, startedAt: t0.getTime() }, later(50_000));
  failNext = 1;
  r = await sweepAbandonedSessions({ now: later(idle + 3_000_000) });
  assert.equal(r.failed, 1);
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000005")))[0];
  assert.equal(row.status, "active");
  assert.match(row.notifyLastError ?? "", /simulated mailer outage/);
  r = await sweepAbandonedSessions({ now: later(idle + 3_100_000) });
  assert.equal(r.sent, 1, "retried on the next pass");
  await recordProgress({ sessionId: "aaaaaaaa-0000-4000-8000-000000000006", flow: "estimate", currentStep: "size", currentStepIndex: 3, totalSteps: 9, startedAt: t0.getTime() }, later(60_000));
  failNext = MAX_NOTIFY_ATTEMPTS + 2;
  for (let i = 0; i < MAX_NOTIFY_ATTEMPTS + 2; i += 1) {
    await sweepAbandonedSessions({ now: later(idle + 4_000_000 + i * 700_000) });
  }
  row = (await db.select().from(estimatorSessions).where(eq(estimatorSessions.id, "aaaaaaaa-0000-4000-8000-000000000006")))[0];
  assert.equal(row.notifyAttemptCount, MAX_NOTIFY_ATTEMPTS, "gives up after MAX_NOTIFY_ATTEMPTS");

  console.log(`verify-estimator-recovery: all checks passed (${sent.length} emails captured)`);
  await pg.close();
}

main().catch((error) => {
  console.error("verify-estimator-recovery FAILED:", error);
  process.exit(1);
});
