/**
 * Topical authority registry - single source of truth for hubs and content manifest.
 */
import MERGED_POSTS from './content/mergedPosts.json';

export type ContentType = 'pillar' | 'cluster' | 'location' | 'neighborhood' | 'master';
export type ContentStatus = 'planned' | 'draft' | 'published';

/** Default status for manifest entries - all hubs finalized */
const PUBLISHED: ContentStatus = 'published';
export type ContentRoute = 'guide' | 'blog';

export interface ContentHub {
  hubSlug: string;
  title: string;
  categoryLabel: string;
  pillarSlug: string;
  pillarRoute: ContentRoute;
  description: string;
  priorityTier: 1 | 2 | 3 | 4 | 5;
  serviceSlugs: string[];
}

export interface ContentManifestEntry {
  slug: string;
  title: string;
  hubSlug: string;
  contentType: ContentType;
  route: ContentRoute;
  status: ContentStatus;
  replacesSlug?: string;
  primaryKeyword?: string;
}

export const CONTENT_HUBS: ContentHub[] = [
  {
    hubSlug: 'remodeling-costs',
    title: 'Boise Remodeling Costs',
    categoryLabel: 'Boise Remodeling Costs',
    pillarSlug: 'boise-remodeling-cost-guide',
    pillarRoute: 'guide',
    description: 'Planning ranges, cost drivers, and budgeting for Treasure Valley remodels.',
    priorityTier: 1,
    serviceSlugs: ['kitchen-remodel', 'bathroom-remodel', 'whole-home-remodel', 'room-addition'],
  },
  {
    hubSlug: 'kitchen-remodeling',
    title: 'Kitchen Remodeling',
    categoryLabel: 'Kitchen Remodeling',
    pillarSlug: 'boise-kitchen-remodeling-guide',
    pillarRoute: 'guide',
    description: 'Layouts, timelines, materials, and ROI for kitchen remodels in Boise.',
    priorityTier: 2,
    serviceSlugs: ['kitchen-remodel'],
  },
  {
    hubSlug: 'bathroom-remodeling',
    title: 'Bathroom Remodeling',
    categoryLabel: 'Bathroom Remodeling',
    pillarSlug: 'boise-bathroom-remodeling-guide',
    pillarRoute: 'guide',
    description: 'Showers, layouts, aging-in-place, and bathroom ROI.',
    priorityTier: 2,
    serviceSlugs: ['bathroom-remodel'],
  },
  {
    hubSlug: 'home-additions',
    title: 'Home Additions',
    categoryLabel: 'Home Additions',
    pillarSlug: 'boise-home-addition-guide',
    pillarRoute: 'guide',
    description: 'Second stories, suites, ADUs, and garage conversions.',
    priorityTier: 2,
    serviceSlugs: ['room-addition', 'adu'],
  },
  {
    hubSlug: 'whole-home-remodeling',
    title: 'Whole Home Remodeling',
    categoryLabel: 'Whole Home Remodeling',
    pillarSlug: 'whole-home-remodeling-guide',
    pillarRoute: 'guide',
    description: 'Phased renovations, remodeling vs moving, and living through construction.',
    priorityTier: 2,
    serviceSlugs: ['whole-home-remodel'],
  },
  {
    hubSlug: 'contractor-selection',
    title: 'Contractor Selection',
    categoryLabel: 'Contractor Selection',
    pillarSlug: 'choose-remodeling-contractor-boise',
    pillarRoute: 'guide',
    description: 'How to vet, compare bids, and choose a design-build partner.',
    priorityTier: 1,
    serviceSlugs: ['kitchen-remodel', 'bathroom-remodel', 'whole-home-remodel'],
  },
  {
    hubSlug: 'remodeling-process',
    title: 'Remodeling Process',
    categoryLabel: 'Remodeling Process',
    pillarSlug: 'boise-remodeling-process-guide',
    pillarRoute: 'guide',
    description: 'Permits, preconstruction, construction, punch list, and warranty.',
    priorityTier: 3,
    serviceSlugs: ['whole-home-remodel', 'kitchen-remodel', 'bathroom-remodel'],
  },
  {
    hubSlug: 'remodeling-roi',
    title: 'ROI & Home Value',
    categoryLabel: 'ROI & Home Value',
    pillarSlug: 'best-remodeling-roi-boise',
    pillarRoute: 'guide',
    description: 'Projects that return value in the Treasure Valley market.',
    priorityTier: 3,
    serviceSlugs: ['kitchen-remodel', 'bathroom-remodel', 'room-addition'],
  },
  {
    hubSlug: 'outdoor-living',
    title: 'Outdoor Living',
    categoryLabel: 'Outdoor Living',
    pillarSlug: 'outdoor-living-remodeling-guide',
    pillarRoute: 'guide',
    description: 'Patios, outdoor kitchens, decks, and backyard entertaining.',
    priorityTier: 4,
    serviceSlugs: ['whole-home-remodel'],
  },
  {
    hubSlug: 'treasure-valley-locations',
    title: 'Treasure Valley Locations',
    categoryLabel: 'Treasure Valley Locations',
    pillarSlug: 'treasure-valley-remodeling-guide',
    pillarRoute: 'guide',
    description: 'City and neighborhood remodeling guides across the valley.',
    priorityTier: 1,
    serviceSlugs: ['kitchen-remodel', 'bathroom-remodel', 'whole-home-remodel', 'room-addition', 'adu'],
  },
];

