/**
 * Published price figures, generated from the P5 instant estimator.
 *
 * Owner instruction, 20 November 2026: "We should always base everything off
 * of the engine as long as you're getting the actual numbers from the
 * engine/cost book. I do not want to mislead people." The number a visitor
 * gets after "Get an instant estimate" is the P5 instant estimator on
 * p5homeco.com (framed at /instant-estimate), so every price figure this site
 * publishes for a project the estimator prices for brand "remodeling" comes
 * from it, through this script.
 *
 * It runs the real estimator code from a sibling p5-home-co checkout:
 * priceEstimate() then customerEstimate() (app/lib/estimator/price.ts), the
 * seed cost book and no database, at the inputs named in CASES below. The
 * scope settings are DEFAULT_SCOPE_SETTINGS with the one value the live
 * estimator is known to change: the labor rate (LABOR_RATE below). It writes shared/content/p5PublishedFigures.json, which the
 * site reads at build time; the site has no runtime dependency on p5-home-co.
 *
 *   node --experimental-strip-types scripts/pricing/p5-published-figures.mts
 *   node --experimental-strip-types scripts/pricing/p5-published-figures.mts --check
 *
 * P5_HOME_CO names the checkout (default ../p5-home-co). --check regenerates
 * in memory and fails when the committed JSON differs, which is what to run
 * after a cost book or recipe change in p5-home-co. Re-run it, then read the
 * copy that uses a figure that moved (tests/p5-published-figures.test.ts lists
 * every place).
 *
 * Keep the exact customer minimum and round the upper planning amount up.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const p5 = path.resolve(process.env.P5_HOME_CO ?? path.join(repo, "..", "p5-home-co"));
const out = path.join(repo, "shared", "content", "p5PublishedFigures.json");

const est = await import(path.join(p5, "app/lib/estimator/price.ts"));
const flows = await import(path.join(p5, "app/lib/estimator/flows.ts"));
const types = await import(path.join(p5, "app/lib/estimator/types.ts"));
const costbook = await import(path.join(p5, "app/lib/scopes/costbook.ts"));
const scopeTypes = await import(path.join(p5, "app/lib/scopes/types.ts"));

/**
 * Current standard P5 hourly rate used to generate these examples.
 */
const LABOR_RATE = 125;
const LABOR_RATE_NOTE = "P5 standard labor $125/h, 24 November 2026";
const SETTINGS = { ...scopeTypes.DEFAULT_SCOPE_SETTINGS, laborRate: LABOR_RATE };

const BRAND = "remodeling";
const NOW = new Date("2026-11-25T12:00:00Z");
const ADDRESS = "100 Example Ave, Boise, ID 83702";
const TIERS = ["builder", "mid", "high", "luxury"] as const;

type Case = { key: string; project: string; answers: Record<string, unknown>; label: string; sqft?: number };

