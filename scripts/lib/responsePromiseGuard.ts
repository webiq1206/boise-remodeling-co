/**
 * Inquiry response-time promises are prohibited on every P5 family site.
 *
 * Owner instruction (P5 family audit, R03): "Please also make sure that we
 * mention that we answer (do not say within one business day on any site)".
 * The replacement is plain "we answer" language with NO new timing: no hours,
 * minutes, "fast", "same day" or any other reply window. Business hours may be
 * stated as hours; they are not a promise of how fast a reply arrives.
 *
 * Shared by scripts/verify-no-response-promise.ts (runs in prebuild) and
 * tests/p5-text-reply-line.test.ts, so the build and the test cannot disagree.
 *
 * Text is whitespace-normalized before matching and JSX spacers ({" "}) are
 * removed, so a phrase split across lines or JSX nodes is still caught.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const PROHIBITED_RESPONSE_PROMISES: { id: string; pattern: RegExp }[] = [
  { id: 'one-business-day', pattern: /\b(?:one|1|a single|next)[\s-]+business[\s-]+days?\b/i },
  { id: 'reply-in-minutes', pattern: /\b(?:reply|replies|respond|responds|answer|answers)\s+in\s+(?:minutes|a minute|seconds)\b/i },
  { id: 'answers-in-a-minute', pattern: /\bquestions?\s+in\s+a\s+minute\b/i },
  {
    id: 'reply-within-window',
    pattern:
      /\b(?:reply|replies|respond|responds|response|reach out|call you|call back|calls back|get back|be in touch|hear back|hear from us|follow up)\b[^.]{0,60}?\bwithin\s+(?:\d+|one|two|a|an)[\s-]*(?:business[\s-]+)?(?:minutes?|hours?|days?)\b/i,
  },
  { id: 'n-hour-reply', pattern: /\b(?:24|48|\d+)[\s-]*hours?\s+(?:reply|response|callback|turnaround)\b/i },
  { id: 'same-day-reply', pattern: /\bsame[\s-]+day\s+(?:reply|response|callback)\b/i },
];

/**
 * Operational instructions to staff, not promises made to a customer about
 * answering their inquiry. Each is an exact normalized phrase.
 */
export const ALLOWED_PHRASES: string[] = [
  // GBP checklist for the owner about replying to public reviews.
  'Respond to all reviews within 48 hours',
  'Respond to every review within 48 hours',
];

/** Where customer-facing copy, emails, assistant output, GBP copy and docs live. */
export const SCAN_ROOTS = ['app', 'components', 'shared', 'server', 'lib', 'hooks', 'public', 'local-seo-audit', 'docs', 'content'];
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|md|mdx|txt|json|html)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);

export function normalizeForResponseScan(source: string): string {
  return source
    .replace(/\{\s*(["'])\s*\1\s*\}/g, ' ')
    .replace(/\{\s*(["']) \1\s*\}/g, ' ')
    .replace(/\s+/g, ' ');
}

export function findResponsePromises(text: string): { id: string; match: string }[] {
  let normalized = normalizeForResponseScan(text);
  for (const phrase of ALLOWED_PHRASES) normalized = normalized.split(phrase).join(' ');
  const hits: { id: string; match: string }[] = [];
  for (const { id, pattern } of PROHIBITED_RESPONSE_PROMISES) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    for (const m of normalized.matchAll(global)) hits.push({ id, match: m[0] });
  }
  return hits;
}

function filesUnder(dir: string, acc: string[]): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) filesUnder(full, acc);
    else if (SCAN_EXT.test(name) && stat.size < 2_000_000) acc.push(full);
  }
  return acc;
}

export function scanRepositoryForResponsePromises(root: string = process.cwd()): string[] {
  const problems: string[] = [];
  for (const scanRoot of SCAN_ROOTS) {
    for (const full of filesUnder(path.join(root, scanRoot), [])) {
      const rel = path.relative(root, full).split(path.sep).join('/');
      for (const hit of findResponsePromises(readFileSync(full, 'utf8'))) {
        problems.push(`${rel}: [${hit.id}] "${hit.match}"`);
      }
    }
  }
  return problems;
}
