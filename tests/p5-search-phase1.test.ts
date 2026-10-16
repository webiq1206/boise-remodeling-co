import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  NICK_PERKINS_ID,
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

const BRAND = ' | Boise Remodeling Co';
const AREAS = ['Boise', 'Meridian', 'Eagle', 'Nampa', 'Kuna', 'Star', 'Middleton', 'Caldwell'];

function renderedTitle(meta: { title?: unknown }): string {
  const title = meta.title as { absolute?: string; default?: string } | string | undefined;
  if (typeof title === 'string') return `${title}${BRAND}`;
  if (title && typeof title === 'object' && title.absolute) return title.absolute;
  if (title && typeof title === 'object' && title.default) return title.default;
  return '';
}

test('contractor schema uses the Meridian NAP, Nick, and P5 parent', () => {
  const business = generateLocalBusinessSchema('Eagle');
  assert.deepEqual(business['@type'], ['HomeAndConstructionBusiness', 'GeneralContractor']);
  assert.deepEqual(business.address, {
    '@type': 'PostalAddress',
    streetAddress: '4031 W Wapoot St',
    addressLocality: 'Meridian',
    addressRegion: 'ID',
    postalCode: '83646',
    addressCountry: 'US',
  });
  assert.equal(business.address.streetAddress, SITE_CONFIG.address.street);
  assert.equal(business.address.postalCode, SITE_CONFIG.address.postalCode);
  assert.equal(business.telephone, '(208) 477-1169');
  assert.equal(business.telephone, SITE_CONFIG.phone);
  assert.equal((business.contactPoint as { name: string }).name, 'Nick Perkins');
  assert.equal((business.contactPoint as { contactType: string }).contactType, 'Public representative');
  assert.equal((business.contactPoint as { email: string }).email, 'hello@boiseremodeling.co');
  assert.deepEqual(business.geo, { '@type': 'GeoCoordinates', latitude: 43.6515, longitude: -116.4444 });
  assert.deepEqual(business.employee, {
    '@type': 'Person',
    '@id': 'https://p5homeco.com/#nick-perkins',
    name: 'Nick Perkins',
    jobTitle: 'Public representative',
    worksFor: { '@id': 'https://p5homeco.com/#organization' },
  });
  assert.equal((business.employee as { '@id': string })['@id'], NICK_PERKINS_ID);
  assert.equal((business.parentOrganization as { '@id': string })['@id'], 'https://p5homeco.com/#organization');
  assert.equal((business.parentOrganization as { '@id': string })['@id'], P5_ORG_ID);
  assert.deepEqual(
    (business.areaServed as Array<{ name: string }>).map((area) => area.name),
    AREAS,
  );
  assert.deepEqual(business.sameAs, BUSINESS_INFO.sameAs);
  const encoded = JSON.stringify(business);
  assert.equal(encoded.includes('Garden City'), false);
  assert.equal(encoded.includes('Jared'), false);

  const organization = generateOrganizationSchema();
  assert.equal((organization.parentOrganization as { '@id': string })['@id'], P5_ORG_ID);
  assert.equal((organization.employee as { '@id': string })['@id'], NICK_PERKINS_ID);
  assert.equal((organization.employee as { worksFor: { '@id': string } }).worksFor['@id'], P5_ORG_ID);
  assert.deepEqual(organization.sameAs, BUSINESS_INFO.sameAs);
  assert.deepEqual(organization.address, business.address);
  const contacts = organization.contactPoint as Array<{ contactType: string; name?: string }>;
  assert.equal(contacts.some((contact) => contact.contactType === 'Customer Service'), true);
  assert.equal(
    contacts.some((contact) => contact.name === 'Nick Perkins' && contact.contactType === 'Public representative'),
    true,
  );

  for (const service of SERVICES) {
    for (const city of CITIES) {
      const schema = generateServiceSchema(service.name, service.shortDescription, city.name);
      const provider = schema.provider as { address: { addressLocality: string; streetAddress: string }; '@type': string[] };
      assert.deepEqual(provider['@type'], ['HomeAndConstructionBusiness', 'GeneralContractor']);
      assert.equal(provider.address.addressLocality, 'Meridian');
      assert.equal(provider.address.streetAddress, '4031 W Wapoot St');
      assert.equal((schema.areaServed as { name: string }).name, city.name);
      assert.equal(JSON.stringify(schema).includes('Garden City'), false);
    }
  }
});