// Every figure the site publishes is one of these. `sqft` is the size the
// estimator states for the answer (a flow hint or the number entered), used
// only to divide a range into a per-square-foot range. Answers not named take the
// estimator's own default (recorded in the JSON as `answers`).
const CASES: Case[] = [
  { key: "kitchen-refresh-small", project: "kitchen-remodel", answers: { size: "small", scope: "refresh" }, sqft: 100, label: "a small kitchen (about 100 sq ft) refresh: painted cabinets, new counters, backsplash and hardware" },
  { key: "kitchen-refresh-medium", project: "kitchen-remodel", answers: { size: "medium", scope: "refresh" }, sqft: 150, label: "a medium kitchen (about 150 sq ft) refresh: painted cabinets, new counters, backsplash and hardware" },
  { key: "kitchen-refresh-large", project: "kitchen-remodel", answers: { size: "large", scope: "refresh" }, sqft: 250, label: "a large kitchen (about 250 sq ft) refresh: painted cabinets, new counters, backsplash and hardware" },
  { key: "kitchen-replace-small", project: "kitchen-remodel", answers: { size: "small", scope: "replace" }, sqft: 100, label: "a small kitchen (about 100 sq ft) with new cabinets and finishes in the same layout" },
  { key: "kitchen-replace-medium", project: "kitchen-remodel", answers: { size: "medium", scope: "replace" }, sqft: 150, label: "a medium kitchen (about 150 sq ft) with new cabinets and finishes in the same layout" },
  { key: "kitchen-replace-large", project: "kitchen-remodel", answers: { size: "large", scope: "replace" }, sqft: 250, label: "a large kitchen (about 250 sq ft) with new cabinets and finishes in the same layout" },
  { key: "kitchen-redesign-medium", project: "kitchen-remodel", answers: { size: "medium", scope: "redesign", island: "yes" }, sqft: 150, label: "a medium kitchen (about 150 sq ft) in a new layout with a new island" },
  { key: "kitchen-redesign-large", project: "kitchen-remodel", answers: { size: "large", scope: "redesign", island: "yes" }, sqft: 250, label: "a large kitchen (about 250 sq ft) in a new layout with a new island" },
  { key: "bath-powder-refresh", project: "bathroom-remodel", answers: { bath: "powder", scope: "refresh" }, sqft: 20, label: "a powder room refresh: new vanity, toilet, fixtures, lighting and paint" },
  { key: "bath-hall-refresh", project: "bathroom-remodel", answers: { bath: "hall", scope: "refresh" }, sqft: 40, label: "a hall or guest bath (about 5 x 8 ft) refresh: new vanity, toilet, fixtures, lighting and paint" },
  { key: "bath-hall-full", project: "bathroom-remodel", answers: { bath: "hall", scope: "full", bathing: "combo", vanity: "single" }, sqft: 40, label: "a hall or guest bath (about 5 x 8 ft) remodeled to the studs in the same layout, with a tub and tiled shower walls" },
  { key: "bath-hall-walkin", project: "bathroom-remodel", answers: { bath: "hall", scope: "full", bathing: "walkin", vanity: "single" }, sqft: 40, label: "a hall or guest bath (about 5 x 8 ft) remodeled to the studs in the same layout, with a walk-in tiled shower" },
  { key: "bath-primary-full", project: "bathroom-remodel", answers: { bath: "primary", scope: "full", bathing: "walkin", vanity: "double" }, sqft: 100, label: "a primary bath (about 10 x 10 ft) remodeled to the studs in the same layout, with a walk-in tiled shower and a double vanity" },
  { key: "bath-primary-relocate", project: "bathroom-remodel", answers: { bath: "primary", scope: "relocate", bathing: "both", vanity: "double" }, sqft: 100, label: "a primary bath (about 10 x 10 ft) in a new layout, with a freestanding tub, a tiled shower and a double vanity" },
  { key: "basement-600", project: "basement-finish", answers: { sqft: 600 }, sqft: 600, label: "600 sq ft of basement finished, no bathroom" },
  { key: "basement-800", project: "basement-finish", answers: { sqft: 800 }, sqft: 800, label: "800 sq ft of basement finished, no bathroom" },
  { key: "basement-1000", project: "basement-finish", answers: { sqft: 1000 }, sqft: 1000, label: "1,000 sq ft of basement finished, no bathroom" },
  { key: "basement-1000-bath", project: "basement-finish", answers: { sqft: 1000, bath: "yes" }, sqft: 1000, label: "1,000 sq ft of basement finished with a new bathroom" },
  { key: "basement-1200-bath-bar", project: "basement-finish", answers: { sqft: 1200, bath: "yes", bar: "yes" }, sqft: 1200, label: "1,200 sq ft of basement finished with a new bathroom and a bar" },
  { key: "whole-home-1200", project: "whole-home", answers: { sqft: 1200 }, sqft: 1200, label: "a 1,200 sq ft whole-home renovation" },
  { key: "whole-home-1600", project: "whole-home", answers: { sqft: 1600 }, sqft: 1600, label: "a 1,600 sq ft whole-home renovation" },
  { key: "whole-home-2000", project: "whole-home", answers: { sqft: 2000 }, sqft: 2000, label: "a 2,000 sq ft whole-home renovation" },
  { key: "whole-home-2400", project: "whole-home", answers: { sqft: 2400 }, sqft: 2400, label: "a 2,400 sq ft whole-home renovation" },
  { key: "whole-home-3000", project: "whole-home", answers: { sqft: 3000 }, sqft: 3000, label: "a 3,000 sq ft whole-home renovation" },
  { key: "addition-room-200", project: "addition", answers: { type: "room", sqft: 200 }, sqft: 200, label: "a 200 sq ft room addition" },
  { key: "addition-room-300", project: "addition", answers: { type: "room", sqft: 300 }, sqft: 300, label: "a 300 sq ft room addition" },
  { key: "addition-room-400", project: "addition", answers: { type: "room", sqft: 400 }, sqft: 400, label: "a 400 sq ft room addition" },
  { key: "addition-suite", project: "addition", answers: { type: "suite" }, label: "a primary suite addition" },
  { key: "addition-second", project: "addition", answers: { type: "second" }, label: "a second-story addition" },
  { key: "flooring-lvp-500", project: "flooring", answers: { material: "lvp", sqft: 500 }, sqft: 500, label: "500 sq ft of luxury vinyl plank, installed" },
  { key: "paint-4-rooms", project: "interior-paint", answers: { rooms: 4 }, label: "four rooms of interior painting" },
];

