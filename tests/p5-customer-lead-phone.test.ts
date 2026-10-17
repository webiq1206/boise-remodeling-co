import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { customerTelHref } from '../lib/resend';
import { SITE_CONFIG } from '../shared/siteConfig';

test('the internal lead email dials the customer, not the company', () => {
  const shown = '(208) 555-0148';
  const href = customerTelHref(shown);
  assert.equal(href, 'tel:+12085550148');
  assert.equal(customerTelHref('+1 (208) 555-0148'), 'tel:+12085550148');
  assert.notEqual(href, SITE_CONFIG.phoneHref);
  assert.equal(href.includes('2084771169'), false);

  const source = readFileSync(new URL('../lib/resend.ts', import.meta.url), 'utf8');
  const phoneRow = source.slice(source.indexOf('>Phone:<'), source.indexOf('>Address:<'));
  assert.match(phoneRow, /customerTelHref\(data\.customerPhone\)/);
  assert.match(phoneRow, /escapeHtml\(data\.customerPhone\)/);
  assert.equal(phoneRow.includes('SITE_CONFIG.phoneHref'), false);
});
