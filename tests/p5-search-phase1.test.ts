import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { withBrandPageMetadata } from '../lib/brand-page-metadata.ts';
import { urlsForChangedFiles } from '../scripts/indexnow-urls.mjs';
import {
  buildPageMetadata,
  fitDescription,
  isCityServiceNoindex,
  buildCanonical,
  FEED_ALTERNATES,
} from '../lib/page-metadata.ts';
import {
  generateLocalBusinessSchema,
  generateOrganizationSchema,
  generateServiceSchema,
  P5_ORG_ID,
} from '../lib/schema.ts';
import { BUSINESS_INFO, generateSafePageTitle } from '../lib/seo.ts';
import { getAllSiteUrls } from '../lib/siteUrls.ts';
import { stripBrandSuffix } from '../lib/page-metadata.ts';
import { BLOG_POSTS } from '../shared/blogContent.ts';
import { CITIES, SERVICES } from '../shared/contentData.ts';
import { CONTENT_HUBS, categoryHubPath, guidePath, isCategoryHubIndexable } from '../shared/contentHubs.ts';
import { GUIDE_PAGES } from '../shared/guideContent.ts';
import { publicFooterLine, SITE_CONFIG } from '../shared/siteConfig.ts';
import { RETIRED_STREET } from './retiredStreet.ts';

const BRAND = ' | Boise Remodeling Co';
// The owner's nine-city service area, 20 November 2026.
const AREAS = [
  'Boise',
  'Meridian',
  'Eagle',
  'Garden City',
  'Nampa',
  'Kuna',
  'Star',
  'Middleton',
  'Caldwell',
  'Ada County',
  'Canyon County',
];

function renderedTitle(meta: { title?: unknown }): string {
  const title = meta.title as { absolute?: string; default?: string } | string | undefined;
  if (typeof title === 'string') return `${title}${BRAND}`;
  if (title && typeof title === 'object' && title.absolute) return title.absolute;
  if (title && typeof title === 'object' && title.default) return title.default;
  return '';
}

const PUBLIC_POSTAL_ADDRESS = {
  '@type': 'PostalAddress',
  addressLocality: 'Meridian',
  addressRegion: 'ID',
  postalCode: '83646',
  addressCountry: 'US',
};

