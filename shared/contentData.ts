// Content Data for Boise Remodeling Co
// Public service area: Boise, Meridian, Nampa, Eagle, Kuna, Caldwell, Star, Middleton,
// plus Ada County and Canyon County. Published city pages can be a longer set.

export interface ServiceData {
  slug: string;
  name: string;
  shortDescription: string;
  /**
   * Planning starting point (a floor, not a bid or a wide range). Rendered as
   * "Planning from $X" to give price context without committing to a spread -
   * the real number comes from the estimator + in-home visit. Sourced from the
   * published GBP starting figures (shared/gbpProfile.ts).
   */
  planningFrom: string;
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
    planningFrom: '$15k',
  },
  {
    slug: 'bathroom-remodel',
    name: 'Bathroom Remodel',
    shortDescription: 'Spa-quality bathroom transformations designed around how you actually live.',
    planningFrom: '$7k',
  },
  {
    slug: 'whole-home-remodel',
    name: 'Whole-Home Remodel',
    shortDescription: 'Cohesive whole-home renovations with a single project manager start to finish.',
    planningFrom: '$72k',
  },
  {
    slug: 'room-addition',
    name: 'Room Addition',
    shortDescription: 'Thoughtfully designed additions that feel like they were always part of your home.',
    planningFrom: '$25k',
  },
  {
    slug: 'adu',
    name: 'ADU / Guest House',
    shortDescription: 'Garage, basement and attached spaces turned into accessory dwelling units.',
    planningFrom: '$90k',
  },
  {
    slug: 'basement-remodel',
    name: 'Basement Remodeling',
    shortDescription: 'Finished basements and lower-level living space, from egress and framing to a fully finished suite.',
    planningFrom: '$35k',
    secondary: true,
  },
  {
    slug: 'outdoor-living',
    name: 'Outdoor Living & Decks',
    shortDescription: 'Decks, covered patios, and outdoor kitchens that extend your living space into the yard.',
    planningFrom: '$25k',
    secondary: true,
  },
  {
    slug: 'aging-in-place',
    name: 'Aging-in-Place Remodeling',
    shortDescription: 'Accessible, safe, and stylish remodels that let you stay in the home you love for the long term.',
    planningFrom: '$20k',
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
  { slug: 'nampa', name: 'Nampa', county: 'canyon', isPrimary: false },
  { slug: 'kuna', name: 'Kuna', county: 'ada', isPrimary: false },
  { slug: 'star', name: 'Star', county: 'ada', isPrimary: false },
  { slug: 'middleton', name: 'Middleton', county: 'canyon', isPrimary: false },
  { slug: 'caldwell', name: 'Caldwell', county: 'canyon', isPrimary: false },
];

/**
 * Owner decision: the public service area matches the P5 Home Co Google
 * Business Profile. Order is the display order.
 */
export const SERVICE_AREA_CITY_NAMES = [
  'Boise',
  'Meridian',
  'Nampa',
  'Eagle',
  'Kuna',
  'Caldwell',
  'Star',
  // Owner decision, 20 November 2026 (SEO audit REM-T4): the P5 Home Co
  // Business Profile lists Middleton and its pages are published, so every
  // service-area statement names it.
  'Middleton',
] as const;

export const SERVICE_AREA_COUNTIES = ['Ada County', 'Canyon County'] as const;

export const SERVICE_AREA_CITIES: CityData[] = SERVICE_AREA_CITY_NAMES.map((name) => {
  const city = CITIES.find((entry) => entry.name === name);
  if (!city) throw new Error(`Service area city ${name} has no published page`);
  return city;
});

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

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

