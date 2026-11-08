/**
 * Release 2, D1 and D8: the /warranty page states the owner's warranty policy
 * and gives existing customers a real help path.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WARRANTY_COVERAGE,
  WARRANTY_HELP_ANCHOR,
  WARRANTY_HELP_FIELDS,
  WARRANTY_NOT_COVERED,
  warrantyHelpMailto,
} from '../shared/content/warrantyPage';
import { SITE_CONFIG } from '../shared/siteConfig';
import { getAllSiteUrls } from '../lib/siteUrls';
import { FAMILY_BRAND } from '../lib/familyBrand';
import { findResponsePromises } from '../scripts/lib/responsePromiseGuard';
import { findPublicClaims } from '../scripts/lib/publicClaimsGuard';
import { HOMEPAGE_FAQS } from '../shared/homepageFaqs';

const page = readFileSync('app/warranty/page.tsx', 'utf8');
const coverage = WARRANTY_COVERAGE.join(' ');

test('coverage is our own team for one year from documented Final Completion', () => {
  assert.match(coverage, /our own team carries a one-year workmanship warranty from documented Final Completion/);
});

test('subcontractor work carries its own warranty, with a complete list and contact information', () => {
  assert.match(coverage, /subcontractors[^.]*covered by that subcontractor's own warranty/);
  assert.match(coverage, /complete list of the subcontractors who worked on it, with their contact information/);
  assert.match(coverage, /Manufacturer and product warranties[^.]*separate/);
  assert.match(page, /point you to the right subcontractor from the list/);
});

test('what is not covered names wear, misuse and work by others after completion', () => {
  const text = WARRANTY_NOT_COVERED.join(' ');
  assert.match(text, /Normal wear/);
  assert.match(text, /misuse/);
  assert.match(text, /Work by others after Final Completion/);
});

test('the get-help section has a prefilled email to the brand address and a phone link', () => {
  assert.equal(WARRANTY_HELP_ANCHOR, 'get-help');
  assert.match(page, /id=\{WARRANTY_HELP_ANCHOR\}/);
  const mailto = warrantyHelpMailto();
  assert.ok(mailto.startsWith(`mailto:${SITE_CONFIG.email}?subject=`));
  const body = decodeURIComponent(mailto.split('&body=')[1]);
  for (const field of ['name', 'Project address', 'Affected item and where it is', 'When it started', 'Description', 'Photos']) {
    assert.ok(body.includes(field), field);
  }
  assert.equal(WARRANTY_HELP_FIELDS.length, 6);
  assert.match(page, /href=\{SITE_CONFIG\.phoneHref\}/);
  assert.equal(SITE_CONFIG.phone, '(208) 477-1169');
});

test('immediate danger goes to emergency services or the utility first; the signed agreement controls formal notice', () => {
  assert.match(page, /immediate danger/);
  assert.match(page, /emergency services or your utility first/);
  assert.match(page, /signed agreement controls formal warranty claims/);
  assert.match(page, /no portal or ticket/);
});

test('the page makes no response-time promise and no unsupported claim', () => {
  const all = [page, coverage, WARRANTY_NOT_COVERED.join(' ')].join(' ');
  assert.deepEqual(findResponsePromises(all), []);
  assert.deepEqual(findPublicClaims(all), []);
  assert.equal(/deadline/i.test(page), false);
});

test('the page is in the sitemap and the footer carries the existing-customer link', () => {
  assert.ok(getAllSiteUrls().some((entry) => entry.path === '/warranty'));
  const links = FAMILY_BRAND.footer.groups.flatMap((group) => group.links);
  assert.ok(links.some((link) => link.href === '/warranty#get-help' && link.label === 'Existing customer? Get help'));
});

test('the homepage warranty FAQ states the own-team scope and never says it covers subcontractors', () => {
  const faq = HOMEPAGE_FAQS.find((item) => /workmanship guarantee/.test(item.q));
  assert.ok(faq);
  assert.match(faq.a, /work performed by our own team/);
  assert.match(faq.a, /subcontractor's own warranty/);
  assert.match(faq.a, /complete list of the subcontractors who worked on it, with their contact information/);
  assert.equal(/covers our crews and our subcontractors/.test(faq.a), false);
});