test('contractor schema preserves contacts, served cities and parent without a street address', () => {
  const business = generateLocalBusinessSchema('Eagle');
  assert.deepEqual(business['@type'], ['HomeAndConstructionBusiness', 'GeneralContractor']);
  assert.deepEqual(business.address, PUBLIC_POSTAL_ADDRESS);
  assert.equal((business.address as { streetAddress?: string }).streetAddress, undefined);
  assert.equal(JSON.stringify(business.address).includes('streetAddress'), false);
  assert.equal(business.legalName, 'P5 Home Co LLC');
  assert.equal((business.parentOrganization as { name: string }).name, 'P5 Home Co');
  assert.equal(business.geo, undefined);
  assert.equal(business.employee, undefined);
  assert.equal(business.telephone, '+1-208-477-1169');
  assert.equal(business.email, 'hello@boiseremodeling.co');
  assert.equal(SITE_CONFIG.phone, '(208) 477-1169');
  assert.equal(BUSINESS_INFO.phone, '(208) 477-1169');
  assert.equal((business.contactPoint as { name?: string }).name, undefined);
  assert.equal((business.contactPoint as { contactType: string }).contactType, 'customer service');
  assert.equal((business.contactPoint as { telephone: string }).telephone, '+1-208-477-1169');
  assert.equal((business.contactPoint as { email: string }).email, 'hello@boiseremodeling.co');
  assert.equal((business.parentOrganization as { '@id': string })['@id'], 'https://p5homeco.com/#organization');
  assert.equal((business.parentOrganization as { '@id': string })['@id'], P5_ORG_ID);
  assert.deepEqual(
    (business.areaServed as Array<{ '@type': string; name: string }>).map((area) => [area['@type'], area.name]),
    [
      // The owner's nine-city service area, 20 November 2026.
      ['City', 'Boise'],
      ['City', 'Meridian'],
      ['City', 'Eagle'],
      ['City', 'Garden City'],
      ['City', 'Nampa'],
      ['City', 'Kuna'],
      ['City', 'Star'],
      ['City', 'Middleton'],
      ['City', 'Caldwell'],
      ['AdministrativeArea', 'Ada County'],
      ['AdministrativeArea', 'Canyon County'],
    ],
  );
  assert.deepEqual(
    (business.areaServed as Array<{ name: string }>).map((area) => area.name),
    AREAS,
  );
  assert.deepEqual(business.sameAs, BUSINESS_INFO.sameAs);
  const encoded = JSON.stringify(business);
  assert.equal(encoded.includes('Jared'), false);

  const organization = generateOrganizationSchema();
  assert.deepEqual(
    (organization.areaServed as Array<{ name: string }>).map((area) => area.name),
    AREAS,
  );
  assert.equal((organization.parentOrganization as { '@id': string })['@id'], P5_ORG_ID);
  assert.equal(organization.employee, undefined);
  assert.deepEqual(organization.sameAs, BUSINESS_INFO.sameAs);
  assert.deepEqual(organization.address, PUBLIC_POSTAL_ADDRESS);
  assert.equal((organization.address as { streetAddress?: string }).streetAddress, undefined);
  assert.equal(JSON.stringify(organization).includes('streetAddress'), false);
  assert.equal(organization.legalName, 'P5 Home Co LLC');
  assert.equal(organization.email, 'hello@boiseremodeling.co');
  assert.equal(organization.telephone, '+1-208-477-1169');
  const contact = organization.contactPoint as { contactType: string; name?: string; telephone?: string; email?: string };
  assert.equal(contact.name, undefined);
  assert.equal(contact.contactType, 'customer service');
  assert.equal(contact.telephone, '+1-208-477-1169');
  assert.equal(contact.email, 'hello@boiseremodeling.co');
  assert.equal(JSON.stringify(business).includes('streetAddress'), false);
  assert.equal(RETIRED_STREET.test(JSON.stringify(business)), false);

  for (const service of SERVICES) {
    for (const city of CITIES) {
      const schema = generateServiceSchema(service.name, service.shortDescription, city.name);
      const provider = schema.provider as { address?: unknown; streetAddress?: unknown; '@type': string[] };
      assert.deepEqual(provider['@type'], ['HomeAndConstructionBusiness', 'GeneralContractor']);
      assert.equal(provider.address, undefined);
      assert.equal(provider.streetAddress, undefined);
      assert.equal(JSON.stringify(provider).includes('streetAddress'), false);
      assert.equal((schema.areaServed as { name: string }).name, city.name);
      if (city.name !== 'Garden City') assert.equal(JSON.stringify(schema).includes('Garden City'), false);
      assert.equal(JSON.stringify(schema).includes('streetAddress'), false);
    }
  }
});

test('noindex ADU city pages stay out of the sitemap', () => {
  // Phase 4 owner decision (31 October 2026): Boise Construction Co owns new
  // detached ADUs and no ADU city page has bespoke copy, so all eight ADU city
  // pages are noindexed; the parent /services/adu stays indexed as ADU conversions.
  for (const city of ['kuna', 'star', 'middleton', 'caldwell', 'boise', 'meridian', 'eagle', 'nampa']) {
    assert.equal(isCityServiceNoindex('adu', city), true);
    assert.equal(getAllSiteUrls().some((entry) => entry.path === `/services/adu/${city}`), false);
  }
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/services/adu'), true);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/areas/middleton'), true);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/guides/middleton-remodeling-guide'), true);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/services/room-addition/nampa'), true);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/services/room-addition/boise'), false);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/services/room-addition/eagle'), false);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/services/room-addition/meridian'), false);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/areas/garden-city'), true);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/services/kitchen-remodel/garden-city'), false);
});

test('IndexNow changed URLs skip noindex ADU pages', () => {
  const urls = urlsForChangedFiles(['lib/schema.ts', 'lib/page-metadata.ts'], {
    blog: ['/blog/example'],
    guides: ['/guides/example'],
  });
  for (const city of ['kuna', 'star', 'middleton', 'caldwell']) {
    assert.equal(urls.includes(`/services/adu/${city}`), false);
  }
  assert.equal(urls.includes('/'), true);
  assert.equal(urls.includes('/areas/eagle'), true);
  assert.equal(urls.includes('/areas/middleton'), true);
  assert.equal(urls.includes('/services/kitchen-remodel'), true);
  assert.equal(urls.includes('/blog/example'), true);
});

