import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKeyFrom, rateLimit } from "@/lib/rateLimit";
import { SESSION_ID_RE, recordProgress, sweepIfDue } from "@/server/services/estimatorSessions";

export const dynamic = "force-dynamic";

/**
 * Progress beacon for estimators and lead forms. Idempotent upsert keyed by the
 * browser's pseudonymous session id; the client sends it on step changes, on a
 * slow heartbeat, and via sendBeacon when the page is hidden. Every call also
 * gives the abandonment sweep a chance to run (throttled), so the feature needs
 * no external scheduler to send summaries.
 */
const schema = z.object({
  sessionId: z.string().regex(SESSION_ID_RE),
  flow: z.string().min(1).max(40),
  pagePath: z.string().max(400).optional(),
  device: z.enum(["phone", "tablet", "desktop"]).optional(),
  startedAt: z.number().int().positive().optional(),
  currentStep: z.string().max(60).optional(),
  currentStepIndex: z.number().int().min(0).max(50).optional(),
  lastCompletedStep: z.string().max(60).optional(),
  totalSteps: z.number().int().min(0).max(50).optional(),
  selections: z.record(z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
  validationErrors: z.array(z.string().max(80)).max(20).optional(),
  exitMethod: z.string().max(40).optional(),
  status: z.enum(["active", "completed"]).optional(),
  recovery: z.object({ shown: z.boolean().optional(), call: z.boolean().optional(), text: z.boolean().optional(), dismissed: z.boolean().optional() }).optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKeyFrom(request.headers, "estimator-session"), 120, 10 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  let raw: unknown;
  try {
    // sendBeacon posts text/plain; parse the body regardless of content type.
    raw = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  try {
    const { stored } = await recordProgress(parsed.data);
    const sweep = await sweepIfDue();
    return NextResponse.json({ ok: true, stored, sweep: sweep.skipped ? "skipped" : `sent ${sweep.sent}` });
  } catch (error) {
    console.error("[estimator-session] record failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "persistence_failed" }, { status: 503 });
  }
}
