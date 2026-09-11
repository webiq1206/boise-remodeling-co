import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  LandingPageTemplate,
  type LandingSection,
} from '@/components/seo/LandingPageTemplate';
import { buildPageMetadata } from '@/lib/page-metadata';
import {
  landingBreadcrumbs,
  landingFAQSchema,
  landingServiceSchema,
  landingSpeakable,
} from '@/lib/landing-schema';
import { SERVICE_SLUGS, getServiceBySlug, servicePath } from '@/lib/seo-routes';
import { SERVICE_SEO_CONTENT } from '@/shared/seoContent';
import { generateSpeakableSchema } from '@/lib/schema';
import { getServiceImageSet } from '@/shared/serviceBackgrounds';
import { CITIES } from '@/shared/contentData';
import { getFeaturedGalleryProject } from '@/shared/galleryData';

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
  return buildPageMetadata({
    kind: 'service',
    serviceName: service.name,
    serviceSlug: service.slug,
    path: servicePath(service.slug),
  });
}

export default async function ServicePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const service = getServiceBySlug(params.slug);
  const content = SERVICE_SEO_CONTENT[params.slug];
  if (!service || !content) notFound();

  const path = servicePath(service.slug);
  const faqs = content.faqs;
  const images = getServiceImageSet(service.slug);
  const featuredProject = getFeaturedGalleryProject(service.slug);
  const serviceLC = service.name.toLowerCase();

  const sections: LandingSection[] = [
    ...(content.costGuidance
      ? [
          {
            heading: content.costGuidance.heading,
            paragraphs: content.costGuidance.paragraphs,
            links: [
              { label: 'Boise Remodeling Cost Guide', href: '/guides/boise-remodeling-cost-guide' },
              { label: 'Get your planning range', href: '/#calculator' },
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
    <>
      <JsonLd data={schemas} />
      <LandingPageTemplate
        h1={content.headline}
        speakableSummary={content.overview}
        overview={content.overview}
        heroImageUrl={images.hero}
        breatherImageUrl={images.breather}
        processImageUrl={images.process}
        manifestPath={path}
        planningFrom={service.planningFrom}
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Services', href: '/services' },
          { name: service.name },
        ]}
        benefits={content.benefits}
        inclusions={content.inclusions}
        timeline={content.timeline}
        processSteps={content.processSteps}
        sections={sections}
        featuredProject={featuredProject}
        showEstimatePrompt
        faqs={faqs}
        related={{ variant: 'service', serviceSlug: service.slug }}
      />
    </>
  );
}