const step = (n: number) => (n >= 10_000 ? 1_000 : 100);
const roundUp = (n: number) => Math.ceil(n / step(n)) * step(n);

function p5Commit(): string {
  try {
    return process.env.P5_SOURCE_REVISION || execFileSync("git", ["-C", p5, "rev-parse", "--short=10", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const figures: Record<string, unknown> = {};
for (const c of CASES) {
  const flow = flows.flowById(c.project);
  if (!flow) throw new Error(`unknown project ${c.project}`);
  const tiers: Record<string, unknown> = {};
  let answers: Record<string, unknown> = {};
  let excludes: string[] = [];
  let assumes: string[] = [];
  for (const tier of flow.usesFinish ? TIERS : (["mid"] as const)) {
    const priced = est.priceEstimate({ brand: BRAND, project: c.project, tier, answers: c.answers, address: ADDRESS, property: null }, { now: NOW, settings: SETTINGS });
    if (est.priceWithheld(priced)) throw new Error(`${c.key} ${tier}: the estimator withholds this price; pick other inputs`);
    const view = est.customerEstimate(priced, { token: "t".repeat(40), address: null, createdAt: NOW, officialCopy: "after-review" });
    const low = view.range?.low;
    const high = view.range?.high;
    if (typeof low !== "number" || typeof high !== "number" || !(low > 0) || !(high >= low)) throw new Error(`${c.key} ${tier}: no customer range`);
    answers = priced.answers;
    excludes = priced.recipe.exclusions;
    assumes = priced.recipe.assumptions;
    const entry: Record<string, unknown> = {
      label: types.TIER_LABELS[tier].label,
      estimator: { low, high },
      published: { low, high: roundUp(high) },
    };
    if (c.sqft) entry.perSqft = { low: Math.ceil(low / c.sqft), high: Math.ceil(high / c.sqft) };
    tiers[tier] = entry;
  }
  figures[c.key] = { project: c.project, title: flow.title, estimateClass: flow.estimateClass, label: c.label, sqft: c.sqft ?? null, answers, assumes, excludes, tiers };
}

const data = {
  about:
    "Generated by scripts/pricing/p5-published-figures.mts from the P5 instant estimator (priceEstimate then customerEstimate, seed cost book, default scope settings, no database). Do not edit by hand; re-run the script.",
  asOf: "November 2026",
  generatedOn: NOW.toISOString().slice(0, 10),
  brand: BRAND,
  source: {
    p5HomeCoCommit: p5Commit(),
    estimatorRules: est.ESTIMATOR_RULES_VERSION,
    costBookReviewedAt: costbook.COST_BOOK_REVIEWED_AT,
    scopeSettings: "DEFAULT_SCOPE_SETTINGS with laborRate set to laborRate below",
    laborRate: LABOR_RATE,
    laborRateNote: LABOR_RATE_NOTE,
    rounding: "published low = exact estimator minimum, published high = estimator high rounded up, to $1,000 at or above $10,000 and to $100 below",
  },
  tierOrder: TIERS,
  figures,
};

// The commit names where the figures came from; --check compares the figures.
const strip = (d: any) => JSON.stringify({ ...d, source: { ...d.source, p5HomeCoCommit: undefined } });
const text = JSON.stringify(data, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const committed = JSON.parse(readFileSync(out, "utf8"));
  if (strip(committed) !== strip(data)) {
    console.error("shared/content/p5PublishedFigures.json is out of date with the P5 estimator. Re-run the script and review the copy that uses a figure that moved.");
    process.exit(1);
  }
  console.log("p5PublishedFigures.json matches the P5 estimator.");
} else {
  writeFileSync(out, text);
  console.log(`wrote ${path.relative(repo, out)}: ${CASES.length} figures from p5-home-co ${data.source.p5HomeCoCommit}`);
}
