import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import data from '../shared/content/p5PublishedFigures.json';
import { allPublishedRanges, money, moneyShort } from '../shared/content/p5Figures.ts';
import { SERVICE_SEO_CONTENT } from '../shared/seoContent.ts';
import { CITY_SERVICE_COPY } from '../shared/content/cityServiceCopy.ts';
import { ALL_BLOG_POSTS } from '../shared/content/allBlogPosts.ts';
import { GUIDE_PAGES } from '../shared/guideContent.ts';
import { CONTENT_HUBS } from '../shared/contentHubs.ts';
import { getHubPillarFaqs } from '../shared/content/hubFaqs.ts';
import { SERVICES } from '../shared/contentData.ts';
import { GBP_POSTS_STARTER, GBP_PRODUCTS, GBP_QA_SEED, GBP_SERVICES } from '../shared/gbpProfile.ts';
import { BUDGET_WORKSHEET_BLOCKS } from '../shared/resourcePdfContent.ts';

// Owner, 20 November 2026: "We should always base everything off of the
// engine as long as you're getting the actual numbers from the engine/cost
// book. I do not want to mislead people." Every published project price on
// this site comes from the P5 instant estimator through
// shared/content/p5PublishedFigures.json (scripts/pricing/p5-published-figures.mts).
// This test pins the copy to that file so the two cannot drift.

type Range = { low: number; high: number };
type Tier = { estimator: Range; published: Range; perSqft?: Range };
const FIGURES = data.figures as unknown as Record<string, { tiers: Record<string, Tier> }>;
const TIER_ORDER = data.tierOrder as string[];

test('figures are priced at the labor rate the live estimator bills', () => {
  // Owner, 20 November 2026: the live estimator bills labor at $120 an hour
  // (the code default is $125). The rate is an input of the generator.
  assert.equal(data.source.laborRate, 120);
  assert.equal(data.source.laborRateNote, 'labor $120/h per owner, 20 November 2026');
  const script = readFileSync(path.resolve(import.meta.dirname, '../scripts/pricing/p5-published-figures.mts'), 'utf8');
  assert.match(script, /const LABOR_RATE = 120;/);
  assert.match(script, /settings: SETTINGS/);
});

test('published figures are the estimator range, widened to a round number and never narrowed', () => {
  assert.ok(Object.keys(FIGURES).length >= 20);
  for (const [key, figure] of Object.entries(FIGURES)) {
    for (const [tier, t] of Object.entries(figure.tiers)) {
      const step = (n: number) => (n >= 10_000 ? 1_000 : 100);
      assert.ok(t.published.low <= t.estimator.low, `${key} ${tier}: low is not below the estimator`);
      assert.ok(t.published.high >= t.estimator.high, `${key} ${tier}: high is not above the estimator`);
      assert.equal(t.published.low, Math.floor(t.estimator.low / step(t.estimator.low)) * step(t.estimator.low), `${key} ${tier} low`);
      assert.equal(t.published.high, Math.ceil(t.estimator.high / step(t.estimator.high)) * step(t.estimator.high), `${key} ${tier} high`);
    }
  }
});

// Every "$A to $B" style range in the published copy must be one the JSON
// holds: a finish level's range, a span across finish levels of one figure,
// or a per-square-foot range. The few that are not project prices are named.
const NOT_PROJECT_PRICES: Record<string, string> = {
  '$25,001 to $50,000': 'Kuna permit fee valuation tier (city fee schedule)',
  '$50,001 to $100,000': 'Kuna permit fee valuation tier (city fee schedule)',
  '$25,000 to $49,999': 'Caldwell permit fee valuation tier (city fee schedule)',
  '$50,000 to $99,999': 'Caldwell permit fee valuation tier (city fee schedule)',
  '$50,000 to $80,000': 'a hypothetical spread of three competing bids, in "why remodeling bids vary"',
  '$67,000 to $71,000': 'the same hypothetical bids ("the $67,000 and $71,000 bids")',
};

function allowedRanges(): Set<string> {
  const out = new Set<string>();
  for (const r of allPublishedRanges()) out.add(`${money(r.low)} to ${money(r.high)}`);
  for (const [, figure] of Object.entries(FIGURES)) {
    const tiers = TIER_ORDER.filter((t) => figure.tiers[t]);
    for (let i = 0; i < tiers.length; i++) {
      for (let j = i; j < tiers.length; j++) {
        out.add(`${money(figure.tiers[tiers[i]].published.low)} to ${money(figure.tiers[tiers[j]].published.high)}`);
        const a = figure.tiers[tiers[i]].perSqft;
        const b = figure.tiers[tiers[j]].perSqft;
        if (a && b) out.add(`${money(a.low)} to ${money(b.high)}`);
      }
    }
  }
  return out;
}

