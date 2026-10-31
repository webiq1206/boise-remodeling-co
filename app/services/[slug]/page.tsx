import { SERVICE_SCENES } from '@/shared/serviceSceneImages';
import { InteriorPage } from '@/components/approved/InteriorLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import {
LandingPageTemplate,
type LandingSection,
type LandingLinkedParagraph,
} from '@/components/seo/LandingPageTemplate';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import {
landingBreadcrumbs,
landingFAQSchema,
landingServiceSchema
} from '@/lib/landing-schema';
import { buildPageMetadata } from '@/lib/page-metadata';
import { isIndexedPath } from '@/lib/siteUrls';
import { generateSpeakableSchema } from '@/lib/schema';
import { SERVICE_SLUGS,getServiceBySlug,servicePath } from '@/lib/seo-routes';
import { CITIES } from '@/shared/contentData';
import { getFeaturedGalleryProject } from '@/shared/galleryData';
import {
  BATHROOM_NEAR_ME_PROCESS,
  BATHROOM_NEAR_ME_SECTIONS,
  BATHROOM_NEAR_ME_TIMELINE,
} from '@/shared/content/bathroomNearMePage';
import { SERVICE_SEO_CONTENT } from '@/shared/seoContent';
import { ADU_CONVERSION_PAGE, ROOM_ADDITION_PAGE } from '@/shared/content/serviceOwnership';
import { getServiceImageSet } from '@/shared/serviceBackgrounds';
import { notFound } from 'next/navigation';
import { toSentenceCase } from '@/shared/sentenceCase';

/**
 * Phase 4 ownership split with Boise Construction Co (owner decision): these
 * two parents are the remodeling side of ADUs and additions, each with one
 * followed handoff link to the Construction page that owns the rest.
 */
const OWNERSHIP_PAGES = {
  adu: ADU_CONVERSION_PAGE,
  'room-addition': ROOM_ADDITION_PAGE,
} as const;

/**
 * One contextual in-body link from each service parent into its cluster
 * (phase 4): the posts sat at the generator's five-link floor.
 */
const SERVICE_CLUSTER_LINKS: Record<string, LandingLinkedParagraph> = {
  'kitchen-remodel': { text: 'For what moves a kitchen budget line by line, read our guide to', link: { label: 'kitchen remodel costs in Boise', href: '/blog/kitchen-remodel-cost-boise' } },
  'bathroom-remodel': { text: 'Before you settle on a layout, read our', link: { label: 'bathroom layout planning guide', href: '/blog/bathroom-layout-planning-guide' } },
  'whole-home-remodel': { text: 'To get a whole-home project organized before the first visit, work through the', link: { label: 'whole-home remodel planning checklist', href: '/blog/whole-home-remodel-planning-checklist' } },
  'room-addition': { text: 'If the new room is a bedroom, read what a legal bedroom needs in our guide to', link: { label: 'bedroom additions in Boise', href: '/blog/bedroom-additions' } },
  adu: { text: 'If the garage is the candidate, start with our guide to', link: { label: 'garage conversions', href: '/blog/garage-conversions' } },
  'basement-remodel': { text: 'For egress, moisture and layout detail, read our guide to', link: { label: 'basement finishing in Boise', href: '/blog/basement-finishing-boise' } },
  'outdoor-living': { text: 'For roof types, snow loads and permits, read our guide to', link: { label: 'covered patios in Boise', href: '/blog/covered-patios-boise' } },
  'aging-in-place': { text: 'For curbless showers, grab bars and clearances, read our guide to', link: { label: 'aging-in-place bathroom design', href: '/blog/aging-in-place-bathroom-design' } },
};

/** The parent page shows at most seven questions, visibly, and the schema matches. */
const MAX_VISIBLE_FAQS = 7;

export function generateStaticParams() {
  return SERVICE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
) {
  const params = await props.params;
  const service = getServiceBySlug(params.slug);
  if (!service) return {};
  return withBrandPageMetadata(await (buildPageMetadata({
    kind: 'service',
    serviceName: service.name,
    serviceSlug: service.slug,
    path: servicePath(service.slug),
  })), "/services/[slug]");
}

