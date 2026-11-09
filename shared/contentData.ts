// Content Data for Boise Remodeling Co
// Serves the Treasure Valley: Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton

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
    planningFrom: '$10k',
  },
  {
    slug: 'whole-home-remodel',
    name: 'Whole-Home Remodel',
    shortDescription: 'Cohesive whole-home renovations with a single project manager start to finish.',
    planningFrom: '$40k',
  },
  {
    slug: 'room-addition',
    name: 'Room Addition',
    shortDescription: 'Thoughtfully designed additions that feel like they were always part of your home.',
    planningFrom: '$95k',
  },
  {
    slug: 'adu',
    name: 'ADU / Guest House',
    shortDescription: 'Detached or attached accessory dwelling units designed to maximize your property value.',
    planningFrom: '$165k',
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

export const TREASURE_VALLEY_CITIES = CITIES.map((c) => c.name).join(', ');

export function getServiceBySlug(slug: string): ServiceData | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCountyLabel(county: CityData['county']): string {
  return county === 'ada' ? 'Ada County' : 'Canyon County';
}

