import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { versionedSrc } from '../lib/imageVersion.ts';
import { IMAGE_VERSIONS } from '../shared/generated/imageVersions.ts';
// @ts-expect-error plain module script
import { currentImageHashes } from '../scripts/build-image-versions.mjs';

// The optimizer's answers are cached for a year, keyed by URL. A photograph
// replaced under the same file name must therefore change its URL.
const hashes: Record<string, string> = currentImageHashes();
const recorded: Record<string, string> = JSON.parse(readFileSync('shared/generated/imageHashes.json', 'utf8'));

test('the record of image contents is current (run npm run images:versions after adding or replacing an image)', () => {
  assert.deepEqual(recorded, hashes);
});

test('every replaced image carries the hash of the file as it is now', () => {
  for (const [file, version] of Object.entries(IMAGE_VERSIONS)) {
    assert.ok(hashes[file], `${file} is versioned but no longer exists`);
    assert.equal(version, hashes[file].slice(0, 8), file);
  }
});

test('the four blog photographs replaced on 19 November 2026 are versioned', () => {
  for (const slug of ['basement-finishing-boise', 'bedroom-additions', 'how-long-does-a-bathroom-remodel-take', 'multigenerational-living-remodels']) {
    assert.ok(IMAGE_VERSIONS[`/images/blog/${slug}.webp`], slug);
  }
});

test('a replaced local image gets its version and everything else is left alone', () => {
  const [file, version] = Object.entries(IMAGE_VERSIONS)[0];
  assert.equal(versionedSrc(file), `${file}?v=${version}`);
  const untouched = Object.keys(hashes).find((f) => !(f in IMAGE_VERSIONS))!;
  assert.equal(versionedSrc(untouched), untouched);
  assert.equal(versionedSrc(`${file}?v=1`), `${file}?v=1`);
  assert.equal(versionedSrc('https://example.com/a.webp'), 'https://example.com/a.webp');
  assert.equal(versionedSrc('//example.com/a.webp'), '//example.com/a.webp');
});

// A direct next/image import would skip the version. The shared family chrome
// is byte-identical across sites and takes its src from its caller.
test('page code reaches next/image only through components/VersionedImage.tsx', () => {
  const direct: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && /from ['"]next\/image['"]/.test(readFileSync(full, 'utf8'))) direct.push(full);
    }
  };
  walk('app');
  walk('components');
  assert.deepEqual(
    direct.filter((f) => f !== path.join('components', 'VersionedImage.tsx') && !f.startsWith(path.join('components', 'family') + path.sep)),
    [],
  );
});

test('the optimizer route stays on: no custom loader in next.config.js', () => {
  const config = readFileSync('next.config.js', 'utf8');
  assert.doesNotMatch(config, /^\s*loader(File)?:/m);
});

test('next.config.js allows a local image to carry a query string', () => {
  const config = readFileSync('next.config.js', 'utf8');
  assert.match(config, /localPatterns: \[\{ pathname: '\/\*\*' \}\]/);
});
