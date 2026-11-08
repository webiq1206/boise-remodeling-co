/**
 * Unsupported public claims are prohibited on every P5 family site.
 *
 * Owner decisions, release 2 (November 8, 2026):
 *   D1  Our one-year workmanship coverage is for work performed by our own
 *       team. Subcontractors provide their own warranty, and we hand over a
 *       complete subcontractor list with contact information at the end of
 *       every project. Copy must not say our coverage includes subcontractors.
 *   D2  No "bonded" claims anywhere. Insured and registration claims stay.
 *   D3  No universal "one contract" / "one invoice" promise. Say "one
 *       accountable company and one point of contact for your project".
 *   D4  No instant estimator: the owner could never get it working. No
 *       "instant estimate", "estimate in minutes" or same-day financing
 *       approval claims.
 *   D9  The generic 48-hour satisfaction window and recurring-billing terms
 *       are gone from the public terms and from marketing copy.
 *
 * This extends the response-language guard (scripts/lib/responsePromiseGuard.ts)
 * with the same whitespace normalization, so a phrase split across lines or
 * JSX nodes is still caught. scripts/verify-public-claims.ts runs it in
 * prebuild; tests/public-claims-guard.test.ts pins the patterns.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { normalizeForResponseScan } from './responsePromiseGuard';

export const PROHIBITED_PUBLIC_CLAIMS: { id: string; pattern: RegExp }[] = [
  // D2
  { id: 'bonded', pattern: /\bbonded\b/i },
  // D1
  {
    id: 'coverage-includes-subcontractors',
    pattern:
      /\b(?:covering|covers|cover|covered|including|includes|include)\s+(?:both\s+)?(?:our|its)?\s*(?:own\s+)?(?:crews?|people|team|employees)\s+and\s+(?:our\s+|its\s+|the\s+)?subcontractors\b/i,
  },
  { id: 'subcontractors-we-hire', pattern: /\b(?:crew|team|people)\s+and\s+the\s+subcontractors\s+we\s+hire\b/i },
  // D3
  { id: 'one-invoice', pattern: /\b(?:one|a single|single)\s+(?:invoice|bill)\b/i },
  { id: 'one-contract', pattern: /\b(?:under|in|with)\s+(?:one|a single|single)\s+(?:contract|agreement)\b/i },
  { id: 'one-contract-list', pattern: /\bone\s+team,\s+one\s+contract\b/i },
  { id: 'one-contract-covers', pattern: /\b(?:one|a single|single)\s+contract\s+covers\b/i },
  // D4
  { id: 'instant-estimate', pattern: /\binstant\s+(?:online\s+)?(?:estimates?|estimator|price|pricing|ranges?|planning\s+range|quotes?|starting\s+range|number)\b/i },
  {
    id: 'estimate-in-minutes',
    pattern: /\b(?:estimates?|estimator|ranges?|price|quote)\b[^.]{0,60}?\bin\s+(?:a\s+few\s+|a\s+couple\s+of\s+|under\s+a\s+|\d+\s+)?(?:minutes?|seconds)\b/i,
  },
  { id: 'same-day-approval', pattern: /\bsame[\s-]day\s+(?:approvals?|decisions?|credit)\b/i },
  { id: 'decision-same-day', pattern: /\bdecision\s+the\s+same\s+day\b/i },
  // D9
  { id: 'recurring-billing', pattern: /\brecurring\s+(?:service\s+customers|billing)\b|\bautomatic\s+billing\b/i },
  { id: '48-hour-satisfaction', pattern: /\bnot\s+satisfied\b[^.]{0,80}\b48\s*hours\b|\bsatisf\w*\b[^.]{0,40}\b48[\s-]hours?\b/i },
];

/** Where customer-facing copy, emails, assistant output, GBP and outreach copy live. */
export const CLAIM_SCAN_ROOTS = [
  'app',
  'components',
  'shared',
  'server',
  'lib',
  'hooks',
  'public',
  'content',
  'docs',
  'local-seo-audit',
  'backlink-engine/config',
  'backlink-engine/outreach',
  'scripts/generate-llms-txt.ts',
  'scripts/generate-resource-pdfs.ts',
];
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|md|mdx|txt|json|html|csv)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

export function findPublicClaims(text: string): { id: string; match: string }[] {
  const normalized = normalizeForResponseScan(text);
  const hits: { id: string; match: string }[] = [];
  for (const { id, pattern } of PROHIBITED_PUBLIC_CLAIMS) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const m of normalized.matchAll(global)) hits.push({ id, match: m[0] });
  }
  return hits;
}

function filesUnder(target: string, acc: string[]): string[] {
  let stat;
  try {
    stat = statSync(target);
  } catch {
    return acc;
  }
  if (stat.isFile()) {
    if (SCAN_EXT.test(target) && stat.size < 2_000_000) acc.push(target);
    return acc;
  }
  for (const name of readdirSync(target)) {
    if (SKIP_DIRS.has(name)) continue;
    filesUnder(path.join(target, name), acc);
  }
  return acc;
}

export function scanRepositoryForPublicClaims(root: string = process.cwd()): string[] {
  const problems: string[] = [];
  for (const scanRoot of CLAIM_SCAN_ROOTS) {
    for (const full of filesUnder(path.join(root, scanRoot), [])) {
      const rel = path.relative(root, full).split(path.sep).join('/');
      for (const hit of findPublicClaims(readFileSync(full, 'utf8'))) {
        problems.push(`${rel}: [${hit.id}] "${hit.match}"`);
      }
    }
  }
  return problems;
}
