import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

test('both wordmark variants begin at the endorsement alignment edge', async () => {
  for (const variant of ['light', 'dark']) {
    const file = path.resolve('public/brand', `p5-wordmark-${variant}.svg`);
    const svg = readFileSync(file, 'utf8');
    const {info} = await sharp(Buffer.from(svg), {density: 288}).trim({background: '#00000000', threshold: 1}).toBuffer({resolveWithObject: true});
    assert.ok(Math.abs(info.trimOffsetLeft || 0) <= 1, `${variant}: visible wordmark must begin at the image's left edge`);
    assert.ok(info.width > 0 && info.height > 0);
  }
});
