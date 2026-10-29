import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutPage from '../app/about/page.tsx';
import { ApprovedHome } from '../components/approved/ApprovedHome.tsx';
import { HeroSection } from '../components/sections/HeroSection.tsx';
import { withBrandPageMetadata } from '../lib/brand-page-metadata.ts';
import { buildPageMetadata } from '../lib/page-metadata.ts';
import {
  generateHomePageSchemaGraph,
  generateLocalBusinessSchema,
  generateOrganizationSchema,
} from '../lib/schema.ts';
import { BUSINESS_INFO } from '../lib/seo.ts';
import { getCityBySlug } from '../shared/contentData.ts';
import { FOUNDED_YEAR, SHOW_FOUNDED_YEAR, publishFoundingCopy, publicLogoPath, publicPreviewPath } from '../shared/foundingClaim.ts';
import { GBP_DESCRIPTION, GBP_NAP, publicGbpNap } from '../shared/gbpProfile.ts';
import { getDefaultOgImage } from '../lib/seo.ts';
import { HOMEPAGE_FAQS } from '../shared/homepageFaqs.ts';
import { getAreaIntro, SERVICE_SEO_CONTENT } from '../shared/seoContent.ts';
import { PROOF_STATS, TRUST_ITEMS, visibleTrustItems } from '../shared/siteContent.ts';

// Pages compile with the classic JSX runtime (tsconfig jsx: preserve). The
// site build injects React; this test does the same before rendering.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

/** Guard list. These phrases are not trust badges. The flag may add only `Est. YYYY`. */
const FOUNDING_PHRASES = [
  'Est. 2020',
  'Established 2020',
  'founded in 2020',
  'since 2020',
  'Founded in 2020',
  'Founded 2020',
  'founded 2020',
  'years in business',
  '6 years in business',
  'years of experience',
  '5+ years',
  'foundingDate',
] as const;

