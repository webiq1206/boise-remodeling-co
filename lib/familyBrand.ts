/**
 * Boise Remodeling Co configuration for the shared family chrome.
 *
 * BRAND-OWNED: this is the one file where this site differs from its siblings.
 * The components in components/family/ and the styles in styles/family-*.css are
 * synced byte-identical across the P5 Home Co family (lib/family/manifest.json);
 * they read everything brand-specific from FAMILY_BRAND below.
 *
 * Kept free of heavy imports on purpose: the header and bottom bar are client
 * components, so whatever this module imports ships to every page.
 */
import type { FamilyBrand } from '@/lib/family/types';
import { DOPL_LICENSE_SEARCH, REGISTRATION_LINE } from '@/components/RegistrationLine';
import { CONTENT_HUBS } from '@/shared/contentHubs';
import { CITIES, SERVICES } from '@/shared/contentData';
import { P5_FACEBOOK_URL } from '@/shared/gbpProfile';
import { publicFooterLine, SITE_CONFIG } from '@/shared/siteConfig';
import { toSentenceCase } from '@/shared/sentenceCase';

const LOCKUP = { width: 412, height: 50 };

/** The first three pillar guides, as the footer has always listed them. */
const PILLAR_GUIDES = CONTENT_HUBS.filter((hub) => hub.priorityTier <= 2)
  .slice(0, 3)
  .map((hub) => ({ label: toSentenceCase(hub.title), href: `/guides/${hub.pillarSlug}` }));

export const FAMILY_BRAND: FamilyBrand = {
  id: 'remodeling',
  name: SITE_CONFIG.name,
  domain: SITE_CONFIG.siteUrl.replace(/\/$/, ''),
  lockupLabel: `${SITE_CONFIG.name}, a P5 Home Company`,
  lockup: {
    onDark: { src: '/brand/approved-lockup-light.svg', ...LOCKUP },
    onLight: { src: '/brand/approved-lockup-dark.svg', ...LOCKUP },
  },
  accent: '#7d9479',
  accentInk: '#4d6249',
  header: {
    // The homepage opens on a full-bleed photograph; interior pages open on paper and stone.
    darkOn: ['/'],
    // Seven navigation items do not fit beside the lockup and CTA at 1024px, and the approved
    // C7 check (scripts/verify-p5-mobile-seo.mjs) keeps the bottom bar on screen below 1180px.
    desktopFrom: 1180,
    // Owner decision #102: Call with its label, then Text. Chat lives in the request block and the menu.
    phoneActions: ['call', 'text'],
  },
  nav: [
    { label: 'Services', href: '/services' },
    { label: 'Design ideas', href: '/design-ideas' },
    { label: 'Areas', href: '/areas' },
    { label: 'About', href: '/about' },
    { label: 'Guides', href: '/guides' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ],
  // One label, one destination: the short request on the homepage.
  cta: { label: 'Request a quote', href: '/#request' },
  phone: { display: SITE_CONFIG.phone, telHref: SITE_CONFIG.phoneHref, smsHref: SITE_CONFIG.phoneSmsHref },
  chat: { enabled: true, label: 'Chat', openEvent: 'p5:assistant-open' },
  bar: {
    // Approved C7 decision: the bar is on the first screen, over the hero.
    showOverHero: true,
    callLabel: 'Call',
    // The /estimate request wizard and the RE-10 flow own the bottom of the screen.
    hiddenOn: ['/estimate', '/re-10*'],
    yieldToBodyFlags: ['assistantOpen', 'hideMobileNavBar', 'p5EstimatorActive', 'estimateWizard'],
  },
  analytics: { ctaEvent: 'primary_cta_clicked', barCtaEvent: 'mobile_sticky_cta_clicked' },
  // Same path as BUSINESS_VCARD_PATH in lib/vcard.ts (that module pulls in the SEO data).
  saveContactHref: '/contact.vcf',
  email: SITE_CONFIG.email,
  tagline: 'Treasure Valley design-build, built on clarity and craftsmanship.',
  parentLine: 'A P5 Home Co company',
  footer: {
    groups: [
      {
        title: 'Services',
        links: [
          // Sentence case for menu labels (owner decision C, 1 November 2026).
          ...SERVICES.map((service) => ({ label: toSentenceCase(service.name), href: `/services/${service.slug}` })),
          { label: 'All services', href: '/services' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Design ideas', href: '/design-ideas' },
          { label: 'Why choose us', href: '/#why-choose-us' },
          { label: 'How we build', href: '/#how-we-build' },
          { label: 'Estimate from plans', href: '/remodel-plans-boise' },
          { label: 'Contact', href: '/contact' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'Remodeling guides', href: '/guides' },
          { label: 'Planning downloads', href: '/resources' },
          { label: 'Blog', href: '/blog' },
          ...PILLAR_GUIDES,
        ],
      },
    ],
    areas: {
      label: 'Service areas',
      href: '/areas',
      links: CITIES.map((city) => ({ label: `${city.name}, Idaho`, href: `/areas/${city.slug}` })),
    },
    legal: [
      { label: 'Site map', href: '/sitemap' },
      { label: 'Privacy policy', href: '/privacy-policy' },
      { label: 'Terms of service', href: '/terms-of-service' },
      { label: 'Subcontractor login', href: '/subcontractor', rel: 'nofollow' },
    ],
    // Required parent-company disclosure: this brand is a DBA of P5 Home Co LLC.
    disclosure: { before: `${SITE_CONFIG.name} is a DBA of `, linkLabel: SITE_CONFIG.legalName, href: 'https://p5homeco.com', after: '' },
    copyrightName: SITE_CONFIG.name,
  },
  // Boise ADU Co is left out until its own site exists; its projects run through Boise Construction Co.
  family: {
    label: 'The P5 Home Co family',
    companies: [
      { name: 'P5 Home Co', href: 'https://p5homeco.com' },
      { name: 'Boise Construction Co', href: 'https://boiseconstruction.co' },
      { name: 'Boise Remodeling Co', href: 'https://boiseremodeling.co' },
      { name: 'Boise Handyman Co', href: 'https://boisehandyman.co' },
      { name: 'Boise Cabinet Co', href: 'https://boisecabinet.co' },
    ],
  },
  nap: { line: publicFooterLine() },
  hours: 'Mon to Fri 9 to 6, Sat 9 to 4 Mountain. Closed Sunday.',
  registration: {
    text: REGISTRATION_LINE,
    href: DOPL_LICENSE_SEARCH,
    title: 'Look up registration 8381215 on Idaho DOPL',
    ariaLabel: 'Verify with Idaho DOPL: look up registration 8381215, opens in a new tab',
    rel: 'noopener noreferrer',
  },
  // P5 Home Co's Facebook page (shared/gbpProfile); nothing renders until its URL exists.
  parentFacebook: { href: P5_FACEBOOK_URL, label: 'P5 Home Co on Facebook' },
};
