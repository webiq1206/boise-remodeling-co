import { COST_BOOK, isStale, matchRate, type Rate } from "./costBook";
import { attributeKey, type ClassifiedWork } from "./workTypes";
import { buildQuestions, type ClarifiableItem, type ClarifyingQuestion } from "./clarify";
import { TRADE_LABELS, type StatedUnit, type TakeoffUnit, type Trade } from "./units";

/**
 * Turning a takeoff into a bid, and being honest about the difference.
 *
 * THE THREE OUTCOMES, AND WHY THERE ARE THREE. A scope item is either
 * PRICED (quantity, unit and a rate all present), MEASURED BUT UNPRICED (we
 * know how much there is, nobody has given us a rate), or UNMEASURED (the
 * drawings did not say enough to quantify it). Collapsing those into two -
 * "priced" and "not priced" - loses the distinction that matters most to an
 * estimator, which is whether the missing thing is a NUMBER or a MEASUREMENT.
 * One is an afternoon with a rate card; the other is a question for the
 * architect.
 *
 * A bid total is only ever the sum of the priced lines, and it is always
 * reported alongside how much of the scope it actually covers. A total that
 * silently excludes forty percent of the work is the single most expensive
 * thing this software could produce.
 */

export interface TakeoffItem {
  description: string;
  trade: Trade;
  quantity: number;
  unit: StatedUnit;
  sheet: string | null;
  commercialStatus: "base" | "allowance" | "alternate" | "optional";
  inContract: boolean;
  statedAmount?: number;
  /**
   * What the item IS, from the classifier. Optional so a caller without a
   * classification still gets a takeoff; without it nothing can price, which
   * is the honest outcome rather than a fallback rate.
   */
  work?: ClassifiedWork;
}

export interface PricedLine {
  item: TakeoffItem;
  rate: Rate;
  /** quantity x unitCost, before any markup. */
  cost: number;
  rateIsStale: boolean;
  /** Set when the rate matched the work but not the grade. */
  caveat?: string;
}

export interface BidMarkup {
  /** Site supervision, temporary services, cleanup. Share of direct cost. */
  generalConditions: number;
  /** Unknowns. Share of direct + general conditions. */
  contingency: number;
  /** True gross margin, applied as cost / (1 - margin). Never a markup. */
  margin: number;
  /** Bond and insurance, where a commercial job carries them. */
  bondAndInsurance: number;
}

/**
 * Defaults deliberately mirror the residential engine's published policy so
 * the two cannot drift apart silently. A commercial job usually carries
 * different numbers, which is why they are an input rather than a constant.
 */
export const DEFAULT_MARKUP: BidMarkup = {
  generalConditions: 0.1,
  contingency: 0.1,
  margin: 0.3,
  bondAndInsurance: 0,
};

export interface BidResult {
  priced: PricedLine[];
  /** Quantified, but no rate on file. The estimator supplies the number. */
  measuredUnpriced: TakeoffItem[];
  /** The drawings did not say enough to measure it. A question, not a rate. */
  unmeasured: TakeoffItem[];
  /** Carried separately, never in the base total. */
  allowances: TakeoffItem[];
  alternates: TakeoffItem[];
  excluded: TakeoffItem[];

  directCost: number;
  generalConditions: number;
  contingency: number;
  bondAndInsurance: number;
  totalCost: number;
  /** cost / (1 - margin). Zero when nothing could be priced. */
  sellingPrice: number;

  /** 0 to 1: share of in-scope base items that carry a price. */
  scopeCoverage: number;
  /** True only when every base item priced. Gates presenting a total. */
  completeBid: boolean;
  warnings: string[];
  /**
   * What to ask, best question first, one at a time.
   *
   * This is the difference between "we cannot price 20 items" and a working
   * estimate: each answer is applied and the next question is chosen knowing
   * it. See shared/takeoff/clarify.ts.
   */
  questions: ClarifyingQuestion[];
}

