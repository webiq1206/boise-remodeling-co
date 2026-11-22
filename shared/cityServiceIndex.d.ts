export const CITY_SERVICE_REDIRECTS: Readonly<Record<string, string>>;
export const NOINDEX_CITY_SERVICE_KEYS: readonly string[];
export const XML_SITEMAP_OMIT: readonly string[];
export function redirectDestination(path: string): string | null;
export function redirectPairs(): Array<[string, string]>;
export function collapsedCityServiceHref(serviceSlug: string, citySlug: string): string | null;
