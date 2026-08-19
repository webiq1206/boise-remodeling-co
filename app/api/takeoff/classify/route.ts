import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getSession, getUserFromDb } from "@/lib/auth";
import { classifyScope } from "@/server/services/scopeClassifier";
import { readRateBook } from "@/server/services/rateBookStore";
import { buildBid, DEFAULT_MARKUP, type TakeoffItem } from "@/shared/takeoff/bid";
import { TRADES, type Trade } from "@/shared/takeoff/units";

/**
 * Classify a takeoff and return the interview.
 *
 * ADMIN ONLY, and that is a design decision rather than a precaution. The
 * questions this produces are mostly RATE questions - "what do you charge per
 * linear foot for a custom bar front" - and the only person who can answer
 * that is whoever owns the pricing. Putting them in front of a customer would
 * be asking them to quote themselves.
 *
 * Measurement questions have the opposite audience and are surfaced in the
 * customer wizard instead; see shared/takeoff/clarify.ts for why the two are
 * kept apart.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

const itemSchema = z.object({
  description: z.string().min(1).max(2000),
  trade: z.enum(TRADES as unknown as [Trade, ...Trade[]]),
  quantity: z.number().nonnegative().max(10_000_000),
  unit: z.enum(["EA", "LF", "SF", "SY", "CY", "TON", "LB", "HR", "LS", ""]),
  sheet: z.string().max(60).nullable(),
  commercialStatus: z.enum(["base", "allowance", "alternate", "optional"]),
  inContract: z.boolean(),
  statedAmount: z.number().nonnegative().max(10_000_000).optional(),
});

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(600),
  markup: z
    .object({
      generalConditions: z.number().min(0).max(1),
      contingency: z.number().min(0).max(1),
      margin: z.number().min(0).max(0.95),
      bondAndInsurance: z.number().min(0).max(1),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await getUserFromDb(session.userId);
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "not-configured", message: "Classification is not configured on this environment." },
      { status: 503 },
    );
  }

  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", detail: parsed.error.flatten() }, { status: 400 });
  }

  const client = new Anthropic();
  const classified = await classifyScope(
    parsed.data.items.map((i) => ({ description: i.description, trade: i.trade, sheet: i.sheet })),
    client,
  );

  const items: TakeoffItem[] = parsed.data.items.map((item, i) => ({
    ...item,
    unit: item.unit,
    work: classified[i],
  }));

  // Priced against whatever the company has answered so far, so the interview
  // opens on the first thing genuinely still unknown.
  const book = await readRateBook();
  const bid = buildBid(items, parsed.data.markup ?? DEFAULT_MARKUP, book);

  return NextResponse.json({
    items: items.map((i) => ({ ...i, work: i.work })),
    bid: summarize(bid),
    questions: bid.questions,
    rateCount: book.length,
  });
}

/** The bid, without the internal Rate objects the browser has no use for. */
function summarize(bid: ReturnType<typeof buildBid>) {
  return {
    pricedCount: bid.priced.length,
    measuredUnpricedCount: bid.measuredUnpriced.length,
    unmeasuredCount: bid.unmeasured.length,
    allowanceCount: bid.allowances.length,
    alternateCount: bid.alternates.length,
    excludedCount: bid.excluded.length,
    directCost: bid.directCost,
    generalConditions: bid.generalConditions,
    contingency: bid.contingency,
    bondAndInsurance: bid.bondAndInsurance,
    totalCost: bid.totalCost,
    sellingPrice: bid.sellingPrice,
    scopeCoverage: bid.scopeCoverage,
    completeBid: bid.completeBid,
    warnings: bid.warnings,
    lines: bid.priced.map((l) => ({
      description: l.item.description,
      quantity: l.item.quantity,
      unit: l.item.unit,
      rateLabel: l.rate.label,
      unitCost: l.rate.unitCost,
      cost: Math.round(l.cost),
      caveat: l.caveat ?? null,
      stale: l.rateIsStale,
    })),
  };
}
