import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../app/privacy-policy/page.tsx', import.meta.url), 'utf8');

test('the privacy page adds the cookies section without removing the existing policy', () => {
  assert.match(page, /Last updated: October 2026/);
  assert.match(page, /Cookies, analytics and advertising/);
  assert.match(page, /We use Google Analytics 4 \(GA4\)/);
  assert.match(page, /remarketing\)/);
  assert.match(page, /We do not send your name, email, phone number or project details to Google\./);
  assert.match(page, /https:\/\/policies\.google\.com\/privacy/);
  assert.match(page, /https:\/\/adssettings\.google\.com/);
  assert.match(page, /https:\/\/tools\.google\.com\/dlpage\/gaoptout/);
  assert.match(page, /We also use the Meta Pixel to measure visits and inquiries that come from our Facebook and Instagram ads\./);
  assert.match(page, /Boise Remodeling Co \("we," "our," or "us"\) is committed to protecting your privacy\./);
  assert.match(page, /We do not sell your personal information\./);
  assert.equal(page.includes(String.fromCharCode(8212)), false);
});
