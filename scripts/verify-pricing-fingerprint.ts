/**
 * Pricing fingerprint guard.
 *
 * The pricing tables below are the source of every number a visitor sees.
 * Several of them exist as identical copies on more than one P5 site, and
 * nothing else enforces that they stay identical. This script hashes each
 * table set into shared/pricing-fingerprint.json and fails when the data no
 * longer matches the committed fingerprint - so a pricing change is always
 * a deliberate, visible step, never a silent drift.
 *
 * If a change is intentional: apply it to EVERY site that shares the table,
 * then run `npm run verify:pricing -- --write` in each and commit the JSON.
 * The re10 hash must match across Construction, Remodeling and Handyman; the
 * remodel hash must match across Remodeling and Construction.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PRICE_MATRIX, PROFILE_SUMMARY, PROJECT_UPGRADES } from "../shared/estimateEngine";
import { RECIPES, CREW_MINIMUM_PRICE, CREW_FOR_TRADE, REPAIR_GRADE_BY_DIVISION, WORTHWHILE_JOB_PRICE, QUOTE_VALID_DAYS, CREW_HOURLY_COST, MOBILIZATION_COST, REPAIR_GRADE_DEFAULT_FACTOR } from "../shared/costs/re10Repairs";
import { LINE_ITEMS } from "../shared/costs/lineItemCatalog";
import { getComponents, COST_CATALOG_VERSION } from "../shared/costCatalog";
import { INSTALLED_UNIT_COSTS, DIRECT_COST_SHARE, NATURAL_BAND } from "../shared/costs/installedUnitCosts";

// The remodel catalog is shared by Remodeling and Construction; Construction's
// tables also hold its new-home types, so only the six shared remodel keys are
// hashed as `remodel` (must match across both sites). The full tables are
// hashed as `pricingAll` for this site alone.
const REMODEL_KEYS = ["kitchen", "bathroom", "whole-home", "addition", "adu", "basement"] as const;
const pick = (t: Record<string, unknown>) => Object.fromEntries(REMODEL_KEYS.filter((k) => k in t).map((k) => [k, t[k]]));
/*
 * The component table is part of pricing: a quantity basis (per-sqft vs lot)
 * changes what a size does to a line just as surely as a rate does. It used to
 * sit outside the fingerprint, so costCatalog.ts could be edited without the
 * guard noticing. Hashed site-locally because each site carries its own project
 * set; the shared remodel keys are still compared across sites as `remodel`.
 */
const ALL_PROJECTS_FOR_HASH = Object.keys(PRICE_MATRIX) as Array<keyof typeof PRICE_MATRIX>;
const COMPONENTS_BY_PROJECT = Object.fromEntries(
  ALL_PROJECTS_FOR_HASH.map((p) => [p, getComponents(p as never)]),
);

const SETS: Record<string, unknown> = {
  catalog: { COST_CATALOG_VERSION, COMPONENTS_BY_PROJECT, INSTALLED_UNIT_COSTS, DIRECT_COST_SHARE, NATURAL_BAND },
  remodel: { PRICE_MATRIX: pick(PRICE_MATRIX as Record<string, unknown>), PROFILE_SUMMARY: pick(PROFILE_SUMMARY as Record<string, unknown>), PROJECT_UPGRADES: pick(PROJECT_UPGRADES as Record<string, unknown>) },
  pricingAll: { PRICE_MATRIX, PROFILE_SUMMARY, PROJECT_UPGRADES }, re10: { RECIPES, CREW_MINIMUM_PRICE, CREW_FOR_TRADE, REPAIR_GRADE_BY_DIVISION, WORTHWHILE_JOB_PRICE, QUOTE_VALID_DAYS, CREW_HOURLY_COST, MOBILIZATION_COST, REPAIR_GRADE_DEFAULT_FACTOR, LINE_ITEMS } };

function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    return Object.keys(v as Record<string, unknown>).sort().reduce<Record<string, unknown>>((o, k) => {
      o[k] = canon((v as Record<string, unknown>)[k]); return o;
    }, {});
  }
  return v;
}
const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(canon(v))).digest("hex").slice(0, 16);
const actual = Object.fromEntries(Object.entries(SETS).map(([k, v]) => [k, sha(v)]));
const file = resolve(process.cwd(), "shared/pricing-fingerprint.json");
if (process.argv.includes("--write")) {
  writeFileSync(file, JSON.stringify(actual, null, 2) + "\n");
  console.log("pricing fingerprint written:", actual); process.exit(0);
}
if (!existsSync(file)) { console.error("No shared/pricing-fingerprint.json - run with --write once."); process.exit(1); }
const expected = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
let ok = true;
for (const k of Object.keys(actual)) if (expected[k] !== actual[k]) { ok = false; console.error(`PRICING DRIFT in "${k}": committed ${expected[k]}, current ${actual[k]}`); }
if (!ok) { console.error("Pricing data changed. If intentional, mirror it on every site that shares it, then run with --write."); process.exit(1); }
console.log("pricing fingerprint OK:", actual);
