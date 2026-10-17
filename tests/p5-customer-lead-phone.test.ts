import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { customerPhoneHtml, customerTelHref } from '../lib/resend';
import { SITE_CONFIG } from '../shared/siteConfig';

test('10 digits become tel:+1XXXXXXXXXX', () => {
  assert.equal(customerTelHref('2085550148'), 'tel:+12085550148');
  assert.equal(customerTelHref('(208) 555-0148'), 'tel:+12085550148');
  assert.equal(customerTelHref('208.555.0148'), 'tel:+12085550148');
  assert.notEqual(customerTelHref('(208) 555-0148'), SITE_CONFIG.phoneHref);
});

test('11 digits starting with 1 become tel:+1XXXXXXXXXX', () => {
  assert.equal(customerTelHref('12085550148'), 'tel:+12085550148');
  assert.equal(customerTelHref('1-208-555-0148'), 'tel:+12085550148');
  assert.equal(customerTelHref('1 (208) 555-0148'), 'tel:+12085550148');
});

test('a leading plus with 8 to 15 digits becomes tel:+digits', () => {
  assert.equal(customerTelHref('+12345678'), 'tel:+12345678');
  assert.equal(customerTelHref('+1 (208) 555-0148'), 'tel:+12085550148');
  assert.equal(customerTelHref('+44 20 7946 0958'), 'tel:+442079460958');
  assert.equal(customerTelHref('+123456789012345'), 'tel:+123456789012345');
});

test('an extension returns null', () => {
  assert.equal(customerTelHref('x12'), null);
  assert.equal(customerTelHref('208-555-0148 x12'), null);
});

test('a 7-digit number returns null', () => {
  assert.equal(customerTelHref('555-0148'), null);
});

test('letters return null', () => {
  assert.equal(customerTelHref('1-800-FLOWERS'), null);
});

test('a leading 011 returns null', () => {
  assert.equal(customerTelHref('011442079460958'), null);
  assert.equal(customerTelHref('011 44 20 7946 0958'), null);
  assert.equal(customerTelHref('0115550148'), null);
});

test('two numbers in one field return null', () => {
  assert.equal(customerTelHref('208-555-0148 208-555-0199'), null);
  assert.equal(customerTelHref('(208) 555-0148 / (208) 555-0199'), null);
});

test('an empty phone returns null', () => {
  assert.equal(customerTelHref(''), null);
  assert.equal(customerTelHref('   '), null);
});

test('N/A returns null', () => {
  assert.equal(customerTelHref('N/A'), null);
});

test('a number with no link is plain text', () => {
  assert.equal(customerPhoneHtml('N/A'), 'N/A');
  assert.equal(customerPhoneHtml('555-0148'), '555-0148');
  assert.equal(customerPhoneHtml('x12').includes('<a'), false);
  const linked = customerPhoneHtml('(208) 555-0148');
  assert.match(linked, /href="tel:\+12085550148"/);
  assert.match(linked, /\(208\) 555-0148/);

  const source = readFileSync(new URL('../lib/resend.ts', import.meta.url), 'utf8');
  const phoneRow = source.slice(source.indexOf('>Phone:<'), source.indexOf('>Address:<'));
  assert.match(phoneRow, /customerPhoneHtml\(data\.customerPhone\)/);
  assert.equal(phoneRow.includes('<a '), false);
  assert.equal(phoneRow.includes('SITE_CONFIG.phoneHref'), false);
});
