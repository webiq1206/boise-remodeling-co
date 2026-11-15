#!/usr/bin/env node
/**
 * Preflight / self-test. Run before the first live cron so failures surface
 * loudly instead of silently. Validates: node, required files, config JSON,
 * env presence, and - if AHREFS_API_KEY is set - one FREE live Ahrefs call
 * (subscription usage costs 0 units) to prove the client + auth + endpoint path.
 *
 * Exits non-zero only on hard failures (missing/broken config). Missing optional
 * env (DB, Resend) is reported as a warning, not a failure.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { ahrefs } from "./ahrefs.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ok = [], warn = [], fail = [];
const P = (f) => join(ROOT, f);

// 1. required files + valid JSON
for (const f of ["config/scoring.json", "config/quality-gates.json", "config/profile.json", "data/opportunities.seed.json"]) {
  if (!existsSync(P(f))) { fail.push(`missing ${f}`); continue; }
  try { JSON.parse(readFileSync(P(f), "utf8")); ok.push(`${f} valid`); }
  catch (e) { fail.push(`${f} invalid JSON: ${e.message}`); }
}

// 2. NAP completeness
try {
  const nap = JSON.parse(readFileSync(P("config/scoring.json"), "utf8")).site.nap;
  for (const k of ["name", "city", "state", "postalCode", "phone", "url"])
    if (!nap?.[k]) fail.push(`NAP missing ${k}`);
  if (typeof nap?.street === "string" && nap.street.trim()) fail.push("NAP includes a street; public address is city, state and ZIP only");
  if (nap?.name) ok.push("NAP present");
} catch { /* covered above */ }

// 3. profile inputs (warn - drafts still generate, just flagged incomplete)
try {
  const pr = JSON.parse(readFileSync(P("config/profile.json"), "utf8"));
  if (!pr.sender.name) warn.push("profile.sender.name empty (outreach drafts will flag missingInputs)");
  if (!pr.descriptions.long) warn.push("profile.descriptions.long empty");
  if (!pr.portfolioAssets.length) warn.push("profile.portfolioAssets empty");
} catch { /* covered */ }

// 4. env
process.env.AHREFS_API_KEY ? ok.push("AHREFS_API_KEY set") : warn.push("AHREFS_API_KEY not set (discovery/monitor will skip)");
process.env.DATABASE_URL ? ok.push("DATABASE_URL set (Postgres persistence)") : warn.push("DATABASE_URL not set (JSON-file persistence - fine for local, NOT durable on ephemeral cron)");
process.env.RESEND_API_KEY ? ok.push("RESEND_API_KEY set") : warn.push("RESEND_API_KEY not set (sends unavailable)");
process.env.HUNTER_API_KEY ? ok.push("HUNTER_API_KEY set (enhanced email discovery)") : warn.push("HUNTER_API_KEY not set (email discovery uses site-crawl only - still finds most)");
process.env.BACKLINK_SEND_ENABLED === "true" ? warn.push("BACKLINK_SEND_ENABLED=true (approved items WILL send)") : ok.push("send disabled (safe default)");

// 5. live Ahrefs path (free call)
if (ahrefs.hasKey()) {
  try {
    const usage = await ahrefs.subscriptionUsage();
    const u = usage?.limits_and_usage;
    if (u) ok.push(`Ahrefs live OK - ${u.units_usage_workspace}/${u.units_limit_workspace} units used`);
    else warn.push("Ahrefs responded but usage shape unexpected - verify endpoint");
  } catch (e) {
    fail.push(`Ahrefs live call FAILED: ${e.message}`);
  }
} else {
  warn.push("Ahrefs live check skipped (no key)");
}

// ---- report
console.log("\nPREFLIGHT\n=========");
ok.forEach((m) => console.log("  ok   ", m));
warn.forEach((m) => console.log("  warn ", m));
fail.forEach((m) => console.log("  FAIL ", m));
console.log(`\n${ok.length} ok · ${warn.length} warn · ${fail.length} fail\n`);
process.exit(fail.length ? 1 : 0);
