/**
 * Map a deploy diff to the public URLs whose HTML changed.
 * Noindex city x service pages stay out. Callers pass blog and guide paths
 * when a shared metadata file changed; this module does not import the app.
 */

export const CITIES = ['boise', 'meridian', 'eagle', 'nampa', 'kuna', 'star', 'middleton', 'caldwell'];
export const SERVICES = [
  'kitchen-remodel',
  'bathroom-remodel',
  'whole-home-remodel',
  'room-addition',
  'adu',
  'basement-remodel',
  'outdoor-living',
  'aging-in-place',
];
export const NOINDEX_CITY_SERVICE = new Set(['adu/kuna', 'adu/star', 'adu/middleton', 'adu/caldwell', 'adu/boise', 'adu/meridian', 'adu/eagle', 'adu/nampa']);

function addCityServices(urls) {
  for (const service of SERVICES) {
    for (const city of CITIES) {
      if (NOINDEX_CITY_SERVICE.has(`${service}/${city}`)) continue;
      urls.add(`/services/${service}/${city}`);
    }
  }
}

/**
 * @param {string[]} files repo-relative paths from `git diff --name-only`
 * @param {{ blog?: string[], guides?: string[] }} [catalogs]
 * @returns {string[]} site paths, sorted, with no noindex URLs
 */
export function urlsForChangedFiles(files, catalogs = {}) {
  const urls = new Set();
  const blog = catalogs.blog ?? [];
  const guides = catalogs.guides ?? [];
  for (const file of files) {
    const f = String(file).replaceAll('\\', '/');
    if (
      f === 'app/page.tsx' ||
      f.startsWith('components/approved/ApprovedHome') ||
      f === 'shared/homepageFaqs.ts' ||
      f === 'lib/schema.ts' ||
      f === 'lib/brand-page-metadata.ts'
    ) {
      urls.add('/');
    }
    if (f === 'app/about/page.tsx' || f === 'lib/brand-page-metadata.ts') urls.add('/about');
    if (f === 'app/contact/page.tsx' || f === 'lib/schema.ts') urls.add('/contact');
    if (f.startsWith('app/areas/') || f === 'lib/page-metadata.ts' || f === 'lib/seo.ts' || f === 'lib/schema.ts') {
      urls.add('/areas');
      for (const city of CITIES) urls.add(`/areas/${city}`);
    }
    if (
      f.startsWith('app/services/') ||
      f === 'shared/seoContent.ts' ||
      f === 'lib/page-metadata.ts' ||
      f === 'lib/schema.ts' ||
      f === 'lib/landing-schema.ts'
    ) {
      urls.add('/services');
      for (const service of SERVICES) urls.add(`/services/${service}`);
      addCityServices(urls);
    }
    if (f === 'app/estimate/page.tsx' || f === 'lib/page-metadata.ts') urls.add('/estimate');
    if (f.startsWith('app/re-10')) urls.add('/re-10-repairs-boise');
    if (
      f.startsWith('app/blog/') ||
      f === 'lib/page-metadata.ts' ||
      f === 'lib/seo.ts' ||
      f.startsWith('shared/content/') ||
      f === 'shared/blogContent.ts'
    ) {
      for (const path of blog) urls.add(path);
    }
    if (f.startsWith('app/guides/') || f === 'lib/page-metadata.ts' || f === 'lib/seo.ts' || f === 'shared/guideContent.ts') {
      for (const path of guides) urls.add(path);
    }
  }
  return [...urls]
    .filter((path) => !NOINDEX_CITY_SERVICE.has(path.replace(/^\/services\//, '')))
    .sort();
}