export default async function ServicePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const service = getServiceBySlug(params.slug);
  const content = SERVICE_SEO_CONTENT[params.slug];
  if (!service || !content) notFound();

  const ownership = OWNERSHIP_PAGES[service.slug as keyof typeof OWNERSHIP_PAGES];

  const path = servicePath(service.slug);
  const isBathroomNearMe = service.slug === 'bathroom-remodel';
  const faqs = (ownership?.faqs ?? content.faqs).slice(0, MAX_VISIBLE_FAQS);
  const overview = ownership?.overview ?? content.overview;
  const images = getServiceImageSet(service.slug);
  // Ownership pages show no featured build: the gallery entries are a detached
  // ADU and a new-footprint suite, which these pages hand to Boise Construction Co.
  const featuredProject = ownership ? undefined : getFeaturedGalleryProject(service.slug);
  const serviceLC = service.name.toLowerCase();

  const ownershipLabel = service.slug === 'room-addition' ? 'Room additions' : toSentenceCase(content.noun ?? service.name);
  // The ownership pages name what they now are in the breadcrumb, not the
  // shared service label ("ADU / Guest House").
  const crumbName = service.slug === 'adu' ? 'ADU conversions' : ownership ? 'Room additions' : service.name;
  const ownershipCityLinks = CITIES.map((c) => ({
    label: `${ownershipLabel} in ${c.name}`,
    href: `/services/${service.slug}/${c.slug}`,
  })).filter((link) => isIndexedPath(link.href)); // Same index rule as the sitemap.
  const sections: LandingSection[] = ownership
    ? [
        ...ownership.sections,
        ...(ownershipCityLinks.length > 0
          ? [
              {
                heading: `${ownershipLabel} by city`,
                paragraphs: [
                  `Local pages cover the neighborhoods, permit path and planning details for each city we serve.`,
                ],
                links: ownershipCityLinks,
              },
            ]
          : []),
      ]
    : // Bathroom parent page: no dollar modules. City pages keep costGuidance.
      isBathroomNearMe
    ? BATHROOM_NEAR_ME_SECTIONS
    : [
    ...(content.costGuidance
      ? [
          {
            heading: content.costGuidance.heading,
            paragraphs: content.costGuidance.paragraphs,
            links: [
              { label: 'Boise Remodeling Cost Guide', href: '/guides/boise-remodeling-cost-guide' },
              { label: 'Request a quote', href: '/#request' },
            ],
          },
        ]
      : []),
    {
      heading: `${service.name} across the Treasure Valley`,
      paragraphs: [
        `We provide ${serviceLC} services throughout the Treasure Valley, with dedicated local pages for each city we serve. Permit paths, housing stock, and HOA requirements differ between Ada and Canyon County communities, so each city page covers the details that matter where you live.`,
        `Choose your city below to see local ${serviceLC} guidance, or schedule a free in-home consultation to discuss your project directly.`,
      ],
      // Same index rule as the sitemap: noindexed city combos are not linked.
      links: CITIES.map((c) => ({
        label: `${service.name} in ${c.name}`,
        href: `/services/${service.slug}/${c.slug}`,
      })).filter((link) => isIndexedPath(link.href)),
    },
    {
      heading: `Why design-build for your ${serviceLC}`,
      paragraphs: [
        `As a design-build remodeler, we bring design, estimating, permitting, and construction under one contract and one accountable team. That removes the handoffs and finger-pointing that happen when a separate designer and general contractor are involved - and it keeps your ${serviceLC} on a single, coordinated schedule.`,
        `You get a written scope before construction begins, clear allowances for selections, proactive communication throughout the build, and a workmanship guarantee when the project is complete.`,
      ],
    },
  ];

  const clusterLink = SERVICE_CLUSTER_LINKS[service.slug];
  const linkedSections: LandingSection[] = clusterLink
    ? sections.map((section, i) =>
        i === sections.length - 1 ? { ...section, paragraphs: [...(section.paragraphs ?? []), clusterLink] } : section,
      )
    : sections;

  const schemas = [
    landingBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services' },
      { name: crumbName, url: path },
    ]),
    landingServiceSchema(content.noun ? toSentenceCase(content.noun) : service.name, overview),
    landingFAQSchema(faqs),
    generateSpeakableSchema({ path, name: content.headline }),
  ];

  return (
    <InteriorPage kind="services"><>
      <JsonLd data={schemas} />
      <LandingPageTemplate
        h1={content.headline}
        speakableSummary={overview}
        overview={overview}
        heroImageUrl={ownership?.images?.hero ?? SERVICE_SCENES[service.slug]?.src ?? images.hero}
        heroImageAlt={ownership?.images?.heroAlt ?? SERVICE_SCENES[service.slug]?.alt}
        breatherImageUrl={ownership?.images?.breather ?? images.breather}
        processImageUrl={images.process}
        manifestPath={path}
        planningFrom={ownership ? undefined : isBathroomNearMe ? undefined : service.planningFrom}
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Services', href: '/services' },
          { name: crumbName },
        ]}
        benefits={content.benefits}
        inclusions={ownership?.inclusions ?? content.inclusions}
        timeline={ownership?.timeline ?? (isBathroomNearMe ? BATHROOM_NEAR_ME_TIMELINE : content.timeline)}
        processSteps={isBathroomNearMe ? BATHROOM_NEAR_ME_PROCESS : content.processSteps}
        sections={linkedSections}
        featuredProject={featuredProject}
        serviceSlug={ownership ? undefined : service.slug}
        imageSubject={service.slug}
        showEstimatePrompt
        faqs={faqs}
        faqDisplay="visible"
        subject={{ noun: content.noun ?? serviceLC }}
        answer={content.answer}
        related={{ variant: 'service', serviceSlug: service.slug }}
      />
    </></InteriorPage>
  );
}
