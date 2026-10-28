import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { withBrandPageMetadata } from '../lib/brand-page-metadata.ts';
import { buildPageMetadata } from '../lib/page-metadata.ts';
import {
  BATHROOM_NEAR_ME_DESCRIPTION,
  BATHROOM_NEAR_ME_FAQS,
  BATHROOM_NEAR_ME_H1,
  BATHROOM_NEAR_ME_OVERVIEW,
  BATHROOM_NEAR_ME_PROCESS,
  BATHROOM_NEAR_ME_SECTIONS,
  BATHROOM_NEAR_ME_TIMELINE,
  BATHROOM_NEAR_ME_TITLE,
} from '../shared/content/bathroomNearMePage.ts';
import { SERVICE_SEO_CONTENT } from '../shared/seoContent.ts';
import { SITE_CONFIG } from '../shared/siteConfig.ts';

const BRAND = ' | Boise Remodeling Co';

function renderedTitle(meta: { title?: unknown }): string {
  const title = meta.title as { absolute?: string } | string | undefined;
  if (typeof title === 'string') return `${title}${BRAND}`;
  if (title && typeof title === 'object' && title.absolute) return title.absolute;
  return '';
}

function publicCopy(): string {
  const bath = SERVICE_SEO_CONTENT['bathroom-remodel'];
  const sectionText = BATHROOM_NEAR_ME_SECTIONS.map((section) =>
    [section.heading, ...(section.paragraphs ?? []), ...(section.links ?? []).map((link) => `${link.label} ${link.href}`)].join('\n'),
  ).join('\n');
  return [
    BATHROOM_NEAR_ME_TITLE,
    BATHROOM_NEAR_ME_DESCRIPTION,
    bath.headline,
    bath.overview,
    bath.benefits.join('\n'),
    bath.inclusions.join('\n'),
    BATHROOM_NEAR_ME_TIMELINE,
    BATHROOM_NEAR_ME_PROCESS.map((step) => `${step.title} ${step.description}`).join('\n'),
    BATHROOM_NEAR_ME_FAQS.map((faq) => `${faq.question} ${faq.answer}`).join('\n'),
    sectionText,
  ].join('\n');
}

test('bathroom near-me metadata matches the approved draft', () => {
  const meta = withBrandPageMetadata(buildPageMetadata({
    kind: 'service',
    serviceName: 'Bathroom Remodel',
    serviceSlug: 'bathroom-remodel',
    path: '/services/bathroom-remodel',
  }), '/services/[slug]');
  const title = renderedTitle(meta);
  assert.equal(title, 'Bathroom Remodeling in Boise | Boise Remodeling Co');
  assert.ok(title.length <= 60, title);
  assert.equal(meta.description, BATHROOM_NEAR_ME_DESCRIPTION);
  // The draft labels this sentence 148 characters. The sentence itself is 142.
  assert.ok(BATHROOM_NEAR_ME_DESCRIPTION.length <= 160);
  assert.match(String(meta.description), /Bathroom remodeling in Boise/);
  assert.equal(String(meta.description).includes('8381215'), false);
  assert.equal(String(meta.description).includes('$'), false);
  assert.equal(String(meta.openGraph?.description).includes('8381215'), false);

  const city = buildPageMetadata({
    kind: 'city-service',
    serviceName: 'Bathroom Remodel',
    serviceSlug: 'bathroom-remodel',
    cityName: 'Middleton',
    citySlug: 'middleton',
    path: '/services/bathroom-remodel/middleton',
  });
  assert.match(String(city.description), /8381215/);
});

test('bathroom parent copy hits the five places and holds unverified claims', () => {
  const bath = SERVICE_SEO_CONTENT['bathroom-remodel'];
  const copy = publicCopy();
  assert.equal(bath.headline, BATHROOM_NEAR_ME_H1);
  assert.equal(bath.headline, 'Bathroom remodeling in Boise and the Treasure Valley');
  assert.equal(bath.overview.startsWith('We plan primary baths, guest baths and powder rooms'), true);
  assert.match(bath.overview, /call \(208\) 477-1169/);
  assert.equal(bath.overview.includes(SITE_CONFIG.phone), true);
  assert.match(copy, /What a bathroom remodel covers/);
  assert.match(copy, /workmanship guarantee/i);
  assert.match(copy, /design-build/i);
  assert.match(copy, /Licensed trades coordinate|weekly updates/);
  assert.match(copy, /Why design-build for your bathroom remodel/);
  assert.match(copy, /primary baths, guest baths and powder rooms/);
  assert.match(copy, /Ada and Canyon County/);
  assert.match(copy, /Request a free in-home consultation/);
  assert.match(copy, /written scope before demolition/);
  assert.match(copy, /Boise Remodeling Co remodels bathrooms/);

  assert.equal(copy.includes(String.fromCharCode(0x2014)), false);
  assert.equal(copy.includes(String.fromCharCode(0x2013)), false);
  assert.equal(copy.includes('8381215'), false);
  assert.equal(copy.includes('$'), false);
  assert.equal(/3\s*(to|-)\s*5\s*weeks/i.test(copy), false);
  assert.equal(/\[VERIFY]/i.test(copy), false);
  assert.equal(/lifetime/i.test(copy), false);
  assert.equal(/built to last/i.test(copy), false);
  assert.equal(/award/i.test(copy), false);
  assert.equal(/best remodeler/i.test(copy), false);
  assert.equal(bath.faqs.some((faq) => /how much/i.test(faq.question)), false);
  assert.equal(bath.benefits.includes('Written workmanship guarantee on our labor'), true);

  const page = readFileSync('app/services/[slug]/page.tsx', 'utf8');
  assert.match(page, /isBathroomNearMe \? undefined : service\.planningFrom/);
  assert.match(page, /isBathroomNearMe \? BATHROOM_NEAR_ME_TIMELINE : content\.timeline/);
  assert.match(page, /isBathroomNearMe\s*\?\s*BATHROOM_NEAR_ME_SECTIONS/);
  const seo = readFileSync('shared/seoContent.ts', 'utf8');
  assert.match(seo, /timeline: 'Most bathroom remodels run 3 to 6 weeks from permit approval/);
});
