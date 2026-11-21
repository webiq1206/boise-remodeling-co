/**
 * Thin city x service URLs from the 21 November 2026 index review.
 *
 * Redirects are permanent (HTTP 301) and one hop: the destination is never
 * itself a redirect. Noindex pages stay reachable and are left out of both
 * sitemaps. ADU city URLs are not in either list.
 */

/** @type {Readonly<Record<string, string>>} */
export const CITY_SERVICE_REDIRECTS = Object.freeze({
  '/services/aging-in-place/boise': '/services/aging-in-place',
  '/services/basement-remodel/boise': '/services/basement-remodel',
  '/services/bathroom-remodel/boise': '/services/bathroom-remodel',
  '/services/outdoor-living/boise': '/services/outdoor-living',
  '/services/room-addition/boise': '/services/room-addition',
  '/services/kitchen-remodel/eagle': '/areas/eagle',
  '/services/room-addition/eagle': '/areas/eagle',
});

/** Keys are `${serviceSlug}/${citySlug}`. Twenty rows, no ADU. */
export const NOINDEX_CITY_SERVICE_KEYS = Object.freeze([
  'aging-in-place/eagle',
  'aging-in-place/meridian',
  'aging-in-place/middleton',
  'aging-in-place/star',
  'basement-remodel/meridian',
  'bathroom-remodel/kuna',
  'bathroom-remodel/nampa',
  'kitchen-remodel/caldwell',
  'kitchen-remodel/meridian',
  'kitchen-remodel/star',
  'outdoor-living/kuna',
  'outdoor-living/meridian',
  'outdoor-living/middleton',
  'outdoor-living/star',
  'room-addition/meridian',
  'room-addition/star',
  'whole-home-remodel/caldwell',
  'whole-home-remodel/meridian',
  'whole-home-remodel/middleton',
  'whole-home-remodel/star',
]);

/** In the HTML sitemap, out of sitemap.xml. */
export const XML_SITEMAP_OMIT = Object.freeze(['/sitemap', '/instant-estimate']);

/**
 * @param {string} path
 * @returns {string | null}
 */
export function redirectDestination(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  const clean = path.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
  return CITY_SERVICE_REDIRECTS[clean] ?? null;
}

/** @returns {Array<[string, string]>} */
export function redirectPairs() {
  return Object.entries(CITY_SERVICE_REDIRECTS);
}
