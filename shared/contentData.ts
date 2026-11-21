// Content Data for Boise Remodeling Co
// Public service area: Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, Caldwell,
// plus Ada County and Canyon County. Published city pages can be a longer set.

import { moneyShort, p5Figure, type P5FigureKey } from './content/p5Figures';

/**
 * The lowest preliminary range the instant estimator shows for the smallest
 * typical version of a project, at the Essential level (owner, 20 November
 * 2026: every published figure comes from the estimator). A project the
 * estimator does not price for this brand has no starting figure.
 */
function planningStart(key: P5FigureKey, basis: string): { planningFrom: string; planningFromBasis: string } {
  const low = p5Figure(key).tiers.builder?.published.low;
  if (!low) throw new Error(`no Essential figure for ${key}`);
  return { planningFrom: moneyShort(low), planningFromBasis: basis };
}

export interface ServiceData {
  slug: string;
  name: string;
  shortDescription: string;
  /**
   * Planning starting point (a floor, not a bid or a wide range). Rendered as
   * "Planning from $X". It is the low end of the instant estimator's
   * preliminary range for the basis named in planningFromBasis
   * (shared/content/p5PublishedFigures.json). Absent for a project the
   * instant estimator does not price for this brand.
   */
  planningFrom?: string;
  /** What planningFrom was run for, shown beside it. */
  planningFromBasis?: string;
  /**
   * Secondary services expand keyword coverage (basement, outdoor living,
   * aging-in-place). They get full service + city pages, nav, and sitemap
   * entries, but are kept off the homepage grid so the primary five stay
   * front-and-center. Shown in full on /services.
   */
  secondary?: boolean;
}

export interface CityData {
  slug: string;
  name: string;
  county: 'ada' | 'canyon';
  isPrimary: boolean;
}

export const SERVICES: ServiceData[] = [
  {
    slug: 'kitchen-remodel',
    name: 'Kitchen Remodel',
    shortDescription: 'Custom kitchen renovations from cabinet refreshes to full gut-and-rebuild.',
    ...planningStart('kitchen-refresh-small', 'A small kitchen refresh at the Essential level, from our instant estimate'),
  },
  {
    slug: 'bathroom-remodel',
    name: 'Bathroom Remodel',
    shortDescription: 'Spa-quality bathroom transformations designed around how you actually live.',
    ...planningStart('bath-powder-refresh', 'A powder room refresh at the Essential level, from our instant estimate'),
  },
  {
    slug: 'whole-home-remodel',
    name: 'Whole-Home Remodel',
    shortDescription: 'Cohesive whole-home renovations with a single project manager start to finish.',
    ...planningStart('whole-home-1200', 'A 1,200 sq ft renovation at the Essential level, from our instant estimate'),
  },
  {
    slug: 'room-addition',
    name: 'Room Addition',
    shortDescription: 'Thoughtfully designed additions that feel like they were always part of your home.',
    ...planningStart('addition-room-200', 'A 200 sq ft room addition at the Essential level, from our instant estimate'),
  },
  {
    slug: 'adu',
    name: 'ADU / Guest House',
    shortDescription: 'Garage, basement and attached spaces turned into accessory dwelling units.',
  },
  {
    slug: 'basement-remodel',
    name: 'Basement Remodeling',
    shortDescription: 'Finished basements and lower-level living space, from egress and framing to a fully finished suite.',
    ...planningStart('basement-600', 'A 600 sq ft basement at the Essential level, from our instant estimate'),
    secondary: true,
  },
  {
    slug: 'outdoor-living',
    name: 'Outdoor Living & Decks',
    shortDescription: 'Decks, covered patios, and outdoor kitchens that extend your living space into the yard.',
    secondary: true,
  },
  {
    slug: 'aging-in-place',
    name: 'Aging-in-Place Remodeling',
    shortDescription: 'Accessible, safe, and stylish remodels that let you stay in the home you love for the long term.',
    secondary: true,
  },
];

// Alias so existing imports stay compatible
export const PRIORITY_SERVICES = SERVICES;

