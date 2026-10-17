/**
 * Post-build guard. The client bundle must not contain the other business's
 * review text that production /api/testimonials was still serving.
 *
 * Run after `next build`: node scripts/grep-client-reviews.mjs
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

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

const entry = process.argv[1] || '';
if (entry.endsWith('grep-client-reviews.mjs')) main();
