/**
 * Post-build guard. The client bundle must not contain the other business's
 * review text that production /api/testimonials was still serving.
 *
 * Run after `next build`: node scripts/grep-client-reviews.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REVIEW_NEEDLES = [
  'Lawn Care',
  'Lawn Care Kuna',
  'taking care of our yard',
  'Best Christmas light installation',
  'recommended them to all our neighbors',
  'beautiful patio in our backyard',
];

const root = '.next/static';

function main() {
  if (!existsSync(root)) {
    console.error(`missing ${root}; run next build first`);
    process.exit(1);
  }
  const args = ['-n', '-F', '--glob', '!.git/**', root];
  for (const needle of REVIEW_NEEDLES) args.push('-e', needle);
  const result = spawnSync('rg', args, { encoding: 'utf8' });
  // Minimal CI containers need not ship ripgrep. Keep the same literal guard
  // using Node's filesystem API when the executable is unavailable.
  if (result.error?.code === 'ENOENT') {
    const hits = scanReviewText(root);
    if (hits.length) {
      console.error(hits.join('\n'));
      console.error(`client bundle contains forbidden review text under ${root}`);
      process.exit(1);
    }
    console.log('Node review-text scan: no matches');
    return;
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (result.status === 0) {
    console.error(output);
    console.error(`client bundle contains forbidden review text under ${root}`);
    process.exit(1);
  }
  if (result.status !== 1) {
    console.error(output || `rg exited ${result.status}`);
    process.exit(result.status || 1);
  }
  console.log(`rg -n -F ${REVIEW_NEEDLES.map((needle) => `-e ${JSON.stringify(needle)}`).join(' ')} ${root}`);
  console.log('(no matches)');
}

export function scanReviewText(directory) {
  const hits = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) hits.push(...scanReviewText(path));
    else if (entry.isFile()) {
      const text = readFileSync(path, 'utf8');
      for (const needle of REVIEW_NEEDLES) {
        if (text.includes(needle)) hits.push(`${path}: ${needle}`);
      }
    }
  }
  return hits;
}

const entry = process.argv[1] || '';
if (entry.endsWith('grep-client-reviews.mjs')) main();