/**
 * Every city with a published page. A town added here later (Garden City or
 * Emmett, say) stays out of nav and service-area copy until the owner adds it
 * to SERVICE_AREA_CITY_NAMES. Middleton joined that list on 20 November 2026.
 */
export const CITIES: CityData[] = [
  { slug: 'boise', name: 'Boise', county: 'ada', isPrimary: true },
  { slug: 'meridian', name: 'Meridian', county: 'ada', isPrimary: false },
  { slug: 'eagle', name: 'Eagle', county: 'ada', isPrimary: false },
  { slug: 'garden-city', name: 'Garden City', county: 'ada', isPrimary: false },
  { slug: 'nampa', name: 'Nampa', county: 'canyon', isPrimary: false },
  { slug: 'kuna', name: 'Kuna', county: 'ada', isPrimary: false },
  { slug: 'star', name: 'Star', county: 'ada', isPrimary: false },
  { slug: 'middleton', name: 'Middleton', county: 'canyon', isPrimary: false },
  { slug: 'caldwell', name: 'Caldwell', county: 'canyon', isPrimary: false },
];

/**
 * The official service area (owner, 20 November 2026, from the P5 Home Co
 * Google Business Profile and every listing), in the owner's order. Middleton
 * joined with its published pages (SEO audit REM-T4); Garden City joined the
 * same day by owner decision. Garden City has its own area page. Service hubs
 * link that page. They do not grow /services/{service}/garden-city spokes.
 */
export const SERVICE_AREA_CITY_NAMES = [
  'Boise',
  'Meridian',
  'Eagle',
  'Garden City',
  'Nampa',
  'Kuna',
  'Star',
  'Middleton',
  'Caldwell',
] as const;

export const SERVICE_AREA_COUNTIES = ['Ada County', 'Canyon County'] as const;

/** County of each service-area city, including those without a page here. */
export const SERVICE_AREA_CITY_COUNTY: Record<(typeof SERVICE_AREA_CITY_NAMES)[number], CityData['county']> = {
  Boise: 'ada',
  Meridian: 'ada',
  Eagle: 'ada',
  'Garden City': 'ada',
  Nampa: 'canyon',
  Kuna: 'ada',
  Star: 'ada',
  Middleton: 'canyon',
  Caldwell: 'canyon',
};

/** Service-area cities that have a published page here, in service-area order. */
export const SERVICE_AREA_CITIES: CityData[] = SERVICE_AREA_CITY_NAMES.flatMap((name) => {
  const city = CITIES.find((entry) => entry.name === name);
  return city ? [city] : [];
});

/** Service-area cities with no page on this site (named in copy, never linked). */
export const SERVICE_AREA_CITIES_WITHOUT_PAGE: string[] = SERVICE_AREA_CITY_NAMES.filter(
  (name) => !CITIES.some((entry) => entry.name === name),
);

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/** Ada County cities in service-area order, including Garden City. */
export const ADA_COUNTY_CITY_NAMES = SERVICE_AREA_CITY_NAMES.filter(
  (name) => SERVICE_AREA_CITY_COUNTY[name] === 'ada',
);
/** Canyon County cities in service-area order. Nampa, Middleton, and Caldwell. */
export const CANYON_COUNTY_CITY_NAMES = SERVICE_AREA_CITY_NAMES.filter(
  (name) => SERVICE_AREA_CITY_COUNTY[name] === 'canyon',
);
export const ADA_COUNTY_CITY_LIST = joinNames(ADA_COUNTY_CITY_NAMES);
export const CANYON_COUNTY_CITY_LIST = joinNames(CANYON_COUNTY_CITY_NAMES);

/** City names in service-area order, with a serial comma. */
export const TREASURE_VALLEY_CITIES = joinNames(SERVICE_AREA_CITY_NAMES);

/** Cities plus the two counties, for visible service-area sentences. */
export const SERVICE_AREA_SENTENCE = `${TREASURE_VALLEY_CITIES}, across ${joinNames(SERVICE_AREA_COUNTIES)}`;

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCountyLabel(county: CityData['county']): string {
  return county === 'ada' ? 'Ada County' : 'Canyon County';
}

