/**
 * Partial-completion tracking: durable estimator/lead-form sessions and the
 * inactivity sweep that turns an abandoned one into a single summary email.
 *
 * Policy (also in docs/estimator-recovery.md):
 * - ENGAGEMENT: a session counts once the visitor has completed a step or
 *   spent 20 seconds inside the flow. Brief accidental visits never email.
 * - INACTIVITY: 30 minutes without a progress report. Browser events only
 *   speed this up (an explicit exit is reported immediately); the sweep is the
 *   source of truth, so a closed tab still produces the summary.
 * - ONE email per session. The claim is an atomic conditional UPDATE, so two
 *   workers cannot both send. A failed send leaves the row claimable again
 *   (up to MAX_NOTIFY_ATTEMPTS) with the error recorded.
 * - COMPLETION cancels: a session marked completed is never emailed; a
 *   completion that arrives after the email marks the session `recovered`.
 * - CALLBACK requests are their own notification (sent immediately) and the
 *   session is then excluded from the abandonment sweep, so nobody gets two
 *   emails about one visitor.
 * - DATA: pseudonymous session id, step positions, allow-listed selections,
 *   validation error codes, device category. Contact details only from an
 *   explicit callback request. Rows are purged after RETENTION_DAYS.
 */
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db as appDb } from "@/lib/db";
import { estimatorSessions, type EstimatorSession } from "@/shared/schema";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { getUncachableEmailClient } from "./emailTransport";
import { formatFromAddress, getAdminRecipientEmails, htmlToPlainText } from "./emailLayout";
import { buildAbandonmentEmail, buildCallbackEmail } from "./estimatorSessionEmail";

export const ENGAGEMENT_MIN_SECONDS = 20;
export const INACTIVITY_MS = 30 * 60 * 1000;
export const MAX_NOTIFY_ATTEMPTS = 5;
export const NOTIFY_LOCK_MS = 10 * 60 * 1000;
export const RETENTION_DAYS = 90;
export const SWEEP_MIN_INTERVAL_MS = 5 * 60 * 1000;

export const SESSION_ID_RE = /^[a-f0-9-]{16,64}$/i;

/*
 * Test seam. The verify script (scripts/verify-estimator-recovery.ts) points
 * the service at a throwaway Postgres and a capturing mailer, so the sweep,
 * claim and retry semantics are exercised for real without Neon or Resend.
 * Production never calls these.
 */
type Db = NonNullable<typeof appDb>;
let dbOverride: Db | null = null;
let mailerOverride: ((email: { subject: string; html: string }) => Promise<void>) | null = null;
export function installEstimatorSessionsTestAdapter(opts: { db: Db; mailer: (email: { subject: string; html: string }) => Promise<void> } | null): void {
  dbOverride = opts?.db ?? null;
  mailerOverride = opts?.mailer ?? null;
}
function getDb(): Db | null {
  return dbOverride ?? appDb;
}
const STEP_RE = /^[a-z0-9_. -]{1,60}$/i;

/** Allow-listed selection keys. Anything else a client sends is dropped. */
const SELECTION_KEY_RE = /^[a-z][a-z0-9_]{0,39}$/i;
const MAX_SELECTIONS = 40;
const MAX_VALUE_LEN = 120;
/** Never store these even if a client sends them under a selection key. */
const SENSITIVE_KEY_RE = /(name|email|phone|address|street|password|card|ssn|token)/i;

export interface ProgressReport {
  sessionId: string;
  flow: string;
  pagePath?: string;
  device?: string;
  startedAt?: number;
  currentStep?: string;
  currentStepIndex?: number;
  lastCompletedStep?: string;
  totalSteps?: number;
  selections?: Record<string, unknown>;
  validationErrors?: string[];
  exitMethod?: string;
  status?: "active" | "completed";
  recovery?: { shown?: boolean; call?: boolean; text?: boolean; dismissed?: boolean };
}

function sanitizeSelections(input: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input)) {
    if (Object.keys(out).length >= MAX_SELECTIONS) break;
    if (!SELECTION_KEY_RE.test(key) || SENSITIVE_KEY_RE.test(key)) continue;
    if (value === null || typeof value === "boolean" || typeof value === "number") out[key] = value;
    else if (typeof value === "string") out[key] = value.slice(0, MAX_VALUE_LEN);
  }
  return out;
}

function sanitizePath(input: string | undefined): string {
  if (!input) return "/";
  try {
    const u = new URL(input, "https://placeholder.local");
    // Path only: query strings can carry attribution or contact data.
    return u.pathname.slice(0, 200) || "/";
  } catch {
    return "/";
  }
}

let ensured: Promise<void> | null = null;
/**
 * Creates the table on first use so the feature works on a deploy that did not
 * run `npm run db:push`. Mirrors migrations/0002_estimator_sessions.sql.
 */
