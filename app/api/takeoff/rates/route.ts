import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession, getUserFromDb } from "@/lib/auth";
import { readRateBook, saveRates, MAX_UNIT_COST } from "@/server/services/rateBookStore";
import { rateFromAnswer } from "@/shared/takeoff/costBook";
import { bookCoverage } from "@/shared/takeoff/costBook";
import { TAKEOFF_UNITS, TRADES, type TakeoffUnit, type Trade } from "@/shared/takeoff/units";

/**
 * The rate book: read it, and add to it by answering a question.
 *
 * Answering is the ONLY way rates get in. There is no seed file and no import
 * of national averages, because a number nobody here has stood behind is
 * exactly the confident-and-wrong failure the whole estimator is built to
 * avoid. Every rate records that it came from an estimator's judgement, on a
 * date, so it can be improved against a closed job later.
 */

export const runtime = "nodejs";

const answerSchema = z.object({
  workType: z.string().min(1).max(80),
  trade: z.enum(TRADES as unknown as [Trade, ...Trade[]]),
  grade: z.enum(["economy", "standard", "premium", "custom"]),
  unit: z.enum(TAKEOFF_UNITS as unknown as [TakeoffUnit, ...TakeoffUnit[]]),
  unitCost: z.number().positive().max(MAX_UNIT_COST),
  label: z.string().min(1).max(160),
});

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await getUserFromDb(session.userId);
  if (!user || user.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId: session.userId };
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const book = await readRateBook();
  return NextResponse.json({ rates: book, coverage: bookCoverage(book) });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  let parsed;
  try {
    parsed = answerSchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rate", detail: parsed.error.flatten() }, { status: 400 });
  }

  const rate = rateFromAnswer({
    ...parsed.data,
    answeredOn: new Date().toISOString().slice(0, 10),
  });
  const saved = await saveRates([rate], guard.userId);
  if (!saved.ok) {
    return NextResponse.json(
      { error: "not-saved", message: "The rate could not be saved. It has not been applied." },
      { status: 503 },
    );
  }
  const book = await readRateBook();
  return NextResponse.json({ ok: true, rate, rateCount: book.length });
}
