/**
 * Every published price figure on this site, read from the P5 instant
 * estimator (owner, 20 November 2026: "We should always base everything off
 * of the engine as long as you're getting the actual numbers from the
 * engine/cost book. I do not want to mislead people.").
 *
 * The numbers live in p5PublishedFigures.json, written by
 * scripts/pricing/p5-published-figures.mts from priceEstimate() and
 * customerEstimate() in p5-home-co. Copy never types a dollar figure for a
 * project the estimator prices: it calls one of these helpers, so a cost book
 * change is one re-run of the script. tests/p5-published-figures.test.ts
 * fails on a range in the copy that is not in the JSON.
 *
 * Wording: these are instant preliminary estimates, a range shown on screen.
 * Never call one a quote, a bid or a final price.
 */
import data from './p5PublishedFigures.json';

export type P5FigureKey = keyof typeof data.figures;
export type P5Tier = 'builder' | 'mid' | 'high' | 'luxury';

type Range = { low: number; high: number };
type TierEntry = { label: string; estimator: Range; published: Range; perSqft?: Range };
type Figure = {
  project: string;
  title: string;
  label: string;
  sqft: number | null;
  answers: Record<string, unknown>;
  tiers: Partial<Record<P5Tier, TierEntry>>;
};

const FIGURES = data.figures as unknown as Record<P5FigureKey, Figure>;

/** "November 2026": the month the figures were generated. */
export const P5_AS_OF = data.asOf;

/** The source line a page can print under a figure. */
export const P5_SOURCE_NOTE = `Preliminary ranges from our instant estimate, as of ${data.asOf}. Your written scope after the free in-home visit sets the price.`;

export function p5Figure(key: P5FigureKey): Figure {
  const figure = FIGURES[key];
  if (!figure) throw new Error(`Unknown P5 figure ${String(key)}`);
  return figure;
}

function entry(key: P5FigureKey, tier: P5Tier): TierEntry {
  const found = p5Figure(key).tiers[tier];
  if (!found) throw new Error(`P5 figure ${String(key)} has no ${tier} tier`);
  return found;
}

/** 58000 -> "$58,000". */
export function money(n: number): string {
  return '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 58000 -> "$58k", 6100 -> "$6.1k". */
export function moneyShort(n: number): string {
  const k = n / 1000;
  return '$' + (Number.isInteger(k) ? String(k) : k.toFixed(1)) + 'k';
}

/** The finish level's name in the estimator: Essential, Signature, Premium or Luxury. */
export function tierName(tier: P5Tier): string {
  return entry('kitchen-replace-medium', tier).label;
}

/** The published range at one finish level: "$58,000 to $67,000". */
export function p5Range(key: P5FigureKey, tier: P5Tier = 'mid'): string {
  const { low, high } = entry(key, tier).published;
  return `${money(low)} to ${money(high)}`;
}

export function p5Low(key: P5FigureKey, tier: P5Tier = 'mid'): string {
  return money(entry(key, tier).published.low);
}

export function p5High(key: P5FigureKey, tier: P5Tier = 'mid'): string {
  return money(entry(key, tier).published.high);
}

/** Essential low to Luxury high: "$41,000 to $140,000". */
export function p5Span(key: P5FigureKey, from: P5Tier = 'builder', to: P5Tier = 'luxury'): string {
  return `${money(entry(key, from).published.low)} to ${money(entry(key, to).published.high)}`;
}

/** The range per square foot at one finish level: "$232 to $268 per sq ft". */
export function p5PerSqft(key: P5FigureKey, tier: P5Tier = 'mid'): string {
  const per = entry(key, tier).perSqft;
  if (!per) throw new Error(`P5 figure ${String(key)} has no size`);
  return `${money(per.low)} to ${money(per.high)} per sq ft`;
}

/** What the figure was run for, in words: "a medium kitchen (about 150 sq ft) ...". */
export function p5Label(key: P5FigureKey): string {
  return p5Figure(key).label;
}

/**
 * A range with its basis, ready for a sentence:
 * "$48,000 to $56,000 for a medium kitchen (about 150 sq ft) with new cabinets
 * and finishes in the same layout, at the Signature level".
 */
export function p5Cite(key: P5FigureKey, tier: P5Tier = 'mid'): string {
  return `${p5Range(key, tier)} for ${p5Label(key)}, at the ${tierName(tier)} level`;
}

/** Every published range and per-square-foot range, for the drift test. */
export function allPublishedRanges(): { key: P5FigureKey; tier: P5Tier; kind: 'total' | 'perSqft'; low: number; high: number }[] {
  const out: { key: P5FigureKey; tier: P5Tier; kind: 'total' | 'perSqft'; low: number; high: number }[] = [];
  for (const [key, figure] of Object.entries(FIGURES) as [P5FigureKey, Figure][]) {
    for (const [tier, t] of Object.entries(figure.tiers) as [P5Tier, TierEntry][]) {
      out.push({ key, tier, kind: 'total', ...t.published });
      if (t.perSqft) out.push({ key, tier, kind: 'perSqft', ...t.perSqft });
    }
  }
  return out;
}
