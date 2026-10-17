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
import { PROOF_STATS, TRUST_ITEMS } from '../shared/siteContent.ts';

// Pages compile with the classic JSX runtime (tsconfig jsx: preserve). The
// site build injects React; this test does the same before rendering.
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const CLAIM = /Est\. 2020|\bfounded in 2020\b|\bsince 2020\b|Founded in 2020|Founded 2020|\bfounded 2020\b|foundingDate/i;

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
  const aboutSource = readFileSync('app/about/page.tsx', 'utf8');
  assert.match(aboutSource, /founded in 2020/);
  assert.match(aboutSource, /since <em className="brc-accent">2020<\/em>/);
  assert.match(readFileSync('lib/page-metadata.ts', 'utf8'), /founded 2020/);
  assert.match(readFileSync('shared/gbpProfile.ts', 'utf8'), /Founded in 2020/);
});

test('published pages, schema, and llms files do not render the 2020 founding claim', () => {
  const aboutHtml = renderToStaticMarkup(React.createElement(AboutPage));
  const heroHtml = renderToStaticMarkup(React.createElement(HeroSection));
  const homeHtml = renderToStaticMarkup(React.createElement(ApprovedHome, { hero: null }));
  assert.match(aboutHtml, /Boise Remodeling Co, design-build/);
  assert.equal(PROOF_STATS.projectsCompleted, '100+');
  assert.equal(heroHtml.includes('100+ Projects'), false);
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

test('census and climate years are not treated as a founding claim', () => {
  const kept = publishFoundingCopy('Census ACS 2020–2024 and NOAA 1991–2020 normals. Founded in 2020. since 2020.');
  assert.match(kept, /Census ACS 2020/);
  assert.match(kept, /1991–2020/);
  assertHidden('census sample', kept);
});
