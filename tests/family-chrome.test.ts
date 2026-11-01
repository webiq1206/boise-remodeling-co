import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApprovedHomeHero } from '../components/approved/ApprovedHomeHero.tsx';
import { HeroPhoto } from '../components/family/HeroPhoto.tsx';
import { Footer } from '../components/Footer.tsx';
import { DOPL_LICENSE_SEARCH } from '../components/RegistrationLine.tsx';
import { matchesRoute, isActiveHref } from '../lib/family/types.ts';
import { FAMILY_BRAND } from '../lib/familyBrand.ts';
import { BUSINESS_VCARD_PATH } from '../lib/vcard.ts';
import { SERVICES } from '../shared/contentData.ts';
import { P5_FACEBOOK_URL, P5_GBP_URL } from '../shared/gbpProfile.ts';
import { GUIDE_PAGES } from '../shared/guideContent.ts';
import { publicFooterLine, SITE_CONFIG } from '../shared/siteConfig.ts';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

// Phase 2 family chrome: the shared components read every Remodeling fact from
// lib/familyBrand.ts. These pin that the config says what the site says.
test('the brand config carries this site’s facts, one CTA and one destination', () => {
  assert.equal(FAMILY_BRAND.cta.label, 'Request a quote');
  assert.equal(FAMILY_BRAND.cta.href, '/#request');
  assert.equal(FAMILY_BRAND.phone.telHref, SITE_CONFIG.phoneHref);
  assert.equal(FAMILY_BRAND.phone.smsHref, SITE_CONFIG.phoneSmsHref);
  assert.equal(FAMILY_BRAND.phone.display, '(208) 477-1169');
  assert.equal(FAMILY_BRAND.saveContactHref, BUSINESS_VCARD_PATH);
  assert.equal(FAMILY_BRAND.parentFacebook.href, P5_FACEBOOK_URL);
  assert.deepEqual(FAMILY_BRAND.parentGoogle, { href: P5_GBP_URL, label: 'P5 Home Co on Google' });
  assert.equal(FAMILY_BRAND.nap.line, publicFooterLine());
  assert.match(FAMILY_BRAND.nap.line, /4031 W Wapoot St, Meridian, ID 83646/);
  assert.equal(FAMILY_BRAND.registration.href, DOPL_LICENSE_SEARCH);
  // Approved C7 check (scripts/verify-p5-mobile-seo.mjs): the bar is on the first screen below 1180px.
  assert.equal(FAMILY_BRAND.bar.showOverHero, true);
  assert.equal(FAMILY_BRAND.header.desktopFrom, 1180);
  // The /estimate request wizard owns the bottom of the screen.
  assert.equal(matchesRoute('/estimate', FAMILY_BRAND.bar.hiddenOn), true);
  assert.equal(matchesRoute('/re-10-repairs-boise', FAMILY_BRAND.bar.hiddenOn), true);
  assert.equal(matchesRoute('/', FAMILY_BRAND.bar.hiddenOn), false);
  assert.equal(matchesRoute('/estimates', FAMILY_BRAND.bar.hiddenOn), false);
  // Dark header only over the photo hero.
  assert.equal(matchesRoute('/', FAMILY_BRAND.header.darkOn), true);
  assert.equal(matchesRoute('/services', FAMILY_BRAND.header.darkOn), false);
});

test('route matching and active navigation', () => {
  assert.equal(matchesRoute('/services/kitchen-remodel', ['/services/*']), true);
  assert.equal(matchesRoute('/services', ['/services/*']), true);
  assert.equal(matchesRoute('/servicesx', ['/services/*']), false);
  assert.equal(matchesRoute('/about/', ['/about']), true);
  assert.equal(isActiveHref('/services/kitchen-remodel', '/services'), true);
  assert.equal(isActiveHref('/', '/services'), false);
  assert.equal(isActiveHref('/', '/'), true);
  assert.equal(isActiveHref('/', '/#request'), false);
});

test('every footer link group points at a published page', () => {
  const published = new Set(GUIDE_PAGES.map((guide) => `/guides/${guide.slug}`));
  const resources = FAMILY_BRAND.footer.groups.find((group) => group.title === 'Resources');
  assert.ok(resources);
  for (const link of resources.links.filter((item) => item.href.startsWith('/guides/'))) {
    assert.ok(published.has(link.href), link.href);
  }
  const services = FAMILY_BRAND.footer.groups.find((group) => group.title === 'Services');
  assert.equal(services?.links.length, SERVICES.length + 1);
});