export const TREASURE_VALLEY_CITIES = [
  'Boise',
  'Meridian',
  'Eagle',
  'Kuna',
  'Star',
  'Middleton',
  'Nampa',
  'Caldwell',
] as const;

function hubPillar(hubSlug: string): Pick<ContentManifestEntry, 'hubSlug' | 'contentType' | 'route'> {
  const hub = CONTENT_HUBS.find((h) => h.hubSlug === hubSlug)!;
  return {
    hubSlug,
    contentType: 'pillar',
    route: hub.pillarRoute,
  };
}

function cluster(
  slug: string,
  title: string,
  hubSlug: string,
  status: ContentStatus = PUBLISHED,
  replacesSlug?: string,
): ContentManifestEntry {
  return {
    slug,
    title,
    hubSlug,
    contentType: 'cluster',
    route: 'blog',
    status,
    replacesSlug,
  };
}

function guide(
  slug: string,
  title: string,
  hubSlug: string,
  contentType: ContentType,
  status: ContentStatus = PUBLISHED,
): ContentManifestEntry {
  const hub = CONTENT_HUBS.find((h) => h.hubSlug === hubSlug)!;
  return {
    slug,
    title,
    hubSlug,
    contentType,
    route: 'guide',
    status,
  };
}

/** Full content manifest (~94 pieces) */
export const CONTENT_MANIFEST: ContentManifestEntry[] = ([
  // Hub 1 - Costs
  { slug: 'boise-remodeling-cost-guide', title: 'Boise Remodeling Cost Guide', ...hubPillar('remodeling-costs'), status: 'published' },
  cluster('kitchen-remodel-cost-boise', 'Kitchen Remodel Cost Boise', 'remodeling-costs', 'published', 'kitchen-remodel-cost-treasure-valley'),
  cluster('bathroom-remodel-cost-boise', 'Bathroom Remodel Cost Boise', 'remodeling-costs', 'published', 'bathroom-remodel-cost-idaho'),
  cluster('whole-home-remodel-cost-boise', 'Whole Home Remodel Cost Boise', 'remodeling-costs', 'published'),
  cluster('home-addition-cost-boise', 'Home Addition Cost Boise', 'remodeling-costs', 'published'),
  cluster('luxury-remodel-cost-boise', 'Luxury Remodel Cost Boise', 'remodeling-costs', 'published'),
  cluster('remodel-cost-per-square-foot-boise', 'Cost Per Square Foot to Remodel a Home in Boise', 'remodeling-costs', 'published'),
  cluster('what-impacts-remodeling-costs-boise', 'What Impacts Remodeling Costs in Boise', 'remodeling-costs', 'published'),
  cluster('how-to-budget-remodel-boise', 'How to Budget for a Remodel in Boise', 'remodeling-costs', 'published'),

  // Hub 2 - Kitchen
  { slug: 'boise-kitchen-remodeling-guide', title: 'Boise Kitchen Remodeling Guide', ...hubPillar('kitchen-remodeling'), status: PUBLISHED },
  cluster('kitchen-remodel-timeline-boise', 'Kitchen Remodel Timeline Boise', 'kitchen-remodeling'),
  cluster('kitchen-layout-ideas-boise-homes', 'Kitchen Layout Ideas for Boise Homes', 'kitchen-remodeling'),
  cluster('kitchen-cabinet-trends', 'Kitchen Cabinet Trends', 'kitchen-remodeling'),
  cluster('quartz-vs-quartzite-kitchen', 'Quartz vs Quartzite', 'kitchen-remodeling'),
  cluster('kitchen-remodel-roi', 'Kitchen Remodel ROI', 'kitchen-remodeling'),
  cluster('open-concept-kitchen-remodeling', 'Open Concept Kitchen Remodeling', 'kitchen-remodeling'),
  cluster('kitchen-island-design-guide', 'Kitchen Island Design Guide', 'kitchen-remodeling'),
  cluster('walk-in-pantry-design-guide', 'Walk-In Pantry Design Guide', 'kitchen-remodeling'),

  // Hub 3 - Bathroom
  { slug: 'boise-bathroom-remodeling-guide', title: 'Boise Bathroom Remodeling Guide', ...hubPillar('bathroom-remodeling'), status: PUBLISHED },
  cluster('walk-in-shower-guide', 'Walk-In Shower Guide', 'bathroom-remodeling'),
  cluster('curbless-shower-guide', 'Curbless Shower Guide', 'bathroom-remodeling'),
  cluster('luxury-bathroom-features', 'Luxury Bathroom Features', 'bathroom-remodeling'),
  cluster('small-bathroom-remodel-ideas', 'Small Bathroom Remodel Ideas', 'bathroom-remodeling'),
  cluster('aging-in-place-bathroom-design', 'Aging-in-Place Bathroom Design', 'bathroom-remodeling'),
  cluster('bathroom-remodel-roi', 'Bathroom Remodel ROI', 'bathroom-remodeling'),
  cluster('bathroom-layout-planning-guide', 'Bathroom Layout Planning Guide', 'bathroom-remodeling'),

  // Hub 4 - Additions
  { slug: 'boise-home-addition-guide', title: 'Boise Home Addition Guide', ...hubPillar('home-additions'), status: PUBLISHED },
  cluster('primary-suite-additions', 'Primary Suite Additions', 'home-additions'),
  cluster('bedroom-additions', 'Bedroom Additions', 'home-additions'),
  cluster('second-story-additions', 'Second Story Additions', 'home-additions'),
  cluster('garage-conversions', 'Garage Conversions', 'home-additions'),
  cluster('adu-guide-boise', 'ADU Guide Boise', 'home-additions'),
  guide('boise-adu-guide', 'Boise ADU Guide', 'home-additions', 'pillar'),
  cluster('multigenerational-living-remodels', 'Multigenerational Living Remodels', 'home-additions'),
  cluster('home-addition-timeline-guide', 'Home Addition Timeline Guide', 'home-additions'),
  cluster('room-addition-guide-treasure-valley', 'Room Addition Guide Treasure Valley', 'home-additions'),

  // Hub 5 - Whole home
  { slug: 'whole-home-remodeling-guide', title: 'Whole Home Remodeling Guide', ...hubPillar('whole-home-remodeling'), status: PUBLISHED },
  cluster('remodeling-vs-moving', 'Remodeling vs Moving', 'whole-home-remodeling'),
  cluster('whole-home-remodel-timeline', 'Whole Home Remodel Timeline', 'whole-home-remodeling'),
  cluster('living-through-a-remodel', 'Living Through a Remodel', 'whole-home-remodeling'),
  cluster('remodel-planning-guide', 'Remodel Planning Guide', 'whole-home-remodeling'),
  cluster('remodeling-mistakes-to-avoid', 'Remodeling Mistakes to Avoid', 'whole-home-remodeling'),
  cluster('design-build-process-guide', 'Design-Build Process Guide', 'whole-home-remodeling'),
  cluster('whole-home-remodel-planning-checklist', 'Whole-Home Remodel Planning Checklist', 'whole-home-remodeling'),

  // Hub 6 - Contractor
  { slug: 'choose-remodeling-contractor-boise', title: 'How to Choose a Remodeling Contractor in Boise', ...hubPillar('contractor-selection'), status: PUBLISHED },
  cluster('questions-to-ask-remodeling-contractor', 'Questions to Ask a Remodeling Contractor', 'contractor-selection'),
  cluster('remodeling-contractor-red-flags', 'Remodeling Contractor Red Flags', 'contractor-selection'),
  cluster('design-build-vs-general-contractor', 'Design-Build vs General Contractor', 'contractor-selection'),
  cluster('fixed-price-vs-cost-plus', 'Fixed Price vs Cost Plus', 'contractor-selection'),
  cluster('how-to-compare-remodeling-estimates', 'How to Compare Remodeling Estimates', 'contractor-selection'),
  cluster('why-remodeling-bids-vary', 'Why Remodeling Bids Vary So Much', 'contractor-selection'),
  cluster('what-makes-great-remodeling-contractor', 'What Makes a Great Remodeling Contractor', 'contractor-selection'),
  cluster('consultation-process-remodeling', 'What to Expect During the Consultation Process', 'contractor-selection'),
  cluster('how-to-choose-design-build-contractor', 'How to Choose a Design-Build Contractor', 'contractor-selection'),

  // Hub 7 - Process
  { slug: 'boise-remodeling-process-guide', title: 'Boise Remodeling Process Guide', ...hubPillar('remodeling-process'), status: PUBLISHED },
  cluster('remodeling-timeline-guide', 'Remodeling Timeline Guide', 'remodeling-process'),
  cluster('boise-permit-guide', 'Boise Permit Guide', 'remodeling-process'),
  cluster('preconstruction-guide', 'Preconstruction Guide', 'remodeling-process'),
  cluster('design-development-guide', 'Design Development Guide', 'remodeling-process'),
  cluster('material-selection-guide', 'Material Selection Guide', 'remodeling-process'),
  cluster('construction-phase-guide', 'Construction Phase Guide', 'remodeling-process'),
  cluster('punch-list-guide', 'Punch List Guide', 'remodeling-process'),
  cluster('warranty-guide-remodeling', 'Warranty Guide', 'remodeling-process'),
  cluster('ada-vs-canyon-county-permit-timelines', 'Ada vs Canyon County Permit Timelines', 'remodeling-process'),

  // Hub 8 - ROI
  // kitchen-roi-remodeling and bathroom-roi-remodeling were consolidated (301)
  // into kitchen-remodel-roi / bathroom-remodel-roi to remove ROI cannibalization.
  { slug: 'best-remodeling-roi-boise', title: 'Best Remodeling Projects for ROI in Boise', ...hubPillar('remodeling-roi'), status: PUBLISHED },
  cluster('addition-roi-remodeling', 'Addition ROI', 'remodeling-roi'),
  cluster('outdoor-living-roi', 'Outdoor Living ROI', 'remodeling-roi'),
  cluster('exterior-remodeling-roi', 'Exterior Remodeling ROI', 'remodeling-roi'),
  cluster('energy-efficiency-roi', 'Energy Efficiency ROI', 'remodeling-roi'),
  cluster('remodeling-before-selling', 'Remodeling Before Selling', 'remodeling-roi'),
  cluster('remodeling-long-term-living', 'Remodeling for Long-Term Living', 'remodeling-roi'),

  // Hub 9 - Outdoor
  { slug: 'outdoor-living-remodeling-guide', title: 'Outdoor Living Remodeling Guide', ...hubPillar('outdoor-living'), status: PUBLISHED },
  cluster('outdoor-kitchens-boise', 'Outdoor Kitchens', 'outdoor-living'),
  cluster('covered-patios-boise', 'Covered Patios', 'outdoor-living'),
  cluster('decks-vs-patios-boise', 'Decks vs Patios', 'outdoor-living'),
  cluster('outdoor-fireplaces-boise', 'Outdoor Fireplaces', 'outdoor-living'),
  cluster('outdoor-entertaining-spaces', 'Outdoor Entertaining Spaces', 'outdoor-living'),
  cluster('luxury-outdoor-living', 'Luxury Outdoor Living', 'outdoor-living'),
  cluster('backyard-transformations-boise', 'Backyard Transformations', 'outdoor-living'),

  // Hub 10 - Locations
  guide('treasure-valley-remodeling-guide', 'Treasure Valley Remodeling Guide', 'treasure-valley-locations', 'master', 'published'),
  guide('boise-remodeling-guide', 'Boise Remodeling Guide', 'treasure-valley-locations', 'location', 'published'),
  guide('meridian-remodeling-guide', 'Meridian Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('eagle-remodeling-guide', 'Eagle Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('kuna-remodeling-guide', 'Kuna Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('star-remodeling-guide', 'Star Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('middleton-remodeling-guide', 'Middleton Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('nampa-remodeling-guide', 'Nampa Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('caldwell-remodeling-guide', 'Caldwell Remodeling Guide', 'treasure-valley-locations', 'location'),
  guide('north-end-remodeling-guide', 'North End Remodeling Guide', 'treasure-valley-locations', 'neighborhood'),
  guide('boise-bench-remodeling-guide', 'Boise Bench Remodeling Guide', 'treasure-valley-locations', 'neighborhood'),
  guide('harris-ranch-remodeling-guide', 'Harris Ranch Remodeling Guide', 'treasure-valley-locations', 'neighborhood'),
  guide('east-boise-remodeling-guide', 'East Boise Remodeling Guide', 'treasure-valley-locations', 'neighborhood'),
  guide('hidden-springs-remodeling-guide', 'Hidden Springs Remodeling Guide', 'treasure-valley-locations', 'neighborhood'),
  guide('eagle-foothills-remodeling-guide', 'Eagle Foothills Remodeling Guide', 'treasure-valley-locations', 'neighborhood'),
  // Phase 4: merged thin twins 301 to their long twin or guide and leave every list.
] as ContentManifestEntry[]).filter((entry) => !(entry.slug in MERGED_POSTS));

export function getHubBySlug(hubSlug: string): ContentHub | undefined {
  return CONTENT_HUBS.find((h) => h.hubSlug === hubSlug);
}

export function getManifestBySlug(slug: string): ContentManifestEntry | undefined {
  return CONTENT_MANIFEST.find((e) => e.slug === slug);
}

export function getPublishedManifest(route?: ContentRoute): ContentManifestEntry[] {
  return CONTENT_MANIFEST.filter(
    (e) => e.status === 'published' && (route === undefined || e.route === route),
  );
}

export function getClustersForHub(hubSlug: string, publishedOnly = false): ContentManifestEntry[] {
  return CONTENT_MANIFEST.filter(
    (e) =>
      e.hubSlug === hubSlug &&
      e.contentType === 'cluster' &&
      (!publishedOnly || e.status === 'published'),
  );
}

export function getHubPillarSlug(hubSlug: string): string {
  return getHubBySlug(hubSlug)?.pillarSlug ?? '';
}

export function guidePath(slug: string): string {
  return `/guides/${slug}`;
}

export function blogPath(slug: string): string {
  return `/blog/${slug}`;
}

export function categoryHubPath(hubSlug: string): string {
  return `/blog/category/${hubSlug}`;
}

/** Minimum published cluster count before category hub is indexable */
export const CATEGORY_HUB_MIN_POSTS = 3;

export function isCategoryHubIndexable(hubSlug: string, publishedClusterCount: number): boolean {
  return publishedClusterCount >= CATEGORY_HUB_MIN_POSTS;
}
