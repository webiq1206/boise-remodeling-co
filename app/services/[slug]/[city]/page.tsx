import { InteriorPage } from '@/components/approved/InteriorLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import type { LandingProof } from '@/components/seo/LandingPageTemplate';
import { LandingPageTemplate } from '@/components/seo/LandingPageTemplate';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import {
landingBreadcrumbs,
landingFAQSchema,
landingServiceSchema,
} from '@/lib/landing-schema';
import { buildPageMetadata,isCityServiceNoindex } from '@/lib/page-metadata';
import { generateSpeakableSchema } from '@/lib/schema';
import { CITY_SEO_DATA } from '@/lib/seo';
import {
cityServicePath,
getAllCityServiceParams,
getCityBySlug,
getServiceBySlug,
} from '@/lib/seo-routes';
import { getCityServiceImageSet } from '@/shared/cityServiceImages';
import { getCountyLabel } from '@/shared/contentData';
import { getGalleryProjectsFor } from '@/shared/galleryData';
import {
getCityServiceFaqs,
getCityServiceIntro,
getCityServiceSections,
SERVICE_SEO_CONTENT,
} from '@/shared/seoContent';
import { notFound } from 'next/navigation';

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
  return withBrandPageMetadata(await (buildPageMetadata({
    kind: 'city-service',
    serviceName: service.name,
    serviceSlug: service.slug,
    cityName: city.name,
    citySlug: city.slug,
    path: cityServicePath(service.slug, city.slug),
    noindex: isCityServiceNoindex(service.slug, city.slug),
  })), "/services/[slug]/[city]");
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
  const localNote = `For ${content.name.toLowerCase()} in ${city.name}, confirm the property jurisdiction and scope before applying. City addresses and unincorporated county parcels may use different building departments. Confirm required building and trade permits, inspections and review times for the actual address.`;
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
    <InteriorPage kind="services"><>
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
    </></InteriorPage>
  );
}
