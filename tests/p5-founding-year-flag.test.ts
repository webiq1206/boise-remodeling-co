import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { withBrandPageMetadata } from '../lib/brand-page-metadata.ts';
import { buildPageMetadata } from '../lib/page-metadata.ts';
import { generateLocalBusinessSchema, generateOrganizationSchema } from '../lib/schema.ts';
import { generateMetaDescription } from '../lib/seo.ts';
import { GBP_DESCRIPTION } from '../shared/gbpProfile.ts';
import { HOMEPAGE_FAQS } from '../shared/homepageFaqs.ts';
import { publishFoundingCopy, SHOW_FOUNDING_YEAR, SHOW_UNPROVEN_SATISFACTION_GUARANTEE } from '../shared/publicClaims.ts';
import { TRUST_ITEMS } from '../shared/siteContent.ts';

const CLAIM = /since\s+2020|founded\s+in\s+2020|founded\s*:?\s*2020|est\.?\s*2020/i;

test('SHOW_FOUNDING_YEAR is off and drops only the founding-year claims', () => {
  assert.equal(SHOW_FOUNDING_YEAR, false);
  assert.equal(
    publishFoundingCopy('Boise Remodeling Co is a design-build remodeling contractor in Boise, founded in 2020 and part of P5.'),
    'Boise Remodeling Co is a design-build remodeling contractor in Boise, part of P5.',
  );
  assert.equal(publishFoundingCopy('Design-build remodeler since 2020'), 'Design-build remodeler');
  assert.equal(
    publishFoundingCopy('BOISE, the arc lines, EST 2020, CO, and BOISE REMODELING'),
    'BOISE, the arc lines, CO, and BOISE REMODELING',
  );
  assert.equal(publishFoundingCopy('Idaho · Est. 2020'), 'Idaho');
  assert.equal(publishFoundingCopy('Est. seasonal value'), 'Est. seasonal value');
  assert.equal(publishFoundingCopy('Boise was founded in 1863'), 'Boise was founded in 1863');
});

test('published pages, schema, and trust copy omit the founding year', () => {
  const about = withBrandPageMetadata(buildPageMetadata({ kind: 'about', path: '/about' }), '/about');
  const aboutTitle = typeof about.title === 'object' && about.title && 'absolute' in about.title ? about.title.absolute : '';
  assert.equal(CLAIM.test(`${aboutTitle}\n${about.description}`), false);

  for (const city of ['eagle', 'boise', 'nampa', 'kuna', 'meridian']) {
    const meta = buildPageMetadata({
      kind: 'area',
      path: `/areas/${city}`,
      cityName: city,
      citySlug: city,
    });
    assert.equal(CLAIM.test(`${meta.title}\n${meta.description}`), false, city);
  }

  const business = JSON.stringify(generateLocalBusinessSchema());
  const organization = JSON.stringify(generateOrganizationSchema());
  assert.equal(business.includes('foundingDate'), false);
  assert.equal(organization.includes('foundingDate'), false);
  assert.equal(CLAIM.test(business), false);
  assert.equal(CLAIM.test(organization), false);
  assert.equal(CLAIM.test(GBP_DESCRIPTION), false);
  assert.equal(CLAIM.test(HOMEPAGE_FAQS.map((item) => item.a).join('\n')), false);
  assert.equal(TRUST_ITEMS.some((item) => CLAIM.test(item)), false);
  assert.equal(CLAIM.test(readFileSync('public/brand/brand-kit.html', 'utf8')), false);
  assert.equal(CLAIM.test(readFileSync('public/brand/BRAND.md', 'utf8')), false);
  assert.equal(CLAIM.test(readFileSync('public/llms.txt', 'utf8')), false);
  assert.equal(CLAIM.test(readFileSync('public/llms-full.txt', 'utf8')), false);
});

test('founding-year sentences stay in source while the flag is off', () => {
  const pageMetadata = readFileSync('lib/page-metadata.ts', 'utf8');
  const aboutCopy = readFileSync('lib/brand-page-metadata.ts', 'utf8');
  const aboutPage = readFileSync('app/about/page.tsx', 'utf8');
  const llms = readFileSync('scripts/generate-llms-txt.ts', 'utf8');
  const prompt = readFileSync('scripts/marketing-image-prompts.json', 'utf8');
  assert.match(pageMetadata, /founded 2020/);
  assert.match(pageMetadata, /Founded in 2020/);
  assert.match(aboutCopy, /since 2020/);
  assert.match(aboutCopy, /founded in 2020/);
  assert.match(aboutPage, /founded in 2020/);
  assert.match(aboutPage, /since 2020/);
  assert.match(readFileSync('shared/siteContent.ts', 'utf8'), /Est\. \$\{PROOF_STATS\.established\}/);
  assert.match(llms, /since 2020/);
  assert.match(llms, /Founded: 2020/);
  assert.match(prompt, /EST 2020/);
});

test('satisfaction guaranteed stays in seo.ts and is omitted while the flag is off', () => {
  assert.equal(SHOW_UNPROVEN_SATISFACTION_GUARANTEE, false);
  const source = readFileSync('lib/seo.ts', 'utf8');
  assert.match(source, /Satisfaction guaranteed/);
  const service = generateMetaDescription({ serviceName: 'Kitchen Remodel', serviceSlug: 'kitchen-remodel' });
  const unknownCity = generateMetaDescription({
    serviceName: 'Kitchen Remodel',
    serviceSlug: 'kitchen-remodel',
    city: 'NotACity',
  });
  assert.equal(/satisfaction guaranteed/i.test(service), false);
  assert.match(service, /Idaho Registered Contractor #8381215, bonded & insured/);
  assert.equal(/satisfaction guaranteed/i.test(unknownCity), false);
  assert.match(unknownCity, /Free in-home consultation/);
});

test('the open graph page preview is the year-free seal', () => {
  const hash = createHash('sha256').update(readFileSync('public/brand/page-preview.png')).digest('hex');
  assert.equal(hash, 'da5ff48bfb7d52e90a20b3dfc84707960cf78f05234f7754e9e8ebe6dc3bebea');
});

