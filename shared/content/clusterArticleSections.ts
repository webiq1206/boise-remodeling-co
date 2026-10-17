import { CITIES_LIST, PILLAR_COST, type ContentSection } from './wave1/snippets';
import { getHubBySlug, guidePath } from '../contentHubs';
export interface ClusterArticleConfig {
  slug: string;
  title: string;
  excerpt: string;
  quickAnswer: string;
  hubSlug: string;
  serviceUrl?: string;
  cityServiceUrl?: string;
  extraSections?: ContentSection[];
}

/** Topic-specific depth for cluster blog posts (not full pillar duplication). */

const SLUG_SECTIONS: Record<string, ContentSection[]> = {
  'kitchen-remodel-cost-boise': [
    {
      h2: 'What drives kitchen cost in Boise?',
      paragraphs: [
        'Cabinet line, layout moves, and structural beams are the top variables. Appliance packages are usually separate from construction contracts.',
        'See the <a href="/guides/boise-remodeling-cost-guide">full cost guide</a> for cross-room comparisons.',
      ],
    },
    {
      h2: 'Kitchen timeline and lead times',
      paragraphs: [
        'Order cabinets at design lock; eight-week lead times are common. Permit review adds weeks when walls are removed.',
      ],
    },
  ],
  'open-concept-kitchen-remodeling': [
    {
      h2: 'Structural checks before demo',
      paragraphs: [
        'Verify beam sizing and point loads for Boise ranches and split-levels. Ada County sheets should be approved before demolition.',
      ],
    },
  ],
  'walk-in-shower-guide': [
    {
      h2: 'Waterproofing and inspection sequence',
      paragraphs: [
        'Flood testing and liner systems must pass before tile. Curbless designs need precise slope to the drain.',
      ],
    },
  ],
  'ada-vs-canyon-county-permit-timelines': [
    {
      h2: 'Ada County review expectations',
      paragraphs: [
        'Boise, Meridian, Eagle, Kuna, and Star projects often route through Ada County for residential remodels with layout changes.',
      ],
    },
    {
      h2: 'Canyon County review expectations',
      paragraphs: [
        'Nampa, Middleton, and Caldwell use Canyon County portals with different fees and comment cycles - do not assume Ada timelines.',
      ],
    },
  ],
};

function defaultTopicSections(title: string, hubSlug: string): ContentSection[] {
  return [
    {
      h2: `Planning ${title.toLowerCase()} in the Treasure Valley`,
      paragraphs: [
        `Homeowners in ${CITIES_LIST} should use local scope, permits, and finish level - not national averages - when budgeting this topic.`,
        `For the full overview, read the hub guide and cost planning resources linked below.`,
      ],
    },
    {
      h2: 'Local permits and housing context',
      paragraphs: [
        'Ada and Canyon Counties use different portals. Older homes may need contingency when walls open.',
        '<a href="/blog/ada-vs-canyon-county-permit-timelines">Compare permit timelines</a>.',
      ],
    },
  ];
}

export function buildClusterArticleSections(config: ClusterArticleConfig): ContentSection[] {
  const hub = getHubBySlug(config.hubSlug)!;
  const pillarUrl = guidePath(hub.pillarSlug);
  const serviceUrl = config.serviceUrl ?? '/services/kitchen-remodel';
  const cityUrl = config.cityServiceUrl ?? '/services/kitchen-remodel/boise';
  const topicSections = SLUG_SECTIONS[config.slug] ?? defaultTopicSections(config.title, config.hubSlug);
  const moreHref = config.hubSlug === 'treasure-valley-locations' ? '/areas' : `/blog/category/${config.hubSlug}`;
  const moreLabel = config.hubSlug === 'treasure-valley-locations' ? 'Service areas' : 'More articles';

  return [
    {
      h2: `About ${config.title}`,
      paragraphs: [config.excerpt, config.quickAnswer],
    },
    ...topicSections,
    ...(config.extraSections ?? []),
    {
      h2: 'Full guide and cost planning',
      paragraphs: [
        `<a href="${pillarUrl}">${hub.title}</a> · <a href="${PILLAR_COST}">Remodeling cost guide</a> · <a href="${moreHref}">${moreLabel}</a>.`,
      ],
    },
    {
      h2: 'Local services',
      paragraphs: [
        `<a href="${serviceUrl}">Service overview</a> · <a href="${cityUrl}">Boise area</a> · <a href="/areas">All cities</a>.`,
      ],
    },
    {
      h2: 'Next steps',
      paragraphs: [
        '<a href="/#calculator">Estimator</a> · <a href="/contact">Schedule consultation</a>.',
      ],
    },
  ];
}
