/**
 * Generates public/llms.txt and public/llms-full.txt from the content layer.
 *
 * Both files were hand-maintained (last touched 2026-07-22 and 2026-06-05) on
 * the site with the largest content library in the family, so the page lists
 * had already drifted from the sitemap. Deriving them from SERVICES /
 * GUIDE_PAGES / CONTENT_HUBS / BLOG_POSTS means a retired slug can no longer
 * survive in the one file an answer engine trusts most. Editorial prose stays
 * here as literals, next to the data it describes. Dollar ranges are left to
 * the cost guide and the estimator on purpose: a number in this file goes
 * stale silently.
 *
 * Run: npm run generate:llms   (verified in prebuild via verify:llms)
 */
import fs from 'fs';
import path from 'path';
import { SHOW_FOUNDING_YEAR, publishFoundingCopy } from '../shared/publicClaims';
import { publicFooterLine, SITE_CONFIG } from '../shared/siteConfig';
import { P5_BBB_URL, P5_FACEBOOK_URL, P5_GBP_URL, P5_INSTAGRAM_URL } from '../shared/gbpProfile';
import { SERVICES, CITIES, SERVICE_AREA_CITY_NAMES, SERVICE_AREA_CITY_COUNTY, SERVICE_AREA_SENTENCE } from '../shared/contentData';
import { GUIDE_PAGES } from '../shared/guideContent';
import { CONTENT_HUBS } from '../shared/contentHubs';
import { BLOG_POSTS } from '../shared/blogContent';

const BASE = SITE_CONFIG.siteUrl.replace(/\/$/, '');
const url = (p: string) => `${BASE}${p}`;
const today = '2026-11-21';
const HANDYMAN_RE10 = 'https://boisehandyman.co/re-10-repairs-boise';
const CONTACT_BLOCK =
  `${publicFooterLine()}. Phone ${SITE_CONFIG.phone}. Email ${SITE_CONFIG.email}. ` +
  `Idaho Registered Contractor #8381215 and insured.`;
const NAP_BLOCK =
  `P5 Home Co, Meridian, ID 83646 (service-area business, no public street). Phone (208) 477-1169. Web https://p5homeco.com.`;
const BRAND_SITE_LINE = `${SITE_CONFIG.name}: ${BASE}.`;
const PROFILE_LINKS = `[Google](${P5_GBP_URL}), [Facebook](${P5_FACEBOOK_URL}), [Instagram](${P5_INSTAGRAM_URL}), [BBB](${P5_BBB_URL})`;
const PROFILE_TEXT = `Google ${P5_GBP_URL}, Facebook ${P5_FACEBOOK_URL}, Instagram ${P5_INSTAGRAM_URL}, BBB ${P5_BBB_URL}`;

const adaCities = SERVICE_AREA_CITY_NAMES.filter((name) => SERVICE_AREA_CITY_COUNTY[name] === 'ada');
const canyonCities = SERVICE_AREA_CITY_NAMES.filter((name) => SERVICE_AREA_CITY_COUNTY[name] === 'canyon');

const pillarGuides = GUIDE_PAGES.filter((g) => g.guideType === 'hub-pillar' || g.guideType === 'master');
const cityGuides = GUIDE_PAGES.filter((g) => g.guideType === 'location');
const neighborhoodGuides = GUIDE_PAGES.filter((g) => g.guideType === 'neighborhood');

const SUMMARY = publishFoundingCopy(
  `Design-build remodeling for kitchens, bathrooms, whole-home renovations, room additions, ` +
  `basements and ADU conversions in Boise, Idaho and the Treasure Valley. Founded 2020, part of P5 Home Co. ` +
  `Serving ${SERVICE_AREA_SENTENCE}. Phone ${SITE_CONFIG.phone}.`,
);

const POSITIONING =
  `Design-build means one accountable team handles design direction, estimating, Ada and ` +
  `Canyon County permitting, and construction as one accountable company with one point of contact, backed by a written scope ` +
  `before work starts and a one-year workmanship guarantee from documented Final Completion. Preliminary price ranges come from the ` +
  `instant estimate (${url("/instant-estimate")}), which prices the room, the scope and the finish level rather than a flat ` +
  `price per square foot; they are preliminary ranges, not quotes, and a firm proposal follows a ` +
  `free in-home visit.`;