const CLAIM = new RegExp(FOUNDING_PHRASES.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

function assertHidden(label: string, text: string) {
  const hit = text.match(CLAIM);
  assert.equal(hit, null, `${label} still publishes a 2020 founding claim: ${hit?.[0]}`);
}

test('the 2020 founding year stays in source and stays off the public flag', () => {
  assert.equal(SHOW_FOUNDED_YEAR, false);
  assert.equal(FOUNDED_YEAR, '2020');
  assert.equal(PROOF_STATS.established, '2020');
  assert.equal(BUSINESS_INFO.founded, '2020');
  assert.equal(GBP_NAP.founded, '2020');
  assert.equal(TRUST_ITEMS.includes(`Est. ${PROOF_STATS.established}`), false);
  assert.deepEqual(visibleTrustItems(false), TRUST_ITEMS);
  const aboutSource = readFileSync('app/about/page.tsx', 'utf8');
  assert.match(aboutSource, /SHOW_FOUNDING_YEAR/);
  assert.match(aboutSource, /founded P5 in Colorado in 2020/);

  assert.match(readFileSync('lib/page-metadata.ts', 'utf8'), /founded 2020/);
  assert.match(readFileSync('shared/gbpProfile.ts', 'utf8'), /Founded in 2020/);
});

test('published pages, schema, and llms files do not render the 2020 founding claim', () => {
  const aboutHtml = renderToStaticMarkup(React.createElement(AboutPage));
  const heroHtml = renderToStaticMarkup(React.createElement(HeroSection));
  const homeHtml = renderToStaticMarkup(React.createElement(ApprovedHome, { hero: null }));
  assert.match(aboutHtml, /About Boise Remodeling/);
  assert.doesNotMatch(aboutHtml, /founded[^<.]{0,80}2020/i);
  assert.doesNotMatch(heroHtml, /100\+ Projects/);
  assert.match(homeHtml, /Remodeling contractors in Boise/);
  assertHidden('about page', aboutHtml);
  assertHidden('hero', heroHtml);
  assertHidden('home', homeHtml);

  const org = generateOrganizationSchema();
  const business = generateLocalBusinessSchema('Boise');
  const graph = generateHomePageSchemaGraph(
    HOMEPAGE_FAQS.map((faq) => ({ question: faq.q, answer: faq.a })),
  );
  assert.equal('foundingDate' in org, false);
  assert.equal('foundingDate' in business, false);
  assertHidden('organization schema', JSON.stringify(org));
  assertHidden('local business schema', JSON.stringify(business));
  assertHidden('homepage schema graph', JSON.stringify(graph));

  for (const path of ['/areas/eagle', '/areas/boise', '/areas/nampa', '/areas/kuna', '/areas/meridian'] as const) {
    const slug = path.split('/').pop() ?? '';
    const meta = withBrandPageMetadata(buildPageMetadata({
      kind: 'area',
      cityName: slug,
      citySlug: slug,
      path,
    }), '/areas/[city]');
    assertHidden(path, `${meta.description ?? ''}`);
  }
  const aboutMeta = withBrandPageMetadata(buildPageMetadata({ kind: 'about', path: '/about' }), '/about');
  assertHidden('about meta', `${aboutMeta.description ?? ''} ${JSON.stringify(aboutMeta.title)}`);
  assertHidden('gbp description', GBP_DESCRIPTION);
  assertHidden('homepage faq', HOMEPAGE_FAQS.map((faq) => faq.a).join('\n'));
  assertHidden('kitchen overview', SERVICE_SEO_CONTENT['kitchen-remodel'].overview);
  assertHidden('room addition overview', SERVICE_SEO_CONTENT['room-addition'].overview);

  const boise = getCityBySlug('boise');
  assert.ok(boise);
  const overview = publishFoundingCopy(
    `Boise Remodeling Co is a design-build remodeling contractor in ${boise.name}, founded in 2020 and part of P5. ${getAreaIntro(boise)}`,
  );
  assert.match(overview, /Census ACS 2020/);
  assertHidden('boise area overview', overview);

  for (const file of ['public/llms.txt', 'public/llms-full.txt', 'public/brand/BRAND.md', 'public/brand/brand-kit.html']) {
    assertHidden(file, readFileSync(file, 'utf8'));
  }

  const kit = readFileSync('public/brand/brand-kit.html', 'utf8');
  assert.equal(/<img[^>]+svg\/seal\//.test(kit), false);
  assert.equal(existsSync('public/brand/svg/seal/light/boise-remodeling-co-seal-charcoal-accent.svg'), true);
  assert.equal(existsSync('public/brand/png/seal/any/boise-remodeling-co-seal-on-charcoal-512px.png'), true);
  assert.equal(existsSync('public/brand/page-preview.png'), true);
  assert.equal(publicLogoPath().includes('/seal/'), false);
  assert.equal(publicPreviewPath().includes('page-preview.png'), false);
  assert.equal(String(business.logo).includes('/seal/'), false);
  const orgLogo = org.logo as { url?: string };
  assert.equal(String(orgLogo.url).includes('/seal/'), false);
  const aboutImages = aboutMeta.openGraph?.images;
  const aboutImage = Array.isArray(aboutImages) ? aboutImages[0] : undefined;
  const aboutImageUrl = typeof aboutImage === 'string' ? aboutImage : aboutImage && 'url' in aboutImage ? String(aboutImage.url) : '';
  assert.equal(aboutImageUrl.includes('page-preview.png'), false);
  assert.equal(aboutImageUrl.includes('/seal/'), false);
  assert.equal(getDefaultOgImage().includes('og-default.png'), false);
  assert.equal('founded' in publicGbpNap(), false);
});

test('with the founding flag off, schema JSON has no seal URL', () => {
  assert.equal(SHOW_FOUNDED_YEAR, false);
  const icon = '/brand/search-icon-180.png';
  const seal = '/brand/png/seal/any/boise-remodeling-co-seal-on-charcoal-512px.png';
  assert.equal(publicLogoPath(), icon);
  assert.equal(existsSync(`public${icon}`), true);
  assert.equal(existsSync(`public${seal}`), true);
  const blobs = [
    JSON.stringify(generateOrganizationSchema()),
    JSON.stringify(generateLocalBusinessSchema()),
    JSON.stringify(generateLocalBusinessSchema('Boise')),
    JSON.stringify(generateHomePageSchemaGraph(
      HOMEPAGE_FAQS.map((faq) => ({ question: faq.q, answer: faq.a })),
    )),
  ];
  for (const json of blobs) {
    assert.equal(json.includes(seal), false);
    assert.equal(json.includes('/seal/'), false);
    assert.equal(json.includes('page-preview.png'), false);
    assert.equal(json.includes('boise-remodeling-co-seal'), false);
    assert.equal(json.includes(icon), true);
  }
  const aboutHtml = renderToStaticMarkup(React.createElement(AboutPage));
  const homeHtml = renderToStaticMarkup(React.createElement(ApprovedHome, { hero: null }));
  for (const html of [aboutHtml, homeHtml]) {
    assert.equal(html.includes(seal), false);
    assert.equal(html.includes('/seal/'), false);
    assert.equal(html.includes('page-preview.png'), false);
    assert.equal(html.includes('boise-remodeling-co-seal'), false);
  }
  assert.equal(aboutHtml.includes(icon), true);
});

test('the founding flag adds at most one trust badge', () => {
  const on = visibleTrustItems(true);
  const badges = on.filter((item) => CLAIM.test(item));
  assert.deepEqual(badges, [`Est. ${PROOF_STATS.established}`]);
  assert.equal(on.filter((item) => item.startsWith('Est. ')).length, 1);
  const off = visibleTrustItems(false);
  for (const phrase of FOUNDING_PHRASES) {
    assert.equal(off.some((item) => item.toLowerCase().includes(phrase.toLowerCase())), false, phrase);
  }
  for (const phrase of FOUNDING_PHRASES) {
    if (phrase === `Est. ${PROOF_STATS.established}`) continue;
    assert.equal(on.some((item) => item.toLowerCase() === phrase.toLowerCase()), false, phrase);
  }
});

test('operator docs leave the founding year blank and preserve confirmed registration', () => {
  const files = [
    'local-seo-audit/gbp-operator-runbook.md',
    'local-seo-audit/GBP-STEP-BY-STEP-GUIDE.md',
    'local-seo-audit/07-nap-citations.md',
    'local-seo-audit/11-eeat-audit.md',
    'seo-audit/trust-signal-map.md',
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.match(text, /leave blank until documented/);
    assert.equal(/\b2017\b/.test(text), false, `${file} still names 2017`);

    assert.equal(/Founded in 2017|Founded 2017|Opening date: 2017/.test(text), false, file);
  }
  const guide = readFileSync('local-seo-audit/GBP-STEP-BY-STEP-GUIDE.md', 'utf8');
  assert.match(guide, /Idaho Registered Contractor #8381215, bonded, and insured/);
  const gap = readFileSync('seo-audit/competitor-gap-analysis.md', 'utf8');
  assert.equal(/BRC founded 2017/.test(gap), false);
  assert.match(gap, /leave blank until documented/);
  assert.match(gap, /NARI 2017 CotY/);
});

test('marketing image prompts do not ask for an EST seal or branded shirts', () => {
  const prompts = readFileSync('scripts/marketing-image-prompts.json', 'utf8');
  assert.equal(/EST 2020|t-shirt|black tee/i.test(prompts), false);
  assert.match(prompts, /No people, no text, no logos/);
});

test('census and climate years are not treated as a founding claim', () => {
  const kept = publishFoundingCopy('Census ACS 2020–2024 and NOAA 1991–2020 normals. Founded in 2020. since 2020.');
  assert.match(kept, /Census ACS 2020/);
  assert.match(kept, /1991–2020/);
  assertHidden('census sample', kept);
});