test('rendered titles stay within 60 and descriptions within 160', () => {
  const rows: Array<{ path: string; title: string; description: string; noindex?: boolean }> = [];
  const push = (path: string, meta: { title?: unknown; description?: string | null; robots?: { index?: boolean } }) => {
    rows.push({
      path,
      title: renderedTitle(meta),
      description: meta.description ?? '',
      noindex: meta.robots?.index === false,
    });
  };

  const homeMetadata = withBrandPageMetadata({
    title: { absolute: 'Boise Home Remodeling Contractors | Boise Remodeling Co' },
    description: fitDescription('Boise home remodeling from one design-build team: kitchens, baths and whole-home remodels. Free in-home visit, a written scope, and calls or texts welcome.'),
    alternates: { canonical: buildCanonical('/') },
  }, '/');
  push('/', homeMetadata);

  for (const service of SERVICES) {
    push(`/services/${service.slug}`, withBrandPageMetadata(buildPageMetadata({
      kind: 'service',
      serviceName: service.name,
      serviceSlug: service.slug,
      path: `/services/${service.slug}`,
    }), '/services/[slug]'));
  }
  for (const city of CITIES) {
    push(`/areas/${city.slug}`, withBrandPageMetadata(buildPageMetadata({
      kind: 'area',
      cityName: city.name,
      citySlug: city.slug,
      path: `/areas/${city.slug}`,
    }), '/areas/[city]'));
  }
  for (const service of SERVICES) {
    for (const city of CITIES) {
      push(`/services/${service.slug}/${city.slug}`, withBrandPageMetadata(buildPageMetadata({
        kind: 'city-service',
        serviceName: service.name,
        serviceSlug: service.slug,
        cityName: city.name,
        citySlug: city.slug,
        path: `/services/${service.slug}/${city.slug}`,
        noindex: isCityServiceNoindex(service.slug, city.slug),
      }), '/services/[slug]/[city]'));
    }
  }
  push('/about', withBrandPageMetadata(buildPageMetadata({ kind: 'about', path: '/about' }), '/about'));
  push('/estimate', withBrandPageMetadata({
    title: { absolute: 'Remodel Cost Estimator | Boise Remodeling Co' },
    description: fitDescription('Get a preliminary planning range for kitchen, bathroom, whole-home, addition, ADU, and basement remodels in Boise, Meridian, Eagle, Nampa, and the Treasure Valley. Free, no obligation.'),
    alternates: { canonical: buildCanonical('/estimate') },
  }, '/estimate'));

  for (const post of BLOG_POSTS) {
    push(`/blog/${post.slug}`, withBrandPageMetadata({
      title: generateSafePageTitle(stripBrandSuffix(post.seoTitle || post.title)),
      description: fitDescription(post.metaDescription || post.excerpt),
      alternates: { canonical: buildCanonical(`/blog/${post.slug}`), types: FEED_ALTERNATES },
    }, '/blog/[slug]'));
  }
  for (const guide of GUIDE_PAGES) {
    push(guidePath(guide.slug), withBrandPageMetadata({
      title: generateSafePageTitle(stripBrandSuffix(guide.seoTitle || guide.title)),
      description: fitDescription(guide.metaDescription || guide.excerpt),
      alternates: { canonical: buildCanonical(guidePath(guide.slug)), types: FEED_ALTERNATES },
    }, '/guides/[slug]'));
  }
  for (const hub of CONTENT_HUBS) {
    const posts = BLOG_POSTS.filter((post) => post.hubSlug === hub.hubSlug);
    if (!isCategoryHubIndexable(hub.hubSlug, posts.length)) continue;
    const title = `${hub.title} Articles`;
    const countPhrase = posts.length >= 3 ? `${posts.length} in-depth articles` : 'Expert articles';
    const raw = `${hub.description} ${countPhrase} on ${hub.title.toLowerCase()} for Boise, Meridian, Eagle, Nampa and Treasure Valley homeowners planning a remodel.`.replace(/\s+/g, ' ');
    const description = raw.length <= 158 ? raw : `${raw.slice(0, 158).replace(/\s+\S*$/, '')}…`;
    push(categoryHubPath(hub.hubSlug), withBrandPageMetadata({
      title,
      description,
      alternates: { canonical: buildCanonical(categoryHubPath(hub.hubSlug)) },
    }, '/blog/category/[hubSlug]'));
  }

  const longTitles = rows.filter((row) => row.title.length > 60);
  const longMetas = rows.filter((row) => row.description.length > 160);
  assert.deepEqual(longTitles.map((row) => `${row.title.length} ${row.path}`), []);
  assert.deepEqual(longMetas.map((row) => `${row.description.length} ${row.path}`), []);

  const indexable = rows.filter((row) => !row.noindex);
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();
  for (const row of indexable) {
    assert.equal(titles.has(row.title), false, `duplicate title ${row.path} and ${titles.get(row.title)}: ${row.title}`);
    assert.equal(descriptions.has(row.description), false, `duplicate description ${row.path} and ${descriptions.get(row.description)}`);
    titles.set(row.title, row.path);
    descriptions.set(row.description, row.path);
  }

  assert.match(rows.find((row) => row.path === '/')?.title ?? '', /Boise Home Remodeling Contractors \| Boise Remodeling Co/);
  const homeMeta = 'Boise home remodeling from one design-build team: kitchens, baths and whole-home remodels. Free in-home visit, a written scope, and calls or texts welcome.';
  assert.equal(homeMeta.length, 155);
  assert.equal(rows.find((row) => row.path === '/')?.description, homeMeta);
  assert.equal(homeMetadata.openGraph?.description, homeMeta);
  assert.equal(homeMetadata.twitter?.description, homeMeta);
  // SEO audit REM-T3 (20 November 2026): one title and description pattern on every area page.
  const rowMiddleton = rows.find((entry) => entry.path === '/areas/middleton');
  assert.equal(rowMiddleton?.title, 'Remodeling contractor in Middleton, ID | Boise Remodeling Co');
  assert.equal(rowMiddleton?.description, 'Remodeling contractor in Middleton, Idaho for kitchens, baths, additions and whole-home remodels, with a written scope and a free in-home visit to start.');
  assert.equal(rows.find((entry) => entry.path === '/areas/boise')?.title, 'Boise Neighborhood Remodels | Boise Remodeling Co');
  assert.equal(rows.find((entry) => entry.path === '/areas/eagle')?.title, 'Home Remodeling in Eagle, ID | Boise Remodeling Co');
  assert.equal(rows.find((entry) => entry.path === '/areas/kuna')?.title, 'Home Remodeling in Kuna, ID | Boise Remodeling Co');
  assert.equal(rows.find((entry) => entry.path === '/areas/garden-city')?.title, 'Home Remodeling in Garden City, ID | Boise Remodeling Co');
  assert.equal(/part of P5/i.test(rowMiddleton?.description ?? ''), false);
  // SEO audit REM-T1: the hub is the Treasure Valley page; /services/kitchen-remodel/boise owns Boise.
  assert.match(rows.find((row) => row.path === '/services/kitchen-remodel')?.title ?? '', /Treasure Valley kitchen remodeling/);
  assert.match(rows.find((row) => row.path === '/about')?.description ?? '', /Meet the design-build team behind Boise Remodeling Co, a P5 Home Co company/);
  assert.match(rows.find((row) => row.path === '/about')?.title ?? '', /About Our Design-Build Team \| Boise Remodeling Co/);
  assert.equal(/since 2020|founded in 2020|founded 2020|EST 2020/i.test(rows.find((row) => row.path === '/about')?.title + '\n' + rows.find((row) => row.path === '/about')?.description), false);
});