test('noindex ADU city pages stay out of the sitemap', () => {
  for (const city of ['kuna', 'star', 'middleton', 'caldwell']) {
    assert.equal(isCityServiceNoindex('adu', city), true);
    assert.equal(getAllSiteUrls().some((entry) => entry.path === `/services/adu/${city}`), false);
  }
  for (const city of ['boise', 'meridian', 'eagle', 'nampa']) {
    assert.equal(getAllSiteUrls().some((entry) => entry.path === `/services/adu/${city}`), true);
  }
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

  push('/', withBrandPageMetadata({
    title: { absolute: 'Remodeling Contractor in Boise, ID | Boise Remodeling Co' },
    description: fitDescription('Design-build remodeling for Boise, Meridian, Eagle, Nampa & the Treasure Valley. Clear expectations and budget guidance. Schedule a free in-home consultation.'),
    alternates: { canonical: buildCanonical('/') },
  }, '/'));

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

  assert.match(rows.find((row) => row.path === '/areas/eagle')?.title ?? '', /Remodeling contractors in Eagle, ID/);
  assert.match(rows.find((row) => row.path === '/services/kitchen-remodel')?.title ?? '', /Kitchen remodeling in Boise/);
  assert.match(rows.find((row) => row.path === '/about')?.description ?? '', /founded in 2020 and part of P5/);
});

test('phase-2 NAP, sister row, RE-10 links, and deferred HubSpot', () => {
  const footerLine = 'Public representative: Nick Perkins · 4031 W Wapoot St, Meridian, ID 83646 · Service-area business, not a staffed storefront';
  const footer = readFileSync('components/Footer.tsx', 'utf8');
  assert.match(footer, /publicFooterLine\(\)/);
  assert.match(footer, /<EmailLink/);
  assert.match(footer, /Part of P5 Home Co/);
  assert.match(footer, /Boise Construction Co/);
  assert.match(footer, /Boise Handyman Co/);
  assert.match(footer, /Boise Cabinet Co/);
  assert.match(footer, /Boise ADU Co \(launching soon\)/);
  assert.match(footer, /https:\/\/boisehandyman\.co\/re-10-repairs-boise/);
  assert.match(footer, /RE-10 repairs \(Boise Handyman Co\)/);
  assert.equal(footer.includes('href: "/re-10-repairs-boise"'), false);
  const contact = readFileSync('app/contact/page.tsx', 'utf8');
  assert.match(contact, /Call, text, or email\. We come to you\./);
  assert.match(contact, /never use high-pressure sales tactics/);
  assert.match(contact, /publicFooterLine\(\)/);
  assert.equal(contact.includes('Call, email, or visit'), false);
  const email = readFileSync('components/EmailLink.tsx', 'utf8');
  assert.match(email, /mailto:\$\{address\}/);
  assert.equal(email.includes('use client'), false);
  const hubspot = readFileSync('components/HubSpotScript.tsx', 'utf8');
  assert.match(hubspot, /strategy="lazyOnload"/);
  assert.match(hubspot, /247066159/);
  assert.match(hubspot, /js-na2\.hs-scripts\.com/);
  const hero = readFileSync('components/approved/ApprovedHomeHero.tsx', 'utf8');
  assert.equal(hero.includes('use client'), false);
  assert.match(hero, /fetchPriority="high"/);
  assert.match(hero, /Boise home remodeling/);
  const home = readFileSync('app/page.tsx', 'utf8');
  assert.match(home, /hero=\{<ApprovedHomeHero/);
  const css = readFileSync('app/globals.css', 'utf8');
  assert.equal(/\.js \.reveal-init \{[^}]*opacity:\s*0/.test(css), false);
  assert.match(css, /\.f-hero > img/);
  assert.match(css, /\.interior-hero-image img/);
  const llms = readFileSync('public/llms.txt', 'utf8');
  const full = readFileSync('public/llms-full.txt', 'utf8');
  for (const file of [llms, full]) {
    assert.match(file, /Nick Perkins/);
    assert.match(file, /4031 W Wapoot St/);
    assert.match(file, /hello@boiseremodeling\.co/);
    assert.match(file, /Last updated: 2026-10-16/);
    assert.match(file, /https:\/\/boisehandyman\.co\/re-10-repairs-boise/);
    assert.equal(file.includes('/blog/category/treasure-valley-locations'), false);
  }
  assert.equal(publicFooterLine(), footerLine);
});

test('phase-1 copy is additive on the named pages', () => {
  const home = readFileSync('components/approved/ApprovedHome.tsx', 'utf8');
  assert.match(home, /<h2>Remodeling contractors in Boise<\/h2>/);
  const faqs = readFileSync('shared/homepageFaqs.ts', 'utf8');
  assert.match(faqs, /q: "Remodeling contractors in Boise"/);
  const areas = readFileSync('app/areas/[city]/page.tsx', 'utf8');
  assert.match(areas, /href: '\/services\/kitchen-remodel'/);
  assert.match(areas, /href: '\/services\/bathroom-remodel'/);
  assert.match(areas, /href: '\/services\/room-addition'/);
  const re10 = readFileSync('app/re-10-repairs-boise/page.tsx', 'utf8');
  assert.match(re10, /https:\/\/boisehandyman\.co\/re-10-repairs-boise/);
  assert.match(re10, /RE10_DIRECT_ANSWER/);
  const brand = readFileSync('components/approved/ApprovedBrand.tsx', 'utf8');
  assert.match(brand, /alt="" aria-hidden="true"/);
});
