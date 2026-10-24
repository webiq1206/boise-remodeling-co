import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { scanClientReviews, REVIEW_NEEDLES } from '../scripts/grep-client-reviews.mjs';
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'client-review-guard-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, '.next/static/chunks'), { recursive: true });
  return dir;
}
test('every forbidden phrase is found across small read boundaries in nested files', async t => {
  const dir = await fixture(t);
  for (const [index, phrase] of REVIEW_NEEDLES.entries()) {
    await writeFile(join(dir, `.next/static/chunks/${index}.js`), 'é'.repeat(100) + phrase + 'end');
  }
  const matches = await scanClientReviews(join(dir, '.next/static'), { highWaterMark: 7 });
  for (const phrase of REVIEW_NEEDLES) assert.ok(matches.some(m => m.needle === phrase));
});
test('CLI works without rg; large minified matches still fail and clean assets pass', async t => {
  const dir = await fixture(t);
  const file = join(dir, '.next/static/chunks/app.js');
  const script = resolve('scripts/grep-client-reviews.mjs');
  const run = () => spawnSync(process.execPath, [script], { cwd: dir, env: { PATH: '' }, encoding: 'utf8' });
  await writeFile(file, 'x'.repeat(2 * 1024 * 1024) + REVIEW_NEEDLES[2]);
  assert.equal(run().status, 1);
  await writeFile(file, 'Approved remodeling client code');
  assert.equal(run().status, 0);
});
test('missing assets and symlinks fail closed', async t => {
  const dir = await fixture(t);
  await assert.rejects(scanClientReviews(join(dir, 'missing')), { code: 'ENOENT' });
  await symlink('/not-a-real-client-asset', join(dir, '.next/static/link'));
  await assert.rejects(scanClientReviews(join(dir, '.next/static')), /Unsupported client asset/);
});
