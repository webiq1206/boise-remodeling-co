import { buildSectionsHtml, CITIES_LIST, type ContentSection } from './wave1/snippets';
import { buildClusterArticleSections } from './clusterArticleSections';
import {
  clusterLinksSection,
  hubTopicSections,
  pillarEssentialsSection,
} from './guideSectionBlocks';
import { getHubPillarFaqs, getLocationFaqs } from './hubFaqs';
import { buildLocationGuideSections } from './locationCityContent';
import { getHubBySlug, guidePath } from '../contentHubs';
import type { BlogPostData } from '../blogContent';
import type { GuidePageData, GuideType } from '../guideContent';

const PILLAR_FOOTER =
  '<p class="text-sm text-muted-foreground">Explore <a href="/guides/treasure-valley-remodeling-guide">local guides</a>, <a href="/guides/boise-remodeling-cost-guide">cost planning</a>, and <a href="/areas">service areas</a>.</p>';

export function expandPillar(html: string, _slug: string, _hubSlug: string): string {
  return html + PILLAR_FOOTER;
}

export function expandLocation(html: string, _slug: string): string {
  return html;
}

/** ~8 focused H2 sections per hub pillar - no repeated template walls. */
function buildPillarSections(
  topic: string,
  pillarUrl: string,
  serviceUrl: string,
  cityServiceUrl: string,
  hubSlug: string,
  linkedClusterSlugs: string[] | undefined,
  extra: ContentSection[] = [],
): ContentSection[] {
  const clusterSection = clusterLinksSection(hubSlug, linkedClusterSlugs);
  return [
    {
      h2: `What should homeowners know about ${topic}?`,
      paragraphs: [
        `This overview covers ${topic.toLowerCase()} for ${CITIES_LIST}. Use the topic sections below, then follow linked articles for room-specific depth.`,
        'Boise Remodeling Co provides design-build remodeling with permits and construction under one contract.',
      ],
    },
    pillarEssentialsSection(topic),
    ...hubTopicSections(hubSlug, topic),
    {
      h2: 'Local services',
      paragraphs: [
        `<a href="${serviceUrl}">Service overview</a> · <a href="${cityServiceUrl}">Boise</a> · <a href="/areas">All service areas</a>.`,
      ],
    },
    ...extra,
    ...(clusterSection ? [clusterSection] : []),
    {
      h2: 'Next steps',
      paragraphs: [
        '<a href="/#calculator">Estimator</a> · <a href="/contact">Schedule consultation</a> · <a href="/guides">All guides</a>.',
        `Back to <a href="${pillarUrl}">this guide</a> anytime for the overview.`,
      ],
    },
  ];
}

export interface ClusterConfig {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  hubSlug: string;
  tags: string[];
  quickAnswer: string;
  takeaways: string[];
  serviceUrl?: string;
  cityServiceUrl?: string;
  extraSections?: ContentSection[];
  publishedAt?: string;
  /** Forced internal-link overrides appended to the defaults (e.g. linking the
   * ADU cluster posts to the ADU pillar; see local-seo-audit/06-internal-linking-plan.md). */
  extraRelatedLinks?: Array<{ url: string; anchor?: string }>;
}

export function buildClusterPost(config: ClusterConfig): BlogPostData {
  const hub = getHubBySlug(config.hubSlug)!;
  const pillarUrl = guidePath(hub.pillarSlug);
  const serviceUrl = config.serviceUrl ?? '/services/kitchen-remodel';
  const cityUrl = config.cityServiceUrl ?? '/services/kitchen-remodel/boise';
  const html = buildSectionsHtml(
    buildClusterArticleSections({
      slug: config.slug,
      title: config.title,
      excerpt: config.excerpt,
      quickAnswer: config.quickAnswer,
      hubSlug: config.hubSlug,
      serviceUrl: config.serviceUrl,
      cityServiceUrl: config.cityServiceUrl,
      extraSections: config.extraSections,
    }),
  );

  const hubFaqs = getHubPillarFaqs(config.hubSlug);
  const faqs =
    hubFaqs.length > 0
      ? hubFaqs.slice(0, 6)
      : [
          {
            question: `How does ${config.title} apply in the Treasure Valley?`,
            answer: config.quickAnswer,
          },
          {
            question: 'Where is the full guide?',
            answer: `See our ${hub.title} at ${pillarUrl} for the complete overview.`,
          },
          {
            question: 'How do I get a planning range?',
            answer:
              'Use our estimator, then schedule an in-home consultation for written scope.',
          },
          {
            question: 'Do you serve Ada and Canyon County?',
            answer: `Yes - we remodel across ${CITIES_LIST}.`,
          },
          {
            question: 'Are permits included?',
            answer:
              'Permit coordination is included in design-build scope when layout or MEP changes require review.',
          },
          {
            question: 'What should I read next?',
            answer: `Start with the <a href="${pillarUrl}">pillar guide</a> and <a href="/guides/boise-remodeling-cost-guide">cost guide</a>.`,
          },
        ];

  return {
    slug: config.slug,
    title: config.title,
    seoTitle: config.seoTitle,
    metaDescription: config.metaDescription,
    excerpt: config.excerpt,
    content: html,
    author: 'Boise Remodeling Co',
    category: hub.categoryLabel,
    hubSlug: config.hubSlug,
    tags: config.tags,
    publishedAt: config.publishedAt ?? '2026-05-15',
    faqs,
    quickAnswer: config.quickAnswer,
    keyTakeaways: config.takeaways,
    relatedLinks: [
      { url: pillarUrl, anchor: hub.title },
      { url: serviceUrl },
      { url: cityUrl },
      { url: '/guides/boise-remodeling-cost-guide' },
      ...(config.extraRelatedLinks ?? []),
    ],
    wordCountTarget: 'cluster',
  };
}

