/** Post-build guard: reject other businesses' review text in client assets. */
import { createReadStream } from 'node:fs';
import { readdir, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const REVIEW_NEEDLES = [
  'Lawn Care',
  'Lawn Care Kuna',
  'taking care of our yard',
  'Best Christmas light installation',
  'recommended them to all our neighbors',
  'beautiful patio in our backyard',
];

export async function scanClientReviews(root, { highWaterMark = 64 * 1024 } = {}) {
  const matches = [];
  const overlap = Math.max(...REVIEW_NEEDLES.map((needle) => needle.length)) - 1;
  async function visit(path) {
    const stat = await lstat(path);
    if (stat.isDirectory()) {
      for (const name of (await readdir(path)).sort()) await visit(join(path, name));
      return;
    }
    if (!stat.isFile()) throw new Error(`Unsupported client asset: ${path}`);
    let tail = '';
    const found = new Set();
    for await (const chunk of createReadStream(path, { encoding: 'utf8', highWaterMark })) {
      const text = tail + chunk;
      for (const needle of REVIEW_NEEDLES) if (text.includes(needle)) found.add(needle);
      tail = text.slice(-overlap);
    }
    for (const needle of found) matches.push({ path, needle });
  }
  await visit(root);
  return matches;
}

async function main() {
  const root = '.next/static';
  try {
    const matches = await scanClientReviews(root);
    if (matches.length) {
      for (const match of matches) console.error(`${match.path}: forbidden review phrase ${JSON.stringify(match.needle)}`);
      console.error(`client bundle contains forbidden review text under ${root}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Checked ${root} for all ${REVIEW_NEEDLES.length} forbidden review phrases (no matches)`);
  } catch (error) {
    console.error(`Client review scan failed: ${error.code || error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