function publishedText(): string {
  const hubFaqs = CONTENT_HUBS.map((hub) => getHubPillarFaqs(hub.slug));
  return JSON.stringify([
    SERVICE_SEO_CONTENT,
    CITY_SERVICE_COPY,
    ALL_BLOG_POSTS,
    GUIDE_PAGES,
    hubFaqs,
    SERVICES,
    GBP_SERVICES,
    GBP_PRODUCTS,
    GBP_QA_SEED,
    GBP_POSTS_STARTER,
    BUDGET_WORKSHEET_BLOCKS,
  ]);
}

const RANGE = /\$(\d{1,3}(?:,\d{3})*)(?:\.\d+)?\s*(?:k|K)?\s*(?:to|and|-|–)\s*\$(\d{1,3}(?:,\d{3})*)(?:\.\d+)?/g;

test('every price range in the published copy comes from the instant estimator', () => {
  const allowed = allowedRanges();
  const text = publishedText();
  const strays = new Set<string>();
  let checked = 0;
  for (const match of text.matchAll(RANGE)) {
    const shown = `$${match[1]} to $${match[2]}`;
    checked++;
    if (allowed.has(shown) || NOT_PROJECT_PRICES[shown]) continue;
    strays.add(`${match[0]} (${text.slice(Math.max(0, match.index! - 80), match.index!).replace(/\s+/g, ' ')})`);
  }
  assert.deepEqual([...strays], [], 'ranges that are not in p5PublishedFigures.json');
  assert.ok(checked > 100, `the scan found the copy's ranges (${checked})`);
});

// The retired PRICE_MATRIX figures (research note seo-audit/pricing,
// 20 November 2026). None may come back in any form.
const RETIRED = [
  '$37,000', '$47,000', '$16,000 to $21,000', '$16,000-$21,000', '$85,000 to $166,000', '$136,000', '$166,000',
  '$22,000-$28,000', '$150-$190', '$180,000', '$425,000', '$80,000 to $250,000', '$80,000–$250,000',
  '$18,000 to $45,000', '$18,000–$45,000', '$35,000 to $85,000', '$35,000–$85,000', '$40,000 to $100,000',
  '$90,000 to $180,000', '$120,000 to $250,000', '$25,000 to $75,000', '$25,000 to $60,000', '$20,000 to $45,000',
  '$600,000-$816,000', '$40-$53', '$100-$133', '$193-$236', '$240-$560', '$93,000', '$96,000-$224,000',
  '$15k', '$72k', '$90k', '$35K', '$90K',
];

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'costs' || name === 'p5' || name === 'generated') continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.(ts|tsx|txt)$/.test(name) && !name.includes('.test.')) out.push(full);
  }
  return out;
}

test('no retired price figure is left in the published sources', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const files = [
    ...sourceFiles(path.join(root, 'shared/content')),
    ...sourceFiles(path.join(root, 'app')).filter((f) => !f.includes(`${path.sep}api${path.sep}`) && !f.includes(`${path.sep}admin`)),
    ...sourceFiles(path.join(root, 'components')),
    path.join(root, 'shared/seoContent.ts'),
    path.join(root, 'shared/contentData.ts'),
    path.join(root, 'shared/gbpProfile.ts'),
    path.join(root, 'shared/guideContent.ts'),
    path.join(root, 'shared/resourcePdfContent.ts'),
    path.join(root, 'public/llms.txt'),
    path.join(root, 'public/llms-full.txt'),
  ];
  const found: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const figure of RETIRED) if (text.includes(figure)) found.push(`${path.relative(root, file)}: ${figure}`);
  }
  assert.deepEqual(found, []);
});

test('starting prices are the Essential low of the figure each names', () => {
  const start: Record<string, string> = {
    'kitchen-remodel': 'kitchen-refresh-small',
    'bathroom-remodel': 'bath-powder-refresh',
    'whole-home-remodel': 'whole-home-1200',
    'room-addition': 'addition-room-200',
    'basement-remodel': 'basement-600',
  };
  for (const service of SERVICES) {
    const key = start[service.slug];
    if (!key) {
      assert.equal(service.planningFrom, undefined, `${service.slug}: the instant estimator does not price it, so no starting figure`);
      continue;
    }
    assert.equal(service.planningFrom, moneyShort(FIGURES[key].tiers.builder.published.low), service.slug);
    assert.match(service.planningFromBasis ?? '', /Essential level, from our instant estimate$/, service.slug);
  }
  const gbp = GBP_SERVICES.filter((s) => s.startingPrice).map((s) => s.startingPrice);
  assert.deepEqual(gbp, ['kitchen-refresh-small', 'bath-powder-refresh', 'whole-home-1200', 'addition-room-200', 'basement-600'].map((k) => money(FIGURES[k].tiers.builder.published.low)));
});

test('the copy calls it an instant preliminary estimate, never a quote', () => {
  const text = publishedText();
  assert.equal(/instant quote/i.test(text), false);
  assert.equal(/instant estimate (?:quote|bid)/i.test(text), false);
});
