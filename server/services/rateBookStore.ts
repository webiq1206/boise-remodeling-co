import { db } from "@/lib/db";
import { siteSettings } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { COST_BOOK, type Rate } from "@/shared/takeoff/costBook";
import { TRADES, TAKEOFF_UNITS } from "@/shared/takeoff/units";

/**
 * Where answered rates live.
 *
 * THE POINT OF PERSISTING THEM. A rate question answered once should never be
 * asked again - not on the next page of this bid, and not on next month's job.
 * That is what turns the clarification loop from a questionnaire into a
 * company asset: the book is assembled out of the work actually bid, priced by
 * the person who knows, instead of bought as a national average that was never
 * true in this market.
 *
 * NO SCHEMA MIGRATION. Stored as one JSON row in `siteSettings`, the same
 * pattern the unit-cost overrides already use, because adding a table means
 * `db:push` against a live database and that is not a side effect of shipping
 * a feature.
 *
 * VALIDATED ON READ. A malformed or hand-edited blob must never take pricing
 * down, and a garbage rate must never reach a bid - anything that does not
 * parse cleanly is dropped, and the work it would have priced goes back to
 * being a question, which is the safe direction to fail.
 */

export const RATE_BOOK_SETTINGS_KEY = "pricing.rateBook";

/** Above this, a per-unit rate is far more likely a typo than a price. */
export const MAX_UNIT_COST = 1_000_000;

function isValidRate(value: unknown): value is Rate {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.workType === "string" &&
    r.workType.length > 0 &&
    typeof r.label === "string" &&
    ["economy", "standard", "premium", "custom"].includes(r.grade as string) &&
    TRADES.includes(r.trade as never) &&
    TAKEOFF_UNITS.includes(r.unit as never) &&
    typeof r.unitCost === "number" &&
    Number.isFinite(r.unitCost) &&
    r.unitCost > 0 &&
    r.unitCost <= MAX_UNIT_COST &&
    ["historical", "subcontractor", "published", "judgement"].includes(r.basis as string) &&
    typeof r.effective === "string"
  );
}

export async function readRateBook(): Promise<Rate[]> {
  if (!db) return COST_BOOK;
  try {
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, RATE_BOOK_SETTINGS_KEY));
    if (rows.length === 0) return COST_BOOK;
    const parsed = JSON.parse(rows[0].value) as unknown;
    if (!Array.isArray(parsed)) return COST_BOOK;
    return [...COST_BOOK, ...parsed.filter(isValidRate)];
  } catch {
    // A bad blob must not break pricing; fall back to what ships in code.
    return COST_BOOK;
  }
}

/**
 * Add or replace rates.
 *
 * Keyed on work type + grade + unit, so answering the same question again
 * updates the number rather than accumulating duplicates that would then
 * compete in `matchRate`.
 */
export async function saveRates(incoming: Rate[], updatedBy?: string): Promise<{ ok: boolean; saved: number }> {
  if (!db) return { ok: false, saved: 0 };
  const valid = incoming.filter(isValidRate);
  if (valid.length === 0) return { ok: false, saved: 0 };

  try {
    const existing = await readRateBook();
    const merged = new Map<string, Rate>();
    for (const rate of existing) merged.set(`${rate.workType}|${rate.grade}|${rate.unit}`, rate);
    for (const rate of valid) merged.set(`${rate.workType}|${rate.grade}|${rate.unit}`, rate);

    const value = JSON.stringify([...merged.values()]);
    const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, RATE_BOOK_SETTINGS_KEY));
    if (rows.length > 0) {
      await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date(), updatedBy: updatedBy ?? null })
        .where(eq(siteSettings.key, RATE_BOOK_SETTINGS_KEY));
    } else {
      await db.insert(siteSettings).values({
        key: RATE_BOOK_SETTINGS_KEY,
        value,
        updatedAt: new Date(),
        updatedBy: updatedBy ?? null,
      });
    }
    return { ok: true, saved: valid.length };
  } catch (err) {
    console.error("[rateBookStore] could not save rates:", err);
    return { ok: false, saved: 0 };
  }
}

export { isValidRate };
