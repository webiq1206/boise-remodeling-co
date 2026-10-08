import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/shared/siteConfig';
import {
  generateCityServiceDescription,
  generateCityServiceTitle,
  generateMetaDescription,
  generatePageTitle,
  generateSafePageTitle,
  getBaseUrl,
  getDefaultOgImage,
} from './seo';


export type PageMetaKind =
  | 'home'
  | 'service'
  | 'area'
  | 'city-service'
  | 'about'
  | 'contact'
  | 'blog'
  | 'blog-post';

export interface PageMetaInput {
  kind: PageMetaKind;
  serviceName?: string;
  serviceSlug?: string;
  cityName?: string;
  citySlug?: string;
  titleOverride?: string;
  descriptionOverride?: string;
  path: string;
  /**
   * When true, emit `robots: { index: false, follow: true }`. Used for
   * doorway-risk city x service combos that lack defensible local content or
   * proof (see seo-audit/doorway-page-analysis.md). The page stays crawlable
   * and keeps its internal-link value but is kept out of the index until it
   * earns unique local substance.
   */
  noindex?: boolean;
}

/**
 * City x service combos flagged as doorway risk in the audit. These are the ADU
 * combos for small cities that share the most generic copy, have no ADU pillar
 * support, and no local proof. Toggle entries off here once a combo earns
 * unique local content/proof. Keyed as `${serviceSlug}/${citySlug}`.
 */
export const NOINDEX_CITY_SERVICE = new Set<string>([
  'adu/kuna',
  'adu/star',
  'adu/middleton',
  'adu/caldwell',
]);

export function isCityServiceNoindex(serviceSlug: string, citySlug: string): boolean {
  return NOINDEX_CITY_SERVICE.has(`${serviceSlug}/${citySlug}`);
}

export function buildCanonical(path: string): string {
  const base = getBaseUrl().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

const BRAND_SUFFIX = 'Boise Remodeling Co';

/**
 * Site-wide feed discovery. Declared beside the canonical because Next replaces
 * the whole `alternates` object per page, so a root-only declaration would be
 * dropped on every page that sets its own canonical.
 */
export const FEED_ALTERNATES = {
  'application/rss+xml': [
    { url: '/feed.xml', title: 'Boise Remodeling Co | Remodeling Guides and Insights' },
  ],
};

/**
 * Remove a trailing "| Boise Remodeling Co" (one or more times) from a title.
 * The root layout template appends the brand exactly once, so child titles
 * must not carry it themselves or it doubles in the rendered <title>.
 */
/** Normalize metadata text while preserving complete authored phrases. */
export function fitTitle(title: string): string {
  return title.replace(/\s+/g, ' ').trim().replace(/[\s:|,-]+$/, '');
}
export function fitDescription(description: string): string {
  return description.replace(/\s+/g, ' ').trim();
}

export function stripBrandSuffix(title: string): string {
  let result = title.trim();
  const suffix = `| ${BRAND_SUFFIX}`;
  while (result.endsWith(suffix)) {
    result = result.slice(0, -suffix.length).trim();
  }
  return result;
}

/**
 * Concise, intentional service-parent titles. Each is <= 38 chars so the final
 * rendered title (after the layout appends " | Boise Remodeling Co") stays <= 60.
 */
const SERVICE_TITLE_OVERRIDES: Record<string, string> = {
  'kitchen-remodel': 'Treasure Valley Kitchen Remodeling',
  'bathroom-remodel': 'Treasure Valley Bathroom Remodeling',
  'whole-home-remodel': 'Treasure Valley Whole-Home Remodeling',
  'room-addition': 'Treasure Valley Home Additions',
  adu: 'Treasure Valley ADUs & Guest Houses',
  // Without an override these fall back to "<name> in the Treasure Valley",
  // which overruns the title budget and word-truncates to "... in the".
  'basement-remodel': 'Treasure Valley Basement Remodeling',
  'outdoor-living': 'Treasure Valley Decks & Outdoor Living',
  'aging-in-place': 'Aging-in-Place Remodeling in Boise',
};

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const base = getBaseUrl();
  const canonical = buildCanonical(input.path);

  let title: string;
  let description: string;

  switch (input.kind) {
    case 'home':
      title = generatePageTitle({ serviceName: '', serviceSlug: '', isHomePage: true });
      description = generateMetaDescription({ serviceName: '', serviceSlug: '', isHomePage: true });
      break;
    case 'service':
      // Intentional, full titles (no truncation/ellipsis). Each stays <= 60
      // chars once the layout template appends " | Boise Remodeling Co" (22).
      title =
        SERVICE_TITLE_OVERRIDES[input.serviceSlug ?? ''] ??
        generateSafePageTitle(`${input.serviceName} in the Treasure Valley`);
      description = generateMetaDescription({
        serviceName: input.serviceName!,
        serviceSlug: input.serviceSlug!,
      });
      break;
    case 'area':
      title = generateSafePageTitle(`Remodeling Contractor in ${input.cityName}, Idaho`);
      description = generateMetaDescription({
        serviceName: '',
        serviceSlug: '',
        city: input.cityName,
        citySlug: input.citySlug,
      });
      break;
    case 'city-service':
      title = generateCityServiceTitle(input.serviceName!, input.cityName!);
      description = generateCityServiceDescription(
        input.serviceName!,
        input.cityName!,
      );
      break;
    case 'about':
      title = 'About Us';
      description =
        'Learn about Boise Remodeling Co, a Treasure Valley design-build remodeler. Licensed, insured, and committed to clear communication start to finish.';
      break;
    case 'contact':
      title = 'Contact Us';
      description =
        `Contact Boise Remodeling Co for a free in-home consultation. Call ${SITE_CONFIG.phone} or schedule online. Serving Boise, Meridian, Eagle & the Treasure Valley.`;
      break;
    case 'blog':
      title = 'Remodeling Insights & Ideas';
      description =
        'Honest remodeling advice for Idaho homeowners: budgeting, timelines, permits, and design-build guidance from Boise Remodeling Co.';
      break;
    default:
      title = input.titleOverride || 'Boise Remodeling Co';
      description = input.descriptionOverride || '';
  }

  if (input.titleOverride) title = input.titleOverride;
  if (input.descriptionOverride) description = input.descriptionOverride;

  // The root layout template appends "| Boise Remodeling Co"; ensure the child
  // title never carries the brand itself (prevents duplicated brand in <title>).
  title = fitTitle(stripBrandSuffix(title));
  description = fitDescription(description);

  const ogImage = getDefaultOgImage();

  return {
    title,
    description,
    alternates: { canonical, types: FEED_ALTERNATES },
    ...(input.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'Boise Remodeling Co' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
