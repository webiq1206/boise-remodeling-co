import type { Metadata } from 'next';
import {
  BATHROOM_NEAR_ME_DESCRIPTION,
  BATHROOM_NEAR_ME_TITLE,
} from '@/shared/content/bathroomNearMePage';
import { publishFoundingCopy } from '@/shared/publicClaims';
import { SITE_CONFIG } from '@/shared/siteConfig';
import { NOINDEX_CITY_SERVICE_KEYS } from '@/shared/cityServiceIndex.mjs';
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
  // Phase 4 (owner decision, 31 October 2026): Boise Construction Co owns new
  // detached ADUs, and none of the eight ADU city pages has bespoke local copy
  // (cityServiceCopy.ts carries no adu/* entry). The four that were still
  // indexed join the others until bespoke local copy exists.
  'adu/boise',
  'adu/meridian',
  'adu/eagle',
  'adu/nampa',
  ...NOINDEX_CITY_SERVICE_KEYS,
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
  const text = description.replace(/\s+/g, ' ').trim();
  if (text.length <= 160) return text;
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const sentence of sentences) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length <= 160) out = next;
    else break;
  }
  // A short first sentence must not discard the rest of an authored
  // description. Fill the remaining room on a word boundary.
  if (out.length >= 140) return out;
  const rest = text.slice(out.length).replace(/^\s+/, '');
  const budget = 160 - (out ? out.length + 1 : 0);
  let extra = rest.slice(0, Math.max(budget, 0));
  if (extra.length < rest.length) {
    extra = extra.replace(/\s+\S*$/, '').replace(/[,:;.\s-]+$/, '');
  }
  const combined = [out, extra].filter(Boolean).join(' ');
  if (combined.length >= 40 && combined.length <= 160) return combined;
  return text.slice(0, 160).replace(/\s+\S*$/, '').replace(/[,:;]\s*$/, '');
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
  // SEO audit REM-T1: the kitchen and bathroom hubs are the Treasure Valley
  // pages too; /services/<slug>/boise owns "<service> in Boise".
  'kitchen-remodel': 'Treasure Valley kitchen remodeling',
  'bathroom-remodel': BATHROOM_NEAR_ME_TITLE,
  'whole-home-remodel': 'Treasure Valley Whole-Home Remodeling',
  // Parent versus Boise child (phase 4): the parent owns the service across the
  // Treasure Valley, /services/<slug>/boise owns "<service> in Boise".
  'room-addition': 'Room additions in the Treasure Valley',
  adu: 'ADU conversions in the Treasure Valley',
  // Without an override these fall back to "<name> in the Treasure Valley",
  // which overruns the title budget and word-truncates to "... in the".
  'basement-remodel': 'Treasure Valley Basement Remodeling',
  'outdoor-living': 'Treasure Valley Decks & Outdoor Living',
  'aging-in-place': 'Aging-in-place remodeling in Idaho',
};

/**
 * The Boise child owns "<service> in Boise" (phase 4). Sentence case, and
 * within the 38-character child budget.
 */
const CITY_SERVICE_TITLE_OVERRIDES: Record<string, string> = {
  'room-addition/boise': 'Room additions in Boise, Idaho',
  'aging-in-place/boise': 'Aging-in-place remodeling in Boise, ID',
};

/**
 * Area pages: one title and one description pattern for every city (SEO audit
 * REM-T3, 20 November 2026). The description opens with the page keyword and
 * uses only facts the site already states: the services, a written scope and
 * a free in-home visit. "ID" keeps the longest city title inside 60 rendered
 * characters.
 */
const AREA_META: Record<string, { title: string; description: string }> = {
  boise: {
    title: 'Boise Neighborhood Remodels',
    description:
      'Remodeling for homes in North End, Bench and Downtown Boise: kitchens, baths and whole-home projects, permit notes for your address, and a free visit.',
  },
  eagle: {
    title: 'Home Remodeling in Eagle, ID',
    description:
      'Home remodeling in Eagle, Idaho, from Banbury to Floating Feather: kitchens, baths, basements and additions by one design-build team with a written scope.',
  },
  kuna: {
    title: 'Home Remodeling in Kuna, ID',
    description:
      'Home remodeling in Kuna, Idaho, from Crimson Point to Black Cat: kitchens, baths and additions by one design-build team, with a written scope to start.',
  },
  'garden-city': {
    title: 'Home Remodeling in Garden City, ID',
    description:
      'Home remodeling in Garden City, Idaho, from Riverside Village to Chinden: kitchens, baths and additions by one design-build team. Call or text to start.',
  },
};

function areaTitle(cityName: string): string {
  return `Remodeling contractor in ${cityName}, ID`;
}

