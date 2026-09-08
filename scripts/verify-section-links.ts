/**
 * Every link built inside a section builder must point at a real page.
 *
 * audit:links reads data/internal-links.json, which is a COMPUTED plan of which
 * pages should link to which. Links hard-coded inside section builders like
 * getCityServiceSections never enter that manifest, so audit:links reports "no
 * broken internal links" while a section link 404s on 64 pages at once.
 *
 * That is not hypothetical. The city-service cost section pointed at
 * /guides/boise-remodeling-cost-guide for the whole content migration. It
 * resolved, but only through a 301, on every service-in-city page on the site.
 *
 * A redirect is not good enough here and the check below treats it as a
 * failure: these are our own internal links, we know the destination, and
 * spending a redirect hop on every one of them wastes crawl budget and leaks
 * link equity for no reason. Redirects are for other people's links.
 *
 * Run: npm run verify:section-links
 */
import { SERVICES, CITIES } from '../shared/contentData';
import { getCityServiceSections, SERVICE_SEO_CONTENT } from '../shared/seoContent';
import { CITY_SEO_DATA } from '../lib/seo';
import { buildCanonicalRoutes } from './internal-links/lib';

const canonical = new Set(buildCanonicalRoutes());

// Routes that exist but are not in the canonical page graph: static files,
// hash targets on the homepage, and pages the manifest deliberately excludes.
const EXTRA_VALID = new Set<string>([
  '/',
  '/contact',
  '/estimate',
  '/resources',
  '/resources/ada-canyon-permit-flow',
  '/re-10-repairs-boise',
]);

interface Found {
  where: string;
  label: string;
  href: string;
}

const found: Found[] = [];

for (const service of SERVICES) {
  const seoContent = SERVICE_SEO_CONTENT[service.slug];
  if (!seoContent) continue;
  for (const city of CITIES) {
    // Keyed by display name, matching app/services/[slug]/[city]/page.tsx.
    const sections = getCityServiceSections(seoContent, city, CITY_SEO_DATA[city.name]);
    for (const section of sections) {
      for (const link of section.links ?? []) {
        found.push({
          where: `getCityServiceSections(${service.slug}, ${city.slug}) > "${section.heading}"`,
          label: link.label,
          href: link.href,
        });
      }
    }
  }
}

const failures: string[] = [];
const seenHrefs = new Set<string>();

for (const f of found) {
  seenHrefs.add(f.href);
  if (f.href.startsWith('http') || f.href.startsWith('#') || f.href.startsWith('tel:')) continue;
  const path = f.href.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  if (canonical.has(path) || EXTRA_VALID.has(path)) continue;
  failures.push(`${f.where}\n      "${f.label}" -> ${f.href}`);
}

if (failures.length > 0) {
  // One bad href appears on every city variant, so report distinct hrefs rather
  // than 64 copies of the same line.
  const byHref = new Map<string, number>();
  for (const f of found) {
    const path = f.href.split('#')[0].replace(/\/$/, '') || '/';
    if (canonical.has(path) || EXTRA_VALID.has(path)) continue;
    if (f.href.startsWith('http')) continue;
    byHref.set(f.href, (byHref.get(f.href) ?? 0) + 1);
  }
  console.error(`verify:section-links FAILED - ${byHref.size} bad destination(s):`);
  for (const [href, count] of byHref) {
    console.error(`  x ${href}  (rendered on ${count} pages)`);
  }
  process.exit(1);
}

console.log(
  `verify:section-links OK (${found.length} section links across ${seenHrefs.size} distinct destinations, all canonical)`,
);