export interface PillarConfig {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  hubSlug: string;
  tags: string[];
  quickAnswer: string;
  takeaways: string[];
  linkedClusterSlugs: string[];
  linkedServices?: string[];
  extraSections?: ContentSection[];
  /** Bespoke, hand-authored guide body HTML. Overrides generated sections. */
  content?: string;
  /** Bespoke FAQs. Overrides the generic hub pillar FAQs. */
  faqs?: Array<{ question: string; answer: string }>;
}

export function buildPillarGuide(config: PillarConfig): GuidePageData {
  const hub = getHubBySlug(config.hubSlug)!;
  const pillarUrl = guidePath(config.slug);
  const servicePath = config.linkedServices?.[0]
    ? `/services/${config.linkedServices[0]}`
    : '/services/kitchen-remodel';
  const cityPath = `${servicePath}/boise`;
  const sections = buildPillarSections(
    config.title,
    pillarUrl,
    servicePath,
    cityPath,
    config.hubSlug,
    config.linkedClusterSlugs,
    config.extraSections,
  );
  const hubFaqs = getHubPillarFaqs(config.hubSlug);

  return {
    slug: config.slug,
    title: config.title,
    seoTitle: config.seoTitle,
    metaDescription: config.metaDescription,
    excerpt: config.excerpt,
    content: config.content ?? expandPillar(buildSectionsHtml(sections), config.slug, config.hubSlug),
    author: 'Boise Remodeling Co',
    hubSlug: config.hubSlug,
    guideType: 'hub-pillar',
    tags: config.tags,
    publishedAt: '2026-05-10',
    quickAnswer: config.quickAnswer,
    keyTakeaways: config.takeaways,
    faqs: config.faqs ?? (hubFaqs.length > 0 ? hubFaqs : []),
    linkedClusterSlugs: config.linkedClusterSlugs,
    linkedServices: config.linkedServices,
    relatedLinks: [
      { url: '/guides/treasure-valley-remodeling-guide' },
      { url: '/guides/boise-remodeling-cost-guide' },
      { url: `/blog/category/${config.hubSlug}` },
      { url: '/areas' },
    ],
  };
}

export interface LocationGuideConfig {
  slug: string;
  title: string;
  cityName: string;
  citySlug: string;
  county: 'ada' | 'canyon';
  housingNote: string;
  guideType: Extract<GuideType, "location" | "neighborhood">;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  quickAnswer: string;
  takeaways: string[];
}

export function buildLocationGuide(config: LocationGuideConfig): GuidePageData {
  const sections = buildLocationGuideSections(
    config.slug,
    config.cityName,
    config.citySlug,
    config.county,
    config.housingNote,
    config.guideType,
  );

  // A single, scannable local-permit callout at the top of every location guide.
  // It surfaces the one most actionable local fact - which county your project
  // routes through - in the on-brand sage note style, without duplicating the
  // housing intro. Kept to one callout so these shorter pages stay uncluttered.
  const permitBlurb =
    config.county === 'ada'
      ? `${config.cityName} remodeling permits route through <strong>Ada County</strong> plan review. Structural changes, layout moves, and additions all require it - and a design-build contractor handles the submissions and inspections for you.`
      : `${config.cityName} remodeling permits route through <strong>Canyon County</strong>, which uses different portals and a different review cadence than Ada County (Boise, Meridian). Your design-build contractor handles the submissions and inspections for you.`;
  const localCallout =
    `<div class="callout note"><p class="callout-label">${config.cityName} permit snapshot</p>` +
    `<p>${permitBlurb} See <a href="/blog/ada-vs-canyon-county-permit-timelines">Ada vs Canyon County permit timelines</a>.</p></div>`;

  return {
    slug: config.slug,
    title: config.title,
    seoTitle: config.seoTitle,
    metaDescription: config.metaDescription,
    excerpt: config.excerpt,
    content: localCallout + expandLocation(buildSectionsHtml(sections), config.slug),
    author: 'Boise Remodeling Co',
    hubSlug: 'treasure-valley-locations',
    guideType: config.guideType,
    tags: [config.citySlug, config.cityName.toLowerCase(), 'idaho'],
    publishedAt: '2026-05-12',
    // All location/neighborhood guides were substantively expanded in the
    // June 2026 audit pass (local-seo-audit/05-content-plan.md).
    updatedAt: '2026-06-10',
    quickAnswer: config.quickAnswer,
    keyTakeaways: config.takeaways,
    faqs: getLocationFaqs(config.cityName, config.citySlug, config.county),
    linkedCities: [config.citySlug],
    relatedLinks: [
      { url: '/guides/treasure-valley-remodeling-guide' },
      { url: `/areas/${config.citySlug}` },
    ],
  };
}
