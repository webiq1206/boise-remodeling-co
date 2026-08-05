/**
 * Build guard: fail if a typographic em-dash (U+2014) appears anywhere in the
 * site's body content or source code, including code comments. Also flags the
 * render-equivalent HTML entity and unicode-escape forms.
 *
 * Run: npx tsx scripts/verify-no-em-dash.ts
 *
 * The offending characters/sequences are constructed dynamically so this script
 * does not flag itself; it is also excluded from the scan by path.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

const ROOT = process.cwd();

const EM_DASH = String.fromCharCode(0x2014);
const ENTITY_FORMS = [
  '&' + 'mdash;',
  '&' + '#8212;',
  '&' + '#x2014;',
  '&' + '#X2014;',
];
const ESCAPE_FORMS = ['\\u2014', '\\U2014', '\\u{2014}', '\\U{2014}'];

const NEEDLES = [EM_DASH, ...ENTITY_FORMS, ...ESCAPE_FORMS];
const LOWER_ENTITY_ESCAPE = [...ENTITY_FORMS, ...ESCAPE_FORMS].map((s) => s.toLowerCase());

const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.svg',
  '.html',
]);

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  '.local',
  '.agents',
  '.config',
  '.cache',
  '.upm',
  '.swc',
  '.turbo',
  '.vercel',
  'coverage',
  'playwright-report',
  'test-results',
  'backlink-engine',
]);

// These scripts intentionally contain the patterns they search for, so skip them.
// public/brand/brand-kit.html is the vendor brand-kit reference reproduced
// verbatim (the HTML twin of public/brand/BRAND.md, which .md-only scanning
// already skips); house style does not govern a delivered brand artifact.
const EXCLUDED_FILES = new Set([
  join('scripts', 'verify-no-em-dash.ts'),
  join('scripts', 'fix-em-dash.ts'),
  join('public', 'brand', 'brand-kit.html'),
]);

interface Violation {
  file: string;
  line: number;
  column: number;
  text: string;
}

function collectFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry)) continue;
      collectFiles(abs, out);
    } else {
      const rel = relative(ROOT, abs);
      if (EXCLUDED_FILES.has(rel)) continue;
      const dot = entry.lastIndexOf('.');
      const ext = dot === -1 ? '' : entry.slice(dot).toLowerCase();
      if (SCAN_EXTENSIONS.has(ext)) out.push(abs);
    }
  }
}

function findFirstNeedle(haystack: string): { index: number } | null {
  let best = -1;
  if (haystack.includes(EM_DASH)) best = haystack.indexOf(EM_DASH);
  const lower = haystack.toLowerCase();
  for (const needle of LOWER_ENTITY_ESCAPE) {
    const idx = lower.indexOf(needle);
    if (idx !== -1 && (best === -1 || idx < best)) best = idx;
  }
  return best === -1 ? null : { index: best };
}

function scanFile(abs: string): Violation[] {
  const content = readFileSync(abs, 'utf8');
  if (!NEEDLES.some((n) => content.toLowerCase().includes(n.toLowerCase()))) {
    return [];
  }
  const violations: Violation[] = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, i) => {
    const hit = findFirstNeedle(line);
    if (hit) {
      violations.push({
        file: relative(ROOT, abs),
        line: i + 1,
        column: hit.index + 1,
        text: line.trim().slice(0, 120),
      });
    }
  });
  return violations;
}

function main(): void {
  const files: string[] = [];
  collectFiles(ROOT, files);

  const violations: Violation[] = [];
  for (const file of files) {
    violations.push(...scanFile(file));
  }

  if (violations.length === 0) {
    console.log(`verify:no-em-dash: OK (scanned ${files.length} files, no em-dashes found)`);
    return;
  }

  console.error(
    `verify:no-em-dash: FAILED - found ${violations.length} em-dash occurrence(s).\n` +
      `Replace the typographic em-dash (U+2014) with a hyphen "-" or reword.\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}:${v.column}  ${v.text}`);
  }
  console.error(`\nTotal: ${violations.length} occurrence(s) across the codebase.`);
  process.exit(1);
}

main();