test('the footer renders the family row, NAP, hours and one registration link, with no headings', () => {
  const html = renderToStaticMarkup(React.createElement(Footer));
  assert.equal(/<h[1-6]\b/.test(html), false);
  for (const name of ['P5 Home Co', 'Boise Construction Co', 'Boise Handyman Co', 'Boise Cabinet Co']) {
    assert.match(html, new RegExp(`<a href="https://[^"]+" rel="noopener">${name}</a>`), name);
  }
  assert.match(html, /<span class="fam-footer-current" aria-current="true">Boise Remodeling Co<\/span>/);
  assert.equal(/rel="noopener noreferrer">(P5 Home Co|Boise)/.test(html), false);
  assert.match(html, /Public representative: Nick Perkins/);
  assert.match(html, /Mon to Fri 9 to 6, Sat 9 to 4 Mountain\. Closed Sunday\./);
  assert.match(html, /mailto:hello@boiseremodeling\.co/);
  assert.match(html, /href="\/contact\.vcf"/);
  assert.match(html, /is a DBA of <a href="https:\/\/p5homeco\.com" rel="noopener">P5 Home Co LLC<\/a>/);
  assert.match(html, /<a href="\/subcontractor" rel="nofollow">Subcontractor login<\/a>/);
  assert.equal((html.match(/>Idaho Registered Contractor #8381215<\/a>/g) ?? []).length, 1);
  assert.equal(html.includes('Boise ADU Co'), false);
  // The parent's Facebook page and Google profile, once each.
  assert.equal((html.match(/data-testid="link-footer-facebook"/g) ?? []).length, 1);
  assert.equal((html.match(/data-testid="link-footer-google"/g) ?? []).length, 1);
  assert.match(html, /<a href="https:\/\/www\.google\.com\/search\?kgmid=\/g\/11ntl1t7dc" rel="noopener" target="_blank" data-testid="link-footer-google">P5 Home Co on Google<\/a>/);
});

test('the homepage hero is the family template with sourced proof', () => {
  const html = renderToStaticMarkup(React.createElement(ApprovedHomeHero));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<h1 class="fam-hero-title" id="family-hero-title">Boise home remodeling\. <span class="fam-hero-accent">One team, start to finish\.<\/span><\/h1>/);
  assert.match(html, /Design-build remodeling in Boise/);
  const cta = html.match(/<a [^>]*data-hero-cta="primary"[^>]*>([^<]+)<\/a>/);
  assert.ok(cta, 'hero primary CTA');
  assert.match(cta[0], /href="\/#request"/);
  assert.match(cta[0], /fam-btn--hero fam-btn--lg/);
  assert.equal(cta[1], 'Request a quote');
  assert.match(html, /<a href="tel:\+12084771169" class="fam-hero-link">Call or text \(208\) 477-1169<\/a>/);
  assert.match(html, /<picture class="fam-hero-media"><source media="\(max-width: 1023px\)"/);
  assert.match(html, /<img [^>]*fetchPriority="high"[^>]*class="fam-hero-img"/);
  // Support line: 14 words at most.
  const support = html.match(/<p class="fam-hero-support">([^<]+)<\/p>/)?.[1] ?? '';
  assert.ok(support.split(/\s+/).length <= 14, support);
  // Proof: only facts already published on the site.
  assert.match(html, /Idaho Registered Contractor #8381215/);
  assert.match(html, /Written scope before any price/);
  assert.match(html, /Two-year workmanship warranty/);
  const kitchen = SERVICES.find((service) => service.slug === 'kitchen-remodel');
  assert.match(html, new RegExp(`Kitchen remodels planning from \\${kitchen?.planningFrom}`));
});

// The phone crop through /_next/image sometimes never got a response, which held
// the load event open and timed out scripts/verify-p5-mobile-seo.mjs. Both hero
// files are already sized WebP, so the hero serves them as is.
test('the homepage hero serves its already-sized files as is, never through /_next/image', () => {
  const html = renderToStaticMarkup(React.createElement(ApprovedHomeHero));
  assert.equal(html.includes('/_next/image'), false);
  const phone = '/family/remodeling-hero-kitchen-island-phone.webp';
  const desktop = '/family/remodeling-hero-kitchen-island.webp';
  assert.match(html, new RegExp(`<link rel="preload" as="image" href="${phone}" media="\\(max-width: 1023px\\)"`));
  assert.match(html, new RegExp(`<link rel="preload" as="image" href="${desktop}" media="\\(min-width: 1024px\\)"`));
  assert.match(html, new RegExp(`<source media="\\(max-width: 1023px\\)" srcSet="${phone}" width="760" height="1024"/>`));
  assert.match(html, new RegExp(`<img [^>]*src="${desktop}"[^>]*class="fam-hero-img"`));
  assert.equal(/imageSrcSet|sizes="100vw"/.test(html), false);
});

test('HeroPhoto still goes through the optimizer unless a file opts out', () => {
  const props = {
    image: { src: '/a.webp', width: 1536, height: 1024, alt: 'A' },
    phoneImage: { src: '/b.webp', width: 760, height: 1024, unoptimized: true },
    eyebrow: 'Eyebrow',
    title: 'Title',
    primary: { label: 'Go', href: '/' },
  };
  const html = renderToStaticMarkup(React.createElement(HeroPhoto, props));
  assert.match(html, /<link rel="preload" as="image" href="\/b\.webp" media="\(max-width: 1023px\)"/);
  assert.match(html, /<source media="\(max-width: 1023px\)" srcSet="\/b\.webp" width="760"/);
  assert.match(html, /<link rel="preload" as="image" imageSrcSet="\/_next\/image\?url=%2Fa\.webp[^"]*" imageSizes="100vw" media="\(min-width: 1024px\)"/);
  assert.match(html, /<img [^>]*srcSet="\/_next\/image\?url=%2Fa\.webp/);
});

test('the shared chrome matches its manifest and stays brand-agnostic', () => {
  const out = execFileSync(process.execPath, ['scripts/verify-family-chrome.mjs'], { encoding: 'utf8' });
  assert.match(out, /shared files match boise-remodeling-co/);
  const manifest = JSON.parse(readFileSync('lib/family/manifest.json', 'utf8'));
  assert.equal(manifest.source, 'boise-remodeling-co');
  for (const file of ['components/family/SiteHeader.tsx', 'components/family/MobileMenu.tsx', 'components/family/MobileActionBar.tsx', 'components/family/SiteFooter.tsx', 'components/family/HeroPhoto.tsx', 'components/family/ProofStrip.tsx', 'components/family/SkipLink.tsx', 'components/family/Button.tsx', 'styles/family-tokens.css', 'styles/family-chrome.css']) {
    assert.ok(file in manifest.files, file);
  }
  assert.equal('lib/familyBrand.ts' in manifest.files, false);
});
