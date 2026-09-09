import { notFound } from 'next/navigation';
import { JsonLd } from '@/components/seo/JsonLd';
import { LandingPageTemplate } from '@/components/seo/LandingPageTemplate';
import { buildPageMetadata } from '@/lib/page-metadata';
import {
  landingAreaBusinessSchema,
  landingBreadcrumbs,
  landingFAQSchema,
} from '@/lib/landing-schema';
import { CITY_SEO_DATA } from '@/lib/seo';
import { areaPath, CITY_SLUGS, getCityBySlug } from '@/lib/seo-routes';
import { getCountyLabel, SERVICES } from '@/shared/contentData';
import { AREA_PAGE_FAQS, getAreaIntro } from '@/shared/seoContent';
import { generateSpeakableSchema } from '@/lib/schema';
import { getAreaImageSet } from '@/shared/cityServiceImages';
import type { LandingSection, LandingProof } from '@/components/seo/LandingPageTemplate';
import { getGalleryProjectsForCity } from '@/shared/galleryData';

export function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: { city: string };
}) {
  const cityData = getCityBySlug(params.city);
  if (!cityData) return {};
  return buildPageMetadata({
    kind: 'area',
    cityName: cityData.name,
    citySlug: cityData.slug,
    path: areaPath(cityData.slug),
  });
}

export default function AreaPage({ params }: { params: { city: string } }) {
  const city = getCityBySlug(params.city);
  if (!city) notFound();

  const seo = CITY_SEO_DATA[city.name];
  const county = getCountyLabel(city.county);
  const path = areaPath(city.slug);
  const overview = getAreaIntro(city);
  const images = getAreaImageSet(city.slug);
  const localNote = seo
    ? `We serve ${city.name} homeowners across ${seo.neighborhoods.slice(0, 3).join(', ')}, and all of ${county}. Permits are coordinated through ${county} for projects requiring approval.`
    : `We serve ${city.name} and all of ${county} with design-build remodeling.`;

  const neighborhoods = seo?.neighborhoods ?? [];
  const landmarks = seo?.landmarks ?? [];

  const sections: LandingSection[] = [
    {
      heading: `Remodeling services in ${city.name}`,
      paragraphs: [
        `Boise Remodeling Co is a full-service design-build remodeler serving ${city.name} and the surrounding ${county} area. Whether you are updating a single room or reimagining your whole home, every project runs through one accountable team - from the first in-home consultation and design, through permits, construction, and the final walkthrough.`,
        `Explore the specific services we provide for ${city.name} homeowners below. Each links to a dedicated ${city.name} service page with local details, typical scope, and planning guidance.`,
      ],
      links: SERVICES.map((s) => ({
        label: `${s.name} in ${city.name}`,
        href: `/services/${s.slug}/${city.slug}`,
      })),
    },
    {
      heading: `Neighborhoods and homes we work on in ${city.name}`,
      paragraphs: [
        neighborhoods.length
          ? `We remodel homes throughout ${city.name}, including ${neighborhoods.join(', ')}. Housing stock varies block by block, so our designers tailor layouts, structural plans, and finish selections to the age and style of your specific home.`
          : `We remodel homes throughout ${city.name}, tailoring layouts, structural plans, and finish selections to the age and style of your specific home.`,
        landmarks.length
          ? `As a local team familiar with ${city.name} landmarks like ${landmarks.slice(0, 3).join(', ')}, we understand the area's character and how to design remodels that fit the neighborhood and protect resale value.`
          : `As a local team, we understand the area's character and how to design remodels that fit the neighborhood and protect resale value.`,
      ],
    },
    {
      heading: `Permits and planning in ${county}`,
      paragraphs: [
        `${city.name} projects that change layout, structure, or major systems require permits through ${county}. We build plan review and inspections into the master schedule so timelines stay realistic, and we coordinate submissions, fees, and inspections as part of your design-build contract.`,
        seo?.climate
          ? `Our ${city.name} designs also account for the local ${seo.climate} - from insulation and window upgrades to exterior materials that hold up to freeze-thaw cycles.`
          : `Our designs also account for the local Treasure Valley climate, from insulation and window upgrades to durable exterior materials.`,
      ],
    },
  ];

  // Representative design imagery only, no seeded testimonials or star ratings
  // until genuine, verified reviews exist.
  const cityProjects = getGalleryProjectsForCity(city.slug);
  const proof: LandingProof | undefined =
    cityProjects.length > 0
      ? {
          projects: cityProjects.map((p) => ({
            title: p.title,
            description: p.description,
            beforeImageUrl: p.beforeImageUrl,
            afterImageUrl: p.afterImageUrl,
          })),
        }
      : undefined;

  const h1 = `Remodeling Contractor in ${city.name}, Idaho`;
  const faqs = [
    ...AREA_PAGE_FAQS,
    {
      question: `Do you serve ${city.name}, Idaho?`,
      answer: `Yes. ${city.name} is part of our Treasure Valley service area. We handle kitchen, bathroom, whole-home, and addition projects locally.`,
    },
  ];

  const schemas = [
    landingBreadcrumbs([
      { name: 'Home', url: '/' },
      { name: 'Service Areas', url: '/areas' },
      { name: city.name, url: path },
    ]),
    landingAreaBusinessSchema(city.name),
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
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Service Areas', href: '/areas' },
          { name: city.name },
        ]}
        benefits={[
          `Local experience in ${city.name} and ${county}`,
          'Design-build team, one accountable contact',
          'Written scope before construction',
          'Written workmanship guarantee',
        ]}
        localNote={localNote}
        sections={sections}
        proof={proof}
        proofHeading={`Recent ${city.name} remodeling projects`}
        showEstimatePrompt
        faqs={faqs}
        related={{ variant: 'area', citySlug: city.slug }}
      />
    </>
  );
}