function buildShort(): string {
  const lines: string[] = [];
  lines.push(`# ${SITE_CONFIG.name}`, '');
  lines.push(`> ${SUMMARY}`, '');
  lines.push(CONTACT_BLOCK, '');
  lines.push(NAP_BLOCK);
  lines.push(BRAND_SITE_LINE, '');
  lines.push(POSITIONING, '');

  lines.push('## Services', '');
  for (const s of SERVICES) {
    // SEO audit XS-07: Boise Construction Co builds new detached ADUs (owner split,
    // 31 October 2026, shared/content/serviceOwnership.ts); this site converts spaces.
    if (s.slug === 'adu') {
      lines.push(`- [ADU conversions](${url('/services/adu')}): ${s.shortDescription} New detached ADUs are built by Boise Construction Co (https://boiseconstruction.co/services/adu).`);
      continue;
    }
    lines.push(`- [${s.name}](${url(`/services/${s.slug}`)}): ${s.shortDescription}`);
  }
  lines.push(
    `- [RE-10 repairs (Boise Handyman Co)](${HANDYMAN_RE10}): repairs from an Idaho RE-10 inspection response, completed and documented before closing, for real estate agents, buyers and sellers.`,
  );
  lines.push(
    `- [Send your remodel plans](${url('/remodel-plans-boise')}): attach floor plans, schedules, photos and documents to a project request. The team reviews the drawings and the scope before preparing an estimate; no price is shown from the drawings on the page. Free, with no obligation.`,
  );
  lines.push(
    `- [All Services](${url('/services')}): plus city pages at /services/{service}/{city} and [Service Areas](${url('/areas')}).`,
    '',
  );

  lines.push('## Authoritative guides', '');
  for (const g of pillarGuides) lines.push(`- [${g.title}](${url(`/guides/${g.slug}`)})`);
  lines.push('');

  lines.push('## Local permit and location resources', '');
  lines.push(`- [Ada County vs Canyon County permit flow](${url('/resources/ada-canyon-permit-flow')})`);
  lines.push(`- [Home remodeling in Garden City](${url('/areas/garden-city')})`);
  if (cityGuides.length) {
    lines.push(`- City guides: ${cityGuides.map((g) => `[${g.title}](${url(`/guides/${g.slug}`)})`).join(', ')}`);
  }
  if (neighborhoodGuides.length) {
    lines.push(
      `- Neighborhood guides: ${neighborhoodGuides.map((g) => `[${g.title}](${url(`/guides/${g.slug}`)})`).join(', ')}`,
    );
  }
  lines.push('');

  lines.push('## Blog category hubs', '');
  for (const h of CONTENT_HUBS) {
    // This hub 307-redirects to /areas. Link the destination.
    if (h.hubSlug === 'treasure-valley-locations') {
      lines.push(`- [${h.title}](${url('/areas')})`);
      continue;
    }
    lines.push(`- [${h.title}](${url(`/blog/category/${h.hubSlug}`)})`);
  }
  lines.push('');

  lines.push('## About and contact', '');
  lines.push(publishFoundingCopy(`- [About ${SITE_CONFIG.name}](${url('/about')}): design-build remodels across the Treasure Valley since 2020, a DBA of P5 Home Co.`));
  lines.push(`- [Contact](${url('/contact')})`);
  lines.push(`- Parent company profiles (P5 Home Co): ${PROFILE_LINKS}`);
  lines.push(
    `- [Instant remodel estimate](${url('/instant-estimate')}): answer a few questions and see a preliminary price range on screen. Free, with no appointment. It is a range for budgeting, not a final price; a firm written proposal follows a site visit.`,
  );
  lines.push(`- [Send project details and photos for a quote](${url('/estimate')})`);
  lines.push(`- [Remodel gallery](${url('/design-ideas')})`);
  lines.push(`- [Planning resources and worksheets](${url('/resources')})`, '');

  lines.push('## Optional', '');
  lines.push(`- [Blog](${url('/blog')})`, '');

  lines.push('## Machine-readable endpoints', '');
  lines.push(`- [Sitemap](${url('/sitemap.xml')}): every indexable page.`);
  lines.push(`- [Image sitemap](${url('/sitemap-images.xml')}): room, finish and guide images with titles and captions.`);
  lines.push(`- [RSS feed](${url('/feed.xml')}): guides and articles, newest first, with publication and revision dates.`);
  lines.push(`- [Full text for LLMs](${url('/llms-full.txt')}): expanded reference copy of the core facts.`, '');

  lines.push(`Last updated: ${today}.`);
  return lines.join('\n') + '\n';
}