export function ensureEstimatorSessionsTable(): Promise<void> {
  const db = getDb();
  if (!db) return Promise.resolve();
  if (!ensured) {
    ensured = (async () => {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS "estimator_sessions" (
        "id" varchar(64) PRIMARY KEY,
        "site" text NOT NULL,
        "flow" text NOT NULL,
        "page_path" text NOT NULL DEFAULT '/',
        "device" text NOT NULL DEFAULT 'unknown',
        "started_at" timestamp NOT NULL DEFAULT now(),
        "last_activity_at" timestamp NOT NULL DEFAULT now(),
        "current_step" text,
        "current_step_index" integer NOT NULL DEFAULT 0,
        "last_completed_step" text,
        "total_steps" integer NOT NULL DEFAULT 0,
        "completion_percent" integer NOT NULL DEFAULT 0,
        "time_spent_seconds" integer NOT NULL DEFAULT 0,
        "selections" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "validation_errors" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "exit_method" text NOT NULL DEFAULT 'unknown',
        "engaged" boolean NOT NULL DEFAULT false,
        "prompt_shown" boolean NOT NULL DEFAULT false,
        "clicked_call" boolean NOT NULL DEFAULT false,
        "clicked_text" boolean NOT NULL DEFAULT false,
        "requested_callback" boolean NOT NULL DEFAULT false,
        "dismissed_prompt" boolean NOT NULL DEFAULT false,
        "contact_name" text,
        "contact_phone" text,
        "contact_email" text,
        "callback_note" text,
        "callback_requested_at" timestamp,
        "callback_notified_at" timestamp,
        "status" text NOT NULL DEFAULT 'active',
        "notified_at" timestamp,
        "notify_attempt_count" integer NOT NULL DEFAULT 0,
        "notify_last_error" text,
        "notify_locked_at" timestamp,
        "completed_at" timestamp,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "estimator_sessions_status_activity_idx" ON "estimator_sessions" ("status", "last_activity_at")`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "estimator_sessions_site_created_idx" ON "estimator_sessions" ("site", "created_at")`);
    })().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}

/**
 * Upsert a progress report. Safe to retry: the row is keyed by the session id,
 * activity time only moves forward, and a completed session is never
 * downgraded to active by a late beacon.
 */
export async function recordProgress(report: ProgressReport, now = new Date()): Promise<{ stored: boolean }> {
  const db = getDb();
  if (!db) return { stored: false };
  await ensureEstimatorSessionsTable();
  const flow = STEP_RE.test(report.flow) ? report.flow : "unknown";
  const currentStep = report.currentStep && STEP_RE.test(report.currentStep) ? report.currentStep : null;
  const lastCompletedStep = report.lastCompletedStep && STEP_RE.test(report.lastCompletedStep) ? report.lastCompletedStep : null;
  const totalSteps = Math.max(0, Math.min(50, Math.floor(Number(report.totalSteps) || 0)));
  const currentStepIndex = Math.max(0, Math.min(50, Math.floor(Number(report.currentStepIndex) || 0)));
  const completion = totalSteps > 0 ? Math.round((Math.min(currentStepIndex, totalSteps) / totalSteps) * 100) : 0;
  const startedAt = report.startedAt && Number.isFinite(report.startedAt) ? new Date(Math.min(report.startedAt, now.getTime())) : now;
  const timeSpent = Math.max(0, Math.min(6 * 3600, Math.round((now.getTime() - startedAt.getTime()) / 1000)));
  const engaged = currentStepIndex >= 1 || Boolean(lastCompletedStep) || timeSpent >= ENGAGEMENT_MIN_SECONDS;
  const selections = sanitizeSelections(report.selections);
  const validationErrors = (report.validationErrors ?? []).filter((e) => typeof e === "string").map((e) => e.slice(0, 80)).slice(0, 20);
  const exitMethod = report.exitMethod && STEP_RE.test(report.exitMethod) ? report.exitMethod : "unknown";
  const device = report.device && /^(phone|tablet|desktop)$/.test(report.device) ? report.device : "unknown";
  const completed = report.status === "completed";
  const recovery = report.recovery ?? {};

  await db.insert(estimatorSessions).values({
    id: report.sessionId,
    site: SITE_CONFIG.name,
    flow,
    pagePath: sanitizePath(report.pagePath),
    device,
    startedAt,
    lastActivityAt: now,
    currentStep,
    currentStepIndex,
    lastCompletedStep,
    totalSteps,
    completionPercent: completed ? 100 : completion,
    timeSpentSeconds: timeSpent,
    selections,
    validationErrors,
    exitMethod,
    engaged,
    promptShown: Boolean(recovery.shown),
    clickedCall: Boolean(recovery.call),
    clickedText: Boolean(recovery.text),
    dismissedPrompt: Boolean(recovery.dismissed),
    status: completed ? "completed" : "active",
    completedAt: completed ? now : null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: estimatorSessions.id,
    set: {
      flow,
      pagePath: sanitizePath(report.pagePath),
      device,
      lastActivityAt: sql`GREATEST(${estimatorSessions.lastActivityAt}, ${now})`,
      currentStep,
      currentStepIndex,
      lastCompletedStep: sql`COALESCE(${lastCompletedStep}, ${estimatorSessions.lastCompletedStep})`,
      totalSteps,
      completionPercent: completed ? 100 : completion,
      timeSpentSeconds: sql`GREATEST(${estimatorSessions.timeSpentSeconds}, ${timeSpent})`,
      selections,
      validationErrors,
      exitMethod: exitMethod === "unknown" ? sql`${estimatorSessions.exitMethod}` : exitMethod,
      engaged: sql`${estimatorSessions.engaged} OR ${engaged}`,
      promptShown: sql`${estimatorSessions.promptShown} OR ${Boolean(recovery.shown)}`,
      clickedCall: sql`${estimatorSessions.clickedCall} OR ${Boolean(recovery.call)}`,
      clickedText: sql`${estimatorSessions.clickedText} OR ${Boolean(recovery.text)}`,
      dismissedPrompt: sql`${estimatorSessions.dismissedPrompt} OR ${Boolean(recovery.dismissed)}`,
      // A completion after the summary went out is a recovery, not a downgrade.
      status: completed
        ? sql`CASE WHEN ${estimatorSessions.status} = 'notified' THEN 'recovered' ELSE 'completed' END`
        : sql`${estimatorSessions.status}`,
      completedAt: completed ? sql`COALESCE(${estimatorSessions.completedAt}, ${now})` : sql`${estimatorSessions.completedAt}`,
      updatedAt: now,
    },
  });
  return { stored: true };
}

export interface CallbackRequest {
  sessionId: string;
  flow: string;
  phone: string;
  name?: string;
  note?: string;
  pagePath?: string;
  device?: string;
}

/**
 * Stores a callback request on the session and sends the staff notification
 * once. Retry-safe: a second request for the same session updates the phone
 * and does not send a second email.
 */
export async function recordCallbackRequest(req: CallbackRequest, now = new Date()): Promise<{ stored: boolean; notified: boolean; error?: string }> {
  const db = getDb();
  if (!db) return { stored: false, notified: false, error: "persistence_unavailable" };
  await ensureEstimatorSessionsTable();
  const phone = req.phone.replace(/\D/g, "").slice(-10);
  const name = req.name?.trim().slice(0, 80) || null;
  const note = req.note?.trim().slice(0, 500) || null;
  await db.insert(estimatorSessions).values({
    id: req.sessionId,
    site: SITE_CONFIG.name,
    flow: STEP_RE.test(req.flow) ? req.flow : "unknown",
    pagePath: sanitizePath(req.pagePath),
    device: req.device && /^(phone|tablet|desktop)$/.test(req.device) ? req.device : "unknown",
    lastActivityAt: now,
    engaged: true,
    promptShown: true,
    requestedCallback: true,
    contactName: name,
    contactPhone: phone,
    callbackNote: note,
    callbackRequestedAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: estimatorSessions.id,
    set: {
      lastActivityAt: now,
      engaged: true,
      promptShown: true,
      requestedCallback: true,
      contactName: sql`COALESCE(${name}, ${estimatorSessions.contactName})`,
      contactPhone: phone,
      callbackNote: sql`COALESCE(${note}, ${estimatorSessions.callbackNote})`,
      callbackRequestedAt: sql`COALESCE(${estimatorSessions.callbackRequestedAt}, ${now})`,
      updatedAt: now,
    },
  });

  // Claim the notification atomically so a retried request cannot send twice.
  const claimed = await db.update(estimatorSessions)
    .set({ callbackNotifiedAt: now })
    .where(and(eq(estimatorSessions.id, req.sessionId), isNull(estimatorSessions.callbackNotifiedAt)))
    .returning();
  if (claimed.length === 0) return { stored: true, notified: false };
  const session = claimed[0];
  try {
    await sendToAdmins(buildCallbackEmail(session));
    return { stored: true, notified: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Release the claim so the sweep (or a retry) can send it later.
    await db.update(estimatorSessions)
      .set({ callbackNotifiedAt: null, notifyLastError: `callback: ${message}`.slice(0, 500), updatedAt: new Date() })
      .where(eq(estimatorSessions.id, req.sessionId));
    console.error("[estimator-recovery] callback notification failed", { sessionId: req.sessionId, message });
    return { stored: true, notified: false, error: message };
  }
}

async function sendToAdmins(email: { subject: string; html: string }): Promise<void> {
  if (mailerOverride) return mailerOverride(email);
  const { client } = await getUncachableEmailClient();
  const recipients = await getAdminRecipientEmails(SITE_CONFIG.email);
  for (const to of recipients) {
    const result = await client.emails.send({
      from: formatFromAddress(),
      to,
      subject: email.subject,
      html: email.html,
      text: htmlToPlainText(email.html),
    });
    if (result?.error) throw new Error(typeof result.error === "string" ? result.error : JSON.stringify(result.error));
  }
}

export interface SweepResult {
  considered: number;
  sent: number;
  failed: number;
  purged: number;
  skipped: boolean;
}

let lastSweepAt = 0;
let sweepInFlight: Promise<SweepResult> | null = null;

/**
 * Opportunistic sweep: called from the progress endpoint so the feature works
 * with no external scheduler, throttled to once per SWEEP_MIN_INTERVAL_MS per
 * server instance. The internal endpoint calls the unthrottled sweep.
 */
export function sweepIfDue(now = new Date()): Promise<SweepResult> {
  if (sweepInFlight) return sweepInFlight;
  if (now.getTime() - lastSweepAt < SWEEP_MIN_INTERVAL_MS) {
    return Promise.resolve({ considered: 0, sent: 0, failed: 0, purged: 0, skipped: true });
  }
  lastSweepAt = now.getTime();
  sweepInFlight = sweepAbandonedSessions({ now, limit: 10 }).finally(() => { sweepInFlight = null; });
  return sweepInFlight;
}

export async function sweepAbandonedSessions(opts: { now?: Date; limit?: number } = {}): Promise<SweepResult> {
  const now = opts.now ?? new Date();
  const limit = opts.limit ?? 50;
  const result: SweepResult = { considered: 0, sent: 0, failed: 0, purged: 0, skipped: false };
  const db = getDb();
  if (!db) return { ...result, skipped: true };
  await ensureEstimatorSessionsTable();

  const idleBefore = new Date(now.getTime() - INACTIVITY_MS);
  const lockExpired = new Date(now.getTime() - NOTIFY_LOCK_MS);
  const candidates = await db.select({ id: estimatorSessions.id }).from(estimatorSessions)
    .where(and(
      eq(estimatorSessions.status, "active"),
      eq(estimatorSessions.engaged, true),
      eq(estimatorSessions.requestedCallback, false),
      lt(estimatorSessions.lastActivityAt, idleBefore),
      lt(estimatorSessions.notifyAttemptCount, MAX_NOTIFY_ATTEMPTS),
      or(isNull(estimatorSessions.notifyLockedAt), lt(estimatorSessions.notifyLockedAt, lockExpired)),
    ))
    .limit(limit);
  result.considered = candidates.length;

  for (const { id } of candidates) {
    // Atomic claim: re-checks eligibility inside the UPDATE so a concurrent
    // worker or a completion that just landed cannot race us.
    const claimed = await db.update(estimatorSessions)
      .set({ notifyLockedAt: now, notifyAttemptCount: sql`${estimatorSessions.notifyAttemptCount} + 1`, updatedAt: now })
      .where(and(
        eq(estimatorSessions.id, id),
        eq(estimatorSessions.status, "active"),
        eq(estimatorSessions.requestedCallback, false),
        lt(estimatorSessions.lastActivityAt, idleBefore),
        or(isNull(estimatorSessions.notifyLockedAt), lt(estimatorSessions.notifyLockedAt, lockExpired)),
      ))
      .returning();
    if (claimed.length === 0) continue;
    const session = claimed[0];
    try {
      await sendToAdmins(buildAbandonmentEmail(session));
      // Stamp only on a successful send, and only if still not completed.
      await db.update(estimatorSessions)
        .set({ status: sql`CASE WHEN ${estimatorSessions.status} = 'active' THEN 'notified' ELSE ${estimatorSessions.status} END`, notifiedAt: now, notifyLockedAt: null, notifyLastError: null, updatedAt: now })
        .where(eq(estimatorSessions.id, id));
      result.sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.update(estimatorSessions)
        .set({ notifyLastError: message.slice(0, 500), notifyLockedAt: null, updatedAt: now })
        .where(eq(estimatorSessions.id, id));
      console.error("[estimator-recovery] abandonment email failed", { sessionId: id, message });
      result.failed += 1;
    }
  }

  // Sessions that were never engaged expire quietly; everything is purged after retention.
  const retentionCutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 3600 * 1000);
  const purged = await db.delete(estimatorSessions).where(lt(estimatorSessions.createdAt, retentionCutoff)).returning({ id: estimatorSessions.id });
  result.purged = purged.length;
  const staleCutoff = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  await db.update(estimatorSessions)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(estimatorSessions.status, "active"), eq(estimatorSessions.engaged, false), lt(estimatorSessions.lastActivityAt, staleCutoff)));
  return result;
}

export type { EstimatorSession };
