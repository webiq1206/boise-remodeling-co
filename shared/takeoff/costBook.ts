import { TRADE_LABELS, type TakeoffUnit, type Trade } from "./units";

/**
 * The rate book: what this company can price, and what it cannot yet.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE. An estimator that can bid "anything"
 * is a takeoff engine plus a rate for every line it takes off. The takeoff
 * half is general - a quantity with a unit is a quantity with a unit whether
 * it came off a house or a steakhouse. The rate half is not, and cannot be
 * invented: the residential engine is trustworthy because it was back-tested
 * against real closed jobs, and a commercial rate guessed by software would
 * produce a confident, wrong bid on work worth six figures.
 *
 * So the book is OPEN and the gaps are LOUD. Every rate carries where it came
 * from and when it was last good. Scope with no rate on file is never dropped
 * and never guessed at - it comes back quantified, named, and marked as
 * needing a number, so a bid is short by a line the estimator can see rather
 * than by an omission nobody notices until the job is running.
 *
 * Populating this is the owner's job, and it is the only thing standing
 * between the current state and bidding a commercial package end to end.
 */

export type RateBasis =
  /** A real number from this company's own closed jobs. Strongest. */
  | "historical"
  /** A subcontractor's standing quote or published rate. */
  | "subcontractor"
  /** Published cost data (RSMeans and friends), localised. */
  | "published"
  /** An estimator's judgement, recorded as such. Weakest, and flagged. */
  | "judgement";

export interface Rate {
  /** Stable id, e.g. "millwork.bar-front". Referenced by assemblies. */
  id: string;
  /**
   * WHAT THE RATE IS FOR, at assembly level.
   *
   * Rates used to be looked up by trade and unit alone, which put a paneled
   * bar front and a glass display shelf in the same bucket - work that differs
   * by an order of magnitude. A book keyed that coarsely can only be wrong or
   * empty. Keyed by work type, one answer prices every line of that assembly
   * and nothing else.
   */
  workType: string;
  /** Quality tier this rate is for. A custom rate must not price a stock unit. */
  grade: "economy" | "standard" | "premium" | "custom";
  trade: Trade;
  label: string;
  unit: TakeoffUnit;
  /**
   * COST, not price. Markup is applied once, at the end, by the bid builder.
   * Mixing a marked-up rate into a book that is marked up again is the
   * classic way an estimate quietly gains twenty points.
   */
  unitCost: number;
  basis: RateBasis;
  /** Where this came from, in words. Shown on the internal breakdown. */
  source: string;
  /** ISO date the rate was last confirmed. Drives the staleness warning. */
  effective: string;
  /** Which kind of work it applies to. */
  market: "residential" | "commercial" | "both";
  /** Free-text scope note: what the rate does and does not include. */
  includes?: string;
}

/**
 * Rates go stale. A number that was right two years ago and is still being
 * quoted today is a silent loss, so the bid builder flags anything older.
 */
export const RATE_STALE_AFTER_DAYS = 365;

/**
 * THE BOOK STARTS EMPTY ON PURPOSE.
 *
 * It would be easy to seed this with plausible national averages and have the
 * estimator produce a number for anything. That is precisely the failure this
 * codebase has spent its life closing: a confident figure with nothing real
 * behind it. An empty book means a commercial bid comes back as a complete,
 * quantified takeoff with every line marked "no rate on file" - which is
 * useful, honest, and takes an estimator an afternoon to turn into a bid,
 * instead of a number that looks finished and is wrong.
 *
 * The residential engine is untouched and keeps pricing through its own
 * calibrated path; this book is what extends coverage beyond it.
 */
export const COST_BOOK: Rate[] = [];

export function ratesFor(trade: Trade, book: Rate[] = COST_BOOK): Rate[] {
  return book.filter((r) => r.trade === trade);
}

/**
 * Find the rate for a piece of work, most specific match first.
 *
 * THE LADDER IS THE POINT. An exact work type at the right grade is a real
 * answer. The same work type at another grade is a usable answer with a
 * caveat, because a company that prices premium bar fronts can price standard
 * ones and the estimator can see the substitution. Anything looser is NOT a
 * match: falling back to "some other millwork rate" is exactly the coarse
 * lookup this replaced, and it produces a confident wrong number instead of a
 * question. So the ladder stops at two rungs, and everything past it asks.
 */
export interface RateMatch {
  rate: Rate;
  /** "exact" when work type and grade both matched. */
  quality: "exact" | "different-grade";
  /** Set when a caveat should ride the line on the internal breakdown. */
  caveat?: string;
}

export function matchRate(
  workType: string,
  grade: Rate["grade"],
  unit: TakeoffUnit,
  book: Rate[] = COST_BOOK,
): RateMatch | null {
  const sameWork = book.filter((r) => r.workType === workType && r.unit === unit);
  const exact = sameWork.find((r) => r.grade === grade);
  if (exact) return { rate: exact, quality: "exact" };

  const other = sameWork[0];
  if (other) {
    return {
      rate: other,
      quality: "different-grade",
      caveat: `Priced from the ${other.grade} rate; this is drawn as ${grade}.`,
    };
  }
  return null;
}

/** Kept for the trade-level view; never used to price a line on its own. */
export function findRate(
  trade: Trade,
  unit: TakeoffUnit,
  book: Rate[] = COST_BOOK,
): Rate | null {
  return book.find((r) => r.trade === trade && r.unit === unit) ?? null;
}

/**
 * Turn an answered rate question into a rate.
 *
 * This is how coverage grows: the company's book is assembled out of the jobs
 * it actually bid, priced by the person who knows, rather than bought as a
 * national average that was never true here. Basis is "judgement" because that
 * is what it is - an estimator's number, recorded honestly, and improvable
 * later against a closed job.
 */
export function rateFromAnswer(input: {
  workType: string;
  trade: Trade;
  grade: Rate["grade"];
  unit: TakeoffUnit;
  unitCost: number;
  label: string;
  answeredOn: string;
}): Rate {
  return {
    id: `${input.trade}.${input.workType}.${input.grade}`,
    workType: input.workType,
    grade: input.grade,
    trade: input.trade,
    label: input.label,
    unit: input.unit,
    unitCost: input.unitCost,
    basis: "judgement",
    source: "Answered by the estimator while bidding",
    effective: input.answeredOn,
    market: "both",
  };
}

export function isStale(rate: Rate, today = new Date()): boolean {
  const then = Date.parse(rate.effective);
  if (Number.isNaN(then)) return true;
  return (today.getTime() - then) / 86_400_000 > RATE_STALE_AFTER_DAYS;
}

/** What the book can and cannot price, for the owner's admin view. */
export function bookCoverage(book: Rate[] = COST_BOOK): {
  trades: { trade: Trade; label: string; rates: number; stale: number }[];
  covered: Trade[];
  uncovered: Trade[];
} {
  const trades = (Object.keys(TRADE_LABELS) as Trade[]).map((trade) => {
    const rates = book.filter((r) => r.trade === trade);
    return {
      trade,
      label: TRADE_LABELS[trade],
      rates: rates.length,
      stale: rates.filter((r) => isStale(r)).length,
    };
  });
  return {
    trades,
    covered: trades.filter((t) => t.rates > 0).map((t) => t.trade),
    uncovered: trades.filter((t) => t.rates === 0).map((t) => t.trade),
  };
}
