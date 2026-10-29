import { SERVICE_SCENES } from '@/shared/serviceSceneImages';
import { InteriorPage } from '@/components/approved/InteriorLayout';
import { ServiceReferral } from '@/components/marketing/ServiceReferral';
import { JsonLd } from '@/components/seo/JsonLd';
import {
LandingPageTemplate,
type LandingSection,
} from '@/components/seo/LandingPageTemplate';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import {
landingBreadcrumbs,
landingFAQSchema,
landingServiceSchema
} from '@/lib/landing-schema';
import { buildPageMetadata } from '@/lib/page-metadata';
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
import { getServiceImageSet } from '@/shared/serviceBackgrounds';
import { notFound } from 'next/navigation';

/** D2: ADUs and room additions belong to Boise Construction Co. */
const CONSTRUCTION_REFERRALS: Record<
  string,
  { title: string; body: string; ctaLabel: string; ctaHref: string; alsoNote?: string }
> = {
  adu: {
    title: 'ADUs and guest houses',
    body: 'Boise Construction Co handles accessory dwelling units and guest houses for Treasure Valley lots. Boise Remodeling Co focuses on kitchens, bathrooms and whole-home work inside the home you already have.',
    ctaLabel: 'Talk with Boise Construction Co',
    ctaHref: 'https://boiseconstruction.co/services/home-additions',
    alsoNote:
      'Boise ADU Co projects currently run through Boise Construction Co; its dedicated site is coming.',
  },
  'room-addition': {
    title: 'Room additions',
    body: 'New structure and the same permit path as other new construction, so room additions are handled by Boise Construction Co. Boise Remodeling Co stays focused on remodeling the rooms you already live in.',
    ctaLabel: 'Talk with Boise Construction Co about additions',
    ctaHref: 'https://boiseconstruction.co/services/home-additions',
  },
};

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

  const referral = CONSTRUCTION_REFERRALS[service.slug];
  if (referral) {
    const referralImage =
      service.slug === "adu"
        ? {
            imageSrc: "/images/services/adu.webp",
            imageAlt:
              "Finished detached ADU guest cottage with matching sage siding beside a Treasure Valley ranch home",
          }
        : service.slug === "room-addition"
          ? {
              imageSrc: "/images/services/room-addition.webp",
              imageAlt:
                "Completed rear room addition on a Boise Bench ranch with matching siding and black-framed slider",
            }
          : {};
    return (
      <InteriorPage kind="services">
        <ServiceReferral
          eyebrow="Referred within the P5 family"
          title={referral.title}
          body={referral.body}
          ctaLabel={referral.ctaLabel}
          ctaHref={referral.ctaHref}
          alsoNote={referral.alsoNote}
          {...referralImage}
        />
      </InteriorPage>
    );
  }

  const path = servicePath(service.slug);
  const isBathroomNearMe = service.slug === 'bathroom-remodel';
  const faqs = content.faqs;
  const images = getServiceImageSet(service.slug);
  const featuredProject = getFeaturedGalleryProject(service.slug);
  const serviceLC = service.name.toLowerCase();

  // Bathroom parent page: no dollar modules. City pages keep costGuidance.
  const sections: LandingSection[] = isBathroomNearMe
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
      links: CITIES.map((c) => ({
        label: `${service.name} in ${c.name}`,
        href: `/services/${service.slug}/${c.slug}`,
      })),
    },
    {
      heading: `Why design-build for your ${serviceLC}`,
      paragraphs: [
        `As a design-build remodeler, we bring design, estimating, permitting, and construction under one contract and one accountable team. That removes the handoffs and finger-pointing that happen when a separate designer and general contractor are involved - and it keeps your ${serviceLC} on a single, coordinated schedule.`,
        `You get a written scope before construction begins, clear allowances for selections, proactive communication throughout the build, and a workmanship guarantee when the project is complete.`,
      ],
    },
  ];

  const schemas = [
    landingBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services' },
      { name: service.name, url: path },
    ]),
    landingServiceSchema(service.name, content.overview),
    landingFAQSchema(faqs),
    generateSpeakableSchema({ path, name: content.headline }),
  ];

  return (
    <InteriorPage kind="services"><>
      <JsonLd data={schemas} />
      <LandingPageTemplate
        h1={content.headline}
        speakableSummary={content.overview}
        overview={content.overview}
        heroImageUrl={SERVICE_SCENES[service.slug]?.src ?? images.hero}
        heroImageAlt={SERVICE_SCENES[service.slug]?.alt}
        breatherImageUrl={images.breather}
        processImageUrl={images.process}
        manifestPath={path}
        planningFrom={isBathroomNearMe ? undefined : service.planningFrom}
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Services', href: '/services' },
          { name: service.name },
        ]}
        benefits={content.benefits}
        inclusions={content.inclusions}
        timeline={isBathroomNearMe ? BATHROOM_NEAR_ME_TIMELINE : content.timeline}
        processSteps={isBathroomNearMe ? BATHROOM_NEAR_ME_PROCESS : content.processSteps}
        sections={sections}
        featuredProject={featuredProject}
        serviceSlug={service.slug}
        showEstimatePrompt
        faqs={faqs}
        related={{ variant: 'service', serviceSlug: service.slug }}
      />
    </></InteriorPage>
  );
}
