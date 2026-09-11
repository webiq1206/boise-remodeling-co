import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { LandingPageTemplate } from '@/components/seo/LandingPageTemplate';
import type { LandingProof } from '@/components/seo/LandingPageTemplate';
import { buildPageMetadata, isCityServiceNoindex } from '@/lib/page-metadata';
import {
  landingBreadcrumbs,
  landingFAQSchema,
  landingServiceSchema,
} from '@/lib/landing-schema';
import { CITY_SEO_DATA } from '@/lib/seo';
import {
  cityServicePath,
  getAllCityServiceParams,
  getCityBySlug,
  getServiceBySlug,
} from '@/lib/seo-routes';
import { getCountyLabel } from '@/shared/contentData';
import {
  getCityServiceFaqs,
  getCityServiceIntro,
  getCityServiceSections,
  SERVICE_SEO_CONTENT,
} from '@/shared/seoContent';
import { generateSpeakableSchema } from '@/lib/schema';
import { getCityServiceImageSet } from '@/shared/cityServiceImages';
import { getGalleryProjectsFor } from '@/shared/galleryData';

export function generateStaticParams() {
  return getAllCityServiceParams();
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string; city: string }>;
  }
) {
  const params = await props.params;
  const service = getServiceBySlug(params.slug);
  const city = getCityBySlug(params.city);
  if (!service || !city) return {};
  return buildPageMetadata({
    kind: 'city-service',
    serviceName: service.name,
    serviceSlug: service.slug,
    cityName: city.name,
    citySlug: city.slug,
    path: cityServicePath(service.slug, city.slug),
    noindex: isCityServiceNoindex(service.slug, city.slug),
  });
}

export default async function CityServicePage(
  props: {
    params: Promise<{ slug: string; city: string }>;
  }
) {
  const params = await props.params;
  const service = getServiceBySlug(params.slug);
  const city = getCityBySlug(params.city);
  const content = SERVICE_SEO_CONTENT[params.slug];
  if (!service || !city || !content) notFound();

  const path = cityServicePath(service.slug, city.slug);
  const seo = CITY_SEO_DATA[city.name];
  const county = getCountyLabel(city.county);
  const neighborhood = seo?.neighborhoods[0];
  const localFact = neighborhood
    ? `Homes near ${neighborhood} and across ${city.name} often need layouts that respect ${county} codes and local inspection timelines.`
    : undefined;

  const overview = getCityServiceIntro(content, city, localFact);
  const h1 = `${service.name} in ${city.name}, Idaho`;
  const faqs = getCityServiceFaqs(content, city);
  const localNote = `Permitting for ${content.name.toLowerCase()} projects in ${city.name} runs through ${county}. We build permit timelines into your schedule from day one.`;
  const images = getCityServiceImageSet(service.slug, city.slug);
  const sections = getCityServiceSections(content, city, seo);

  // Real before/after projects only. Written testimonials stay hidden until we
  // have genuine, verified reviews (no seeded quotes or star ratings).
  const matchedProjects = getGalleryProjectsFor(service.slug, city.slug);
  const proof: LandingProof | undefined =
    matchedProjects.length > 0
      ? {
          projects: matchedProjects.map((p) => ({
            title: p.title,
            description: p.description,
            beforeImageUrl: p.beforeImageUrl,
            afterImageUrl: p.afterImageUrl,
          })),
        }
      : undefined;

  const schemas = [
    landingBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services' },
      { name: service.name, url: `/services/${service.slug}` },
      { name: `${city.name}, ID`, url: path },
    ]),
    landingServiceSchema(service.name, overview, city.name),
    landingFAQSchema(faqs),
    generateSpeakableSchema({ path, name: h1 }),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <LandingPageTemplate
        h1={h1}
        speakableSummary={overview}
        overview={overview}
        heroImageUrl={images.hero}
        breatherImageUrl={images.breather}
        processImageUrl={images.process}
        manifestPath={path}
        planningFrom={service.planningFrom}
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: service.name, href: `/services/${service.slug}` },
          { name: `${city.name}, Idaho` },
        ]}
        benefits={content.benefits}
        inclusions={content.inclusions}
        timeline={content.timeline}
        processSteps={content.processSteps}
        localNote={localNote}
        sections={sections}
        proof={proof}
        proofHeading={`Recent ${city.name} ${service.name.toLowerCase()} work`}
        showEstimatePrompt
        faqs={faqs}
        related={{
          variant: 'city-service',
          serviceSlug: service.slug,
          citySlug: city.slug,
        }}
      />
    </>
  );
}
