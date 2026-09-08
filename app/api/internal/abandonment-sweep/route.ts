import { NextResponse } from "next/server";
import { sweepAbandonedSessions } from "@/server/services/estimatorSessions";

export const dynamic = "force-dynamic";

/**
 * Scheduled sweep for abandoned estimator sessions. The progress endpoint
 * already runs a throttled sweep opportunistically; schedule this every 10
 * minutes (Replit Scheduled Deployment or any cron) so summaries still go out
 * on a quiet site with no new visitors to trigger it.
 *
 * Auth: Bearer CRON_SECRET (or LEAD_DASHBOARD_KEY, which the delivery retry
 * worker already uses). Refuses to run unauthenticated.
 */
function authorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : request.headers.get("x-cron-secret")?.trim() ?? "";
  const secrets = [process.env.CRON_SECRET, process.env.LEAD_DASHBOARD_KEY].filter((s): s is string => Boolean(s));
  return secrets.length > 0 && token.length > 0 && secrets.includes(token);
}

async function run(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try {
    const result = await sweepAbandonedSessions({ limit: 50 });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[abandonment-sweep] failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: "sweep_failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