export function buildBid(
  items: TakeoffItem[],
  markup: BidMarkup = DEFAULT_MARKUP,
  book: Rate[] = COST_BOOK,
): BidResult {
  const priced: PricedLine[] = [];
  const measuredUnpriced: TakeoffItem[] = [];
  const unmeasured: TakeoffItem[] = [];
  const allowances: TakeoffItem[] = [];
  const alternates: TakeoffItem[] = [];
  const excluded: TakeoffItem[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    if (!item.inContract) {
      excluded.push(item);
      continue;
    }
    if (item.commercialStatus === "allowance") {
      allowances.push(item);
      continue;
    }
    if (item.commercialStatus === "alternate" || item.commercialStatus === "optional") {
      alternates.push(item);
      continue;
    }

    if (!item.unit || item.quantity <= 0) {
      unmeasured.push(item);
      continue;
    }

    /* A classification we do not trust must NOT reach a rate. Pricing a
       misread assembly at a confident rate is a wrong number wearing a right
       one's clothes; it goes to a question instead. */
    if (!item.work || item.work.confidence < 0.6) {
      measuredUnpriced.push(item);
      continue;
    }

    const grade = attributeKey(item.work.attributes) as Rate["grade"];
    const match = matchRate(item.work.workType, grade, item.unit as TakeoffUnit, book);
    if (!match) {
      measuredUnpriced.push(item);
      continue;
    }
    const stale = isStale(match.rate);
    if (stale) {
      warnings.push(`Rate "${match.rate.label}" was last confirmed ${match.rate.effective} and may be out of date.`);
    }
    if (match.caveat) warnings.push(`${item.description.slice(0, 60)}: ${match.caveat}`);
    priced.push({
      item,
      rate: match.rate,
      cost: item.quantity * match.rate.unitCost,
      rateIsStale: stale,
      caveat: match.caveat,
    });
  }

  const directCost = priced.reduce((sum, line) => sum + line.cost, 0);
  const generalConditions = directCost * markup.generalConditions;
  const contingency = (directCost + generalConditions) * markup.contingency;
  const bondAndInsurance = (directCost + generalConditions + contingency) * markup.bondAndInsurance;
  const totalCost = directCost + generalConditions + contingency + bondAndInsurance;
  // True gross margin, never a markup on cost. Same rule as both engines.
  const sellingPrice = markup.margin < 1 && totalCost > 0 ? totalCost / (1 - markup.margin) : 0;

  const baseItems = priced.length + measuredUnpriced.length + unmeasured.length;
  const scopeCoverage = baseItems === 0 ? 0 : priced.length / baseItems;

  if (measuredUnpriced.length > 0) {
    const trades = [...new Set(measuredUnpriced.map((i) => TRADE_LABELS[i.trade]))];
    warnings.push(
      `${measuredUnpriced.length} item(s) are measured but have no rate on file (${trades.join(", ")}). ` +
        `They are NOT in the total.`,
    );
  }

  /* The question queue is built from EVERY unpriced base item, measured or
     not, so one pass produces the whole interview rather than a total that
     silently omits things. */
  const clarifiable: ClarifiableItem[] = [];
  for (const line of priced) {
    clarifiable.push({
      description: line.item.description,
      trade: line.item.trade,
      quantity: line.item.quantity,
      unit: line.item.unit,
      sheet: line.item.sheet,
      work: line.item.work ?? { workType: "unclassified", trade: line.item.trade, attributes: {}, confidence: 1, needsToKnow: [] },
      priced: true,
    });
  }
  for (const item of [...measuredUnpriced, ...unmeasured]) {
    clarifiable.push({
      description: item.description,
      trade: item.trade,
      quantity: item.quantity,
      unit: item.unit,
      sheet: item.sheet,
      work: item.work ?? { workType: "unclassified", trade: item.trade, attributes: {}, confidence: 0, needsToKnow: [] },
      priced: false,
    });
  }
  const questions = buildQuestions(clarifiable);
  if (unmeasured.length > 0) {
    warnings.push(
      `${unmeasured.length} item(s) could not be quantified from the drawings and are NOT in the total.`,
    );
  }

  return {
    priced,
    measuredUnpriced,
    unmeasured,
    allowances,
    alternates,
    excluded,
    directCost: Math.round(directCost),
    generalConditions: Math.round(generalConditions),
    contingency: Math.round(contingency),
    bondAndInsurance: Math.round(bondAndInsurance),
    totalCost: Math.round(totalCost),
    sellingPrice: Math.round(sellingPrice),
    scopeCoverage,
    /* A bid is COMPLETE only when every base item priced. Anything less and
       the total is a partial sum, which must never be presented as a bid. */
    completeBid: measuredUnpriced.length === 0 && unmeasured.length === 0 && priced.length > 0,
    warnings,
    questions,
  };
}

/** The takeoff as a document, whether or not anything could be priced. */
export function renderTakeoff(bid: BidResult): string {
  const lines: string[] = ["QUANTITY TAKEOFF", ""];
  const byTrade = new Map<Trade, TakeoffItem[]>();
  const all = [
    ...bid.priced.map((p) => p.item),
    ...bid.measuredUnpriced,
    ...bid.unmeasured,
  ];
  for (const item of all) {
    const list = byTrade.get(item.trade) ?? [];
    list.push(item);
    byTrade.set(item.trade, list);
  }
  for (const [trade, items] of byTrade) {
    lines.push(`${TRADE_LABELS[trade].toUpperCase()} (${items.length})`);
    for (const item of items) {
      const qty = item.quantity > 0 && item.unit ? `${item.quantity} ${item.unit}` : "not measured";
      lines.push(`  ${qty.padEnd(14)} ${item.description}${item.sheet ? `  [${item.sheet}]` : ""}`);
    }
    lines.push("");
  }
  if (bid.allowances.length > 0) {
    lines.push("ALLOWANCES (placeholders, not confirmed scope)");
    for (const a of bid.allowances) {
      lines.push(`  ${a.statedAmount ? `$${a.statedAmount.toLocaleString("en-US")}` : "no figure"}  ${a.description}`);
    }
    lines.push("");
  }
  if (bid.alternates.length > 0) {
    lines.push("ALTERNATES AND OPTIONS - NOT IN THE BASE NUMBER");
    for (const a of bid.alternates) lines.push(`  ${a.description}`);
    lines.push("");
  }
  if (bid.excluded.length > 0) {
    lines.push("BY OTHERS / NOT IN CONTRACT");
    for (const e of bid.excluded) lines.push(`  ${e.description}`);
  }
  return lines.join("\n");
}