test('phase-2 NAP, sister row, and RE-10 links', () => {
  const footerLine = 'Serving Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, and Caldwell, across Ada County and Canyon County';
  // Phase 2: the footer is the shared family SiteFooter; this site's facts live in lib/familyBrand.ts.
  // The family row names every live family site; Boise ADU Co is left out until its own site exists.
  const footer = readFileSync('lib/familyBrand.ts', 'utf8');
  const sharedFooter = readFileSync('components/family/SiteFooter.tsx', 'utf8');
  assert.match(footer, /publicFooterLine\(\)/);
  assert.match(footer, /email: SITE_CONFIG\.email/);
  assert.match(sharedFooter, /href=\{\`mailto:\$\{brand\.email\}\`\}/);
  assert.match(footer, /The P5 Home Co family/);
  assert.match(footer, /Boise Construction Co/);
  assert.match(footer, /Boise Handyman Co/);
  assert.match(footer, /Boise Cabinet Co/);
  assert.equal(footer.includes("name: 'Boise ADU Co'"), false);
  assert.equal(footer.includes("href: '/re-10-repairs-boise'"), false);
  assert.match(footer, /href: '\/subcontractor'/);
  assert.equal(footer.includes('/api/login'), false);
  assert.match(readFileSync('app/estimate/page.tsx', 'utf8'), /Request a remodel quote/);
  const contact = readFileSync('app/contact/page.tsx', 'utf8');
  assert.match(contact, /Call, text, or email\. We come to you\./);
  assert.match(contact, /never use high-pressure sales tactics/);
  assert.match(contact, /TREASURE_VALLEY_CITIES/);
  assert.equal(/public representative|staffed storefront/i.test(contact), false);
  assert.equal(RETIRED_STREET.test(contact), false);
  assert.equal(contact.includes('Call, email, or visit'), false);
  const email = readFileSync('components/EmailLink.tsx', 'utf8');
  assert.match(email, /mailto:\$\{address\}/);
  assert.equal(email.includes('use client'), false);
  const layout = readFileSync('app/layout.tsx', 'utf8');
  assert.equal(layout.includes('HubSpot'), false);
  assert.equal(layout.includes('hs-scripts.com'), false);
  assert.equal(existsSync('components/HubSpotScript.tsx'), false);
  const hero = readFileSync('components/approved/ApprovedHomeHero.tsx', 'utf8');
  assert.equal(hero.includes('use client'), false);
  assert.match(readFileSync('components/family/HeroPhoto.tsx', 'utf8'), /fetchPriority="high"/);
  // Phase 2 hero (intended change): the October 8 composition on the shared HeroPhoto. The
  // SEO phrase moves to the eyebrow; the accent line is still not "Love where you live." (#108).
  assert.match(hero, /eyebrow="Design-build remodeling in Boise"/);
  assert.match(hero, /title="Boise home remodeling\."/);
  assert.match(hero, /We design, price and build kitchens, baths and whole-home remodels\./);
  // Owner decision, 13 November 2026: the hero action is the central estimator, with the in-page label.
  assert.match(hero, /label: CTA_PRIMARY, href: FAMILY_BRAND\.cta\.href/);
  assert.equal(hero.includes('Love where you live'), false);
  assert.equal(hero.includes('<em>Love where you live.</em>'), false);
  const home = readFileSync('app/page.tsx', 'utf8');
  assert.match(home, /hero=\{<ApprovedHomeHero/);
  const css = readFileSync('app/globals.css', 'utf8');
  assert.equal(/\.js \.reveal-init \{[^}]*opacity:\s*0/.test(css), false);
  assert.match(css, /\.f-hero > img/);
  assert.match(css, /\.interior-hero-image img/);
  const llms = readFileSync('public/llms.txt', 'utf8');
  const full = readFileSync('public/llms-full.txt', 'utf8');
  for (const file of [llms, full]) {
    assert.equal(/Public representative|staffed storefront/i.test(file), false);
    assert.equal(RETIRED_STREET.test(file), false);
    assert.match(file, /Serving Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, and Caldwell/);
    assert.match(file, /hello@boiseremodeling\.co/);
    assert.match(file, /Last updated: 2026-11-21/);
    assert.match(file, /https:\/\/boisehandyman\.co\/re-10-repairs-boise/);
    assert.equal(file.includes('/blog/category/treasure-valley-locations'), false);
  }
  assert.equal(publicFooterLine(), footerLine);
});

test('phase-1 copy is additive on the named pages', () => {
  const home = readFileSync('components/approved/ApprovedHome.tsx', 'utf8');
  assert.equal(home.includes('Home remodeling contractors for Boise and the Treasure Valley'), false);
  assert.match(home, /Remodeling contractors in \$\{city\}/);
  assert.match(home, /Kitchen remodeling in Boise/);
  assert.match(home, /who-you-are-hiring/);
  assert.match(home, /\/services\/\$\{s\.slug\}/);
  const faqs = readFileSync('shared/homepageFaqs.ts', 'utf8');
  assert.match(faqs, /q: "Can we live at home during the remodel\?"/);
  assert.match(faqs, /q: "What do home remodeling contractors typically handle\?"/);
  assert.match(faqs, /q: "Do you serve areas near Boise\?"/);
  assert.match(faqs, /q: "How long is the workmanship guarantee\?"/);
  const areas = readFileSync('app/areas/[city]/page.tsx', 'utf8');
  assert.match(areas, /href: '\/services\/kitchen-remodel'/);
  assert.match(areas, /href: '\/services\/bathroom-remodel'/);
  assert.match(areas, /href: '\/services\/room-addition'/);
  const re10 = readFileSync('app/re-10-repairs-boise/page.tsx', 'utf8');
  assert.match(re10, /https:\/\/boisehandyman\.co\/re-10-repairs-boise/);
  assert.match(re10, /ServiceReferral|Handled by Boise Handyman Co/);
  const brand = readFileSync('components/approved/ApprovedBrand.tsx', 'utf8');
  assert.match(brand, /alt="" aria-hidden="true"/);
});