function areaDescription(cityName: string): string {
  // "founded 2020" stays in source for the founding-year flag (SHOW_FOUNDING_YEAR);
  // publishFoundingCopy() removes it while the flag is off, so the published text
  // reads "Remodeling contractor in <city>, Idaho for kitchens...".
  return `Remodeling contractor founded 2020 in ${cityName}, Idaho for kitchens, baths, additions and whole-home remodels, with a written scope and a free in-home visit to start.`;
}

const SERVICE_ANSWER: Record<string, { title: string; description: string }> = {
  'bathroom-remodel': {
    title: BATHROOM_NEAR_ME_TITLE,
    // Near-me meta. No registration number, no prices, no week count.
    description: BATHROOM_NEAR_ME_DESCRIPTION,
  },
  'kitchen-remodel': {
    title: 'Treasure Valley kitchen remodeling',
    description:
      // "Founded in 2020." stays in source for the founding-year flag; publishFoundingCopy() removes it while the flag is off.
      'Kitchen remodeling across the Treasure Valley: layout, cabinets, counters and permits under one written scope, with a free in-home visit to start. Founded in 2020.',
  },
  'room-addition': {
    title: 'Room additions in the Treasure Valley',
    description:
      'Room additions in the Treasure Valley: bump-outs and in-footprint expansions with a written scope. New-footprint builds go to Boise Construction Co.',
  },
  'whole-home-remodel': {
    title: 'Treasure Valley Whole-Home Remodeling',
    description:
      'Whole-home remodeling across the Treasure Valley: phased or full-house renovations run by one design-build team with a written scope and weekly updates.',
  },
  'basement-remodel': {
    title: 'Treasure Valley Basement Remodeling',
    description:
      'Basement remodeling across the Treasure Valley: egress, framing, moisture control and finished lower-level suites, design-build with permits handled.',
  },
  'outdoor-living': {
    title: 'Treasure Valley Decks & Outdoor Living',
    description:
      'Outdoor living spaces across the Treasure Valley: covered patios, outdoor kitchens, fireplaces and decks designed for freeze-thaw winters, design-build.',
  },
  adu: {
    title: 'ADU conversions in the Treasure Valley',
    description:
      'ADU conversions in the Treasure Valley: garage, basement and attached units turned into living space, design-build, with a written scope and permits.',
  },
  'aging-in-place': {
    title: 'Aging-in-place remodeling in Idaho',
    description:
      'Aging-in-place remodeling across the Treasure Valley: curbless showers, wider doorways, grab bars, lighting and single-level living. Free in-home visit.',
  },
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
    case 'service': {
      const answer = SERVICE_ANSWER[input.serviceSlug ?? ''];
      // Intentional, full titles (no truncation/ellipsis). Each stays <= 60
      // chars once the layout template appends " | Boise Remodeling Co" (22).
      title =
        answer?.title ??
        SERVICE_TITLE_OVERRIDES[input.serviceSlug ?? ''] ??
        generateSafePageTitle(`${input.serviceName} in the Treasure Valley`);
      description =
        answer?.description ??
        generateMetaDescription({
          serviceName: input.serviceName!,
          serviceSlug: input.serviceSlug!,
        });
      break;
    }
    case 'area': {
      const custom = AREA_META[input.citySlug ?? ''];
      title = custom?.title ?? areaTitle(input.cityName ?? 'Boise');
      description = custom?.description ?? areaDescription(input.cityName ?? 'Boise');
      break;
    }
    case 'city-service':
      title =
        CITY_SERVICE_TITLE_OVERRIDES[`${input.serviceSlug}/${input.citySlug}`] ??
        generateCityServiceTitle(input.serviceName!, input.cityName!);
      description = generateCityServiceDescription(
        input.serviceName!,
        input.cityName!,
        input.serviceSlug,
      );
      break;
    case 'about':
      title = 'About Our Design-Build Team';
      description =
        'Meet the design-build team behind Boise Remodeling Co, a P5 Home Co company. Idaho Registered Contractor #8381215. See how we plan, price and manage remodels for Ada and Canyon County homes.';
      break;
    case 'contact':
      title = 'Contact Boise Remodeling Co | Call, Text or Request a Visit';
      description =
        'Call or text Boise Remodeling Co, or book a free in-home visit for your kitchen, bath or whole-home project in Ada or Canyon County. No pressure, no pitch.';
      break;
    case 'blog':
      title = 'Remodeling Advice and Ideas';
      description =
        'Practical remodeling advice for Treasure Valley homeowners: budgets, timelines, permits and design ideas, written by the Boise Remodeling Co design team.';
      break;
    default:
      title = input.titleOverride || 'Boise Remodeling Co';
      description = input.descriptionOverride || '';
  }

  if (input.titleOverride) title = input.titleOverride;
  if (input.descriptionOverride) description = input.descriptionOverride;

  // The root layout template appends "| Boise Remodeling Co"; ensure the child
  // title never carries the brand itself (prevents duplicated brand in <title>).
  title = fitTitle(stripBrandSuffix(publishFoundingCopy(title)));
  description = fitDescription(publishFoundingCopy(description));

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
