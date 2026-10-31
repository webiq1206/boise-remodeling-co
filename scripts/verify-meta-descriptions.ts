/**
 * No phone number and no exclamation mark in any meta description.
 *
 * Phase 4 replaced the generated city-service descriptions, which ended
 * "Call (208) 477-1169!" on 64 pages. A search snippet is not where the phone
 * belongs (it sits in the header, the bottom bar and the page), and a "!" reads
 * as an ad. This check rebuilds every description the site renders, through
 * the same builders the routes call, and fails the build if one regresses.
 *
 * Two passes:
 *   1. BUILT   - every sitemap route type through buildPageMetadata,
 *                withBrandPageMetadata (which applies the authored core-page
 *                copy), and the blog, guide and category-hub sources.
 *   2. SOURCE  - every `description` literal under app/, so a route that
 *                writes its own metadata cannot slip past pass 1.
 *
 * Run: npm run verify:descriptions
 */
import fs from 'fs';
import path from 'path';
import { withBrandPageMetadata } from '../lib/brand-page-metadata';
import { buildPageMetadata, fitDescription, isCityServiceNoindex } from '../lib/page-metadata';
import { BLOG_POSTS } from '../shared/blogContent';
import { CITIES, SERVICES } from '../shared/contentData';
import { CONTENT_HUBS } from '../shared/contentHubs';
import { GUIDE_PAGES } from '../shared/guideContent';

const PHONE = /\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/;
const failures: string[] = [];
let checked = 0;

function check(route: string, description: string | null | undefined) {
  checked += 1;
  const text = description ?? '';
  if (!text.trim()) failures.push(`${route}: empty description`);
  if (PHONE.test(text)) failures.push(`${route}: phone number in "${text}"`);
  if (text.includes('!')) failures.push(`${route}: "!" in "${text}"`);
}

/* ── 1. Built descriptions ───────────────────────────────────────────────── */

for (const service of SERVICES) {
  const route = `/services/${service.slug}`;
  const meta = withBrandPageMetadata(
    buildPageMetadata({ kind: 'service', serviceName: service.name, serviceSlug: service.slug, path: route }),
    '/services/[slug]',
  );
  check(route, meta.description);
  for (const city of CITIES) {
    const cityRoute = `${route}/${city.slug}`;
    const cityMeta = withBrandPageMetadata(
      buildPageMetadata({
        kind: 'city-service',
        serviceName: service.name,
        serviceSlug: service.slug,
        cityName: city.name,
        citySlug: city.slug,
        path: cityRoute,
        noindex: isCityServiceNoindex(service.slug, city.slug),
      }),
      '/services/[slug]/[city]',
    );
    check(cityRoute, cityMeta.description);
  }
}

for (const city of CITIES) {
  const route = `/areas/${city.slug}`;
  check(route, withBrandPageMetadata(buildPageMetadata({ kind: 'area', cityName: city.name, citySlug: city.slug, path: route }), '/areas/[city]').description);
}

for (const kind of ['about', 'contact', 'blog'] as const) {
  const route = kind === 'blog' ? '/blog' : `/${kind}`;
  check(route, withBrandPageMetadata(buildPageMetadata({ kind, path: route }), route).description);
}

for (const post of BLOG_POSTS) check(`/blog/${post.slug}`, fitDescription(post.metaDescription || post.excerpt));
for (const guide of GUIDE_PAGES) check(`/guides/${guide.slug}`, fitDescription(guide.metaDescription || guide.excerpt));
for (const hub of CONTENT_HUBS) check(`/blog/category/${hub.hubSlug}`, hub.description);

/* ── 2. Description literals in route source ─────────────────────────────── */

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'api' ? [] : walk(full);
    return /\.(tsx?|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const root = path.join(__dirname, '..');
const LITERAL = /description\s*:\s*(?:fitDescription\()?\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
for (const file of walk(path.join(root, 'app'))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(LITERAL)) {
    const text = match[2];
    const where = path.relative(root, file);
    checked += 1;
    if (PHONE.test(text) || /SITE_CONFIG\.phone|\{phone\}/.test(text)) failures.push(`${where}: phone number in description literal "${text.slice(0, 80)}"`);
    if (text.includes('!')) failures.push(`${where}: "!" in description literal "${text.slice(0, 80)}"`);
  }
}

if (failures.length > 0) {
  console.error(`[verify:descriptions] FAIL ${failures.length} description(s) carry a phone number or "!":`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[verify:descriptions] OK ${checked} descriptions, no phone number and no "!".`);