function buildFull(): string {
  const lines: string[] = [];
  lines.push(`# ${SITE_CONFIG.name} - Full Reference`, '');
  lines.push(`> ${SUMMARY}`, '');
  lines.push(CONTACT_BLOCK, '');
  lines.push(NAP_BLOCK);
  lines.push(BRAND_SITE_LINE, '');

  lines.push('## About', '');
  lines.push(
    publishFoundingCopy(
    `${SITE_CONFIG.name} is a residential design-build remodeling company serving the Treasure ` +
      `Valley since 2020 and one of the P5 Home Co family of companies. We remodel ` +
      `existing homes: kitchens, bathrooms, whole-home renovations, room additions, basements, ` +
      `ADU conversions of garages, basements and attached spaces, outdoor living spaces and ` +
      `aging-in-place work. New detached ADUs are built by sister company Boise Construction Co. Design-build means ` +
      `design direction, estimating, permitting and construction are delivered by one accountable ` +
      `company with one point of contact, which removes the handoff between a designer and a general contractor and ` +
      `keeps the drawings and the budget on the same schedule. Every project includes a written ` +
      `scope before construction, a dedicated project manager, a written progress update every ` +
      `Friday, and a one-year workmanship guarantee from documented Final Completion for work ` +
      `performed by our own team. Subcontractor work (for example licensed plumbing, electrical and ` +
      `HVAC) is covered by that subcontractor's own warranty, and at the end of every project we ` +
      `provide a complete list of the subcontractors who worked on it, with their contact ` +
      `information. Manufacturer warranties are separate. Warranty details: ${url('/warranty')}.`),
    '',
  );
  lines.push('- Business type: Residential design-build remodeling contractor');
  if (SHOW_FOUNDING_YEAR) lines.push('- Founded: 2020');
  lines.push('- Parent company: P5 Home Co (https://p5homeco.com)');
  lines.push(`- Parent company profiles: ${PROFILE_TEXT}`);
  lines.push('- Service model: One accountable team for design, permits, and construction');
  lines.push(`- Contact: ${SITE_CONFIG.email} (${url('/contact')})`);
  lines.push(`- Instant estimate (a preliminary price range on screen, not a final price): ${url('/instant-estimate')}`);
  lines.push(`- Send project details: ${url('/estimate')}`);
  lines.push(`- Send remodel plans with a project request: ${url('/remodel-plans-boise')}`, '');

  lines.push('## Service area', '');
  lines.push('We remodel homes in these cities, across Ada County and Canyon County:', '');
  if (adaCities.length) lines.push(`- Ada County: ${adaCities.join(', ')}`);
  if (canyonCities.length) lines.push(`- Canyon County: ${canyonCities.join(', ')}`);
  lines.push(
    '',
    'Permit paths, fees, and inspection sequencing differ between Ada County and Canyon County, ' +
      'and again between incorporated city limits and county jurisdiction. Permits are handled ' +
      'in-house as part of the design-build contract.',
    '',
  );

  lines.push('## Services', '');
  for (const s of SERVICES) {
    if (s.slug === 'adu') {
      lines.push(`- ADU conversions: /services/adu - ${s.shortDescription} New detached ADUs are built by Boise Construction Co (https://boiseconstruction.co/services/adu).`);
      continue;
    }
    lines.push(`- ${s.name}: /services/${s.slug} - ${s.shortDescription}`);
  }
  lines.push(
    '',
    `City service-area hubs live at /areas/{city-slug} for ` +
      `${CITIES.map((c) => c.slug).join(', ')}.`,
    '',
  );

  lines.push(`## Authoritative guides (${url('/guides')})`, '');
  lines.push('Pillar guides (own the head terms):', '');
  for (const g of pillarGuides) lines.push(`- ${g.title}: /guides/${g.slug}`);
  if (cityGuides.length) {
    lines.push('', 'City guides:', '');
    for (const g of cityGuides) lines.push(`- /guides/${g.slug}`);
  }
  if (neighborhoodGuides.length) {
    lines.push('', 'Neighborhood guides:', '');
    for (const g of neighborhoodGuides) lines.push(`- /guides/${g.slug}`);
  }
  lines.push('');

  lines.push('## Blog category hubs (long-tail questions support the pillars)', '');
  for (const h of CONTENT_HUBS) {
    if (h.hubSlug === 'treasure-valley-locations') {
      lines.push(`- ${h.title}: /areas`);
      continue;
    }
    lines.push(`- ${h.title}: /blog/category/${h.hubSlug}`);
  }
  lines.push('', `${BLOG_POSTS.length} articles across these hubs. Index: /blog`, '');

  lines.push('## Planning resources', '');
  lines.push('- Remodeling planning resources (free PDFs and visual guides): /resources');
  lines.push('- Ada vs Canyon County permit flow (visual guide): /resources/ada-canyon-permit-flow');
  lines.push('- Home remodeling in Garden City: /areas/garden-city', '');

  lines.push('## Common questions', '');
  lines.push(
    '- How much does a remodel cost in Boise? It depends on the room, the scope (refresh versus ' +
      'full gut and layout change) and the finish level far more than on square footage. The ' +
      'instant estimate gives a preliminary price range on screen; the cost guide at ' +
      '/guides/boise-remodeling-cost-guide explains what moves the number.',
  );
  lines.push(
    '- How long does a remodel take? Design and selections typically run three to eight weeks, ' +
      'permitting one to four depending on jurisdiction, and construction from two to three ' +
      'weeks for a bathroom to several months for a whole-home renovation or addition.',
  );
  lines.push(
    '- Are you a registered contractor and insured? Yes. Boise Remodeling Co is an Idaho Registered Contractor #8381215 and insured.',
  );
  lines.push(
    '- Do you handle permits? Yes. Ada and Canyon County permits are pulled in-house as part of ' +
      'the design-build contract, including the inspections that go with them.',
  );
  lines.push(
    '- Can I live in the house during the remodel? Usually, for kitchens, bathrooms and single ' +
      'rooms, with dust barriers and a daily cleanup routine. Whole-home projects sometimes ' +
      'phase the work so part of the house stays livable.',
  );
  lines.push(
    '- What is an RE-10? The Idaho inspection response form a buyer uses to request repairs ' +
      'before closing. We review the report, price the requested items in writing, complete the ' +
      `approved work and document it for the transaction file: ${HANDYMAN_RE10}`,
    '',
  );

  lines.push('## Key pages', '');
  lines.push(`- Home: ${url('/')}`);
  lines.push(`- About: ${url('/about')}`);
  lines.push(`- Services: ${url('/services')}`);
  lines.push(`- Service areas: ${url('/areas')}`);
  lines.push(`- Instant estimate: ${url('/instant-estimate')}`);
  lines.push(`- Send project details: ${url('/estimate')}`);
  lines.push(`- Remodel gallery: ${url('/design-ideas')}`);
  lines.push(`- Blog: ${url('/blog')}`);
  lines.push(`- Guides: ${url('/guides')}`);
  lines.push(`- Resources: ${url('/resources')}`);
  lines.push(`- Contact: ${url('/contact')}`, '');

  lines.push(`Last updated: ${today}. Full sitemap: ${url('/sitemap.xml')}`);
  return lines.join('\n') + '\n';
}

const targets: Array<[string, string]> = [
  ['llms.txt', buildShort()],
  ['llms-full.txt', buildFull()],
];

const check = process.argv.includes('--check');
let drift = false;

for (const [name, content] of targets) {
  const file = path.join(__dirname, '..', 'public', name);
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const norm = (s: string) => s.replace(/Last updated: \d{4}-\d{2}-\d{2}/g, 'Last updated: DATE');
  if (check) {
    if (norm(existing) !== norm(content)) {
      console.error(`verify:llms FAILED - public/${name} is out of date. Run: npm run generate:llms`);
      drift = true;
    }
  } else {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Wrote public/${name} (${content.split('\n').length} lines)`);
  }
}

if (check) {
  if (drift) process.exit(1);
  console.log('verify:llms OK (llms.txt and llms-full.txt match the content layer)');
}
