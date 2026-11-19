import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { SMALL_SOURCE_WIDTH, sourceWidthCap } from '../shared/smallSourceImages.ts';

// The article banner is 1260px wide on a large screen. A blog photograph
// narrower than that must be listed, so the banner stays at the photo's own
// width and never stretches it.
const BANNER_WIDTH = 1260;

test('every blog photograph narrower than the article banner is listed with its true width', async () => {
  const dir = path.join(process.cwd(), 'public/images/blog');
  const found: Record<string, number> = {};
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.webp'))) {
    const { width } = await sharp(path.join(dir, name)).metadata();
    if (width && width < BANNER_WIDTH) found[`/images/blog/${name}`] = width;
  }
  assert.deepEqual(SMALL_SOURCE_WIDTH, found);
});

test('the cap is read by path, and a full-size photograph has none', () => {
  assert.equal(sourceWidthCap('/images/blog/bedroom-additions.webp'), 1024);
  assert.equal(sourceWidthCap('/images/blog/kitchen-remodel-roi.webp'), undefined);
});
