import { InteriorPage } from '@/components/approved/InteriorLayout';
import { JsonLd } from '@/components/seo/JsonLd';
import type { LandingProof,LandingSection } from '@/components/seo/LandingPageTemplate';
import { LandingPageTemplate } from '@/components/seo/LandingPageTemplate';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { publishFoundingCopy } from '@/shared/publicClaims';
import {
landingAreaBusinessSchema,
landingBreadcrumbs,
landingFAQSchema,
} from '@/lib/landing-schema';
import { buildPageMetadata } from '@/lib/page-metadata';
import { isIndexedPath } from '@/lib/siteUrls';
import { permitGuidance, permitSource } from '@/lib/permitGuidance';
import { generateSpeakableSchema } from '@/lib/schema';
import { CITY_SEO_DATA } from '@/lib/seo';
import { areaPath,CITY_SLUGS,getCityBySlug } from '@/lib/seo-routes';
import { getAreaImageSet } from '@/shared/cityServiceImages';
import { getCountyLabel,SERVICES } from '@/shared/contentData';
import { getGalleryProjectsForCity } from '@/shared/galleryData';
import { AREA_CITY_COPY } from '@/shared/content/areaCopy';
import { AREA_PAGE_FAQS,getAreaIntro } from '@/shared/seoContent';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return CITY_SLUGS.map((city) => ({ city }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ city: string }>;
  }
) {
  const params = await props.params;
  const cityData = getCityBySlug(params.city);
  if (!cityData) return {};
  return withBrandPageMetadata(await (buildPageMetadata({
    kind: 'area',
    cityName: cityData.name,
    citySlug: cityData.slug,
    path: areaPath(cityData.slug),
  })), "/areas/[city]");
}

export default async function AreaPage(props: { params: Promise<{ city: string }> }) {
  const params = await props.params;
  const city = getCityBySlug(params.city);
  if (!city) notFound();

  const seo = CITY_SEO_DATA[city.name];
  const county = getCountyLabel(city.county);
  const path = areaPath(city.slug);
  const answerFirst = new Set(['eagle', 'boise', 'nampa', 'kuna', 'meridian']).has(city.slug)
    ? `${publishFoundingCopy(`Boise Remodeling Co is a design-build remodeling contractor in ${city.name}, founded in 2020 and part of P5. A free in-home visit includes a written scope and a workmanship guarantee. The first figures are budget ranges, not quotes.`)} `
    : '';
  const overview = publishFoundingCopy(`${answerFirst}${getAreaIntro(city)}`);
  const images = getAreaImageSet(city.slug);
  const localNote = seo
    ? `We serve ${city.name} homeowners across ${seo.neighborhoods.slice(0, 3).join(', ')}, and all of ${county}. Confirm the permitting authority for the project address before applying.`
    : `We serve ${city.name} and all of ${county} with design-build remodeling.`;

  const neighborhoods = seo?.neighborhoods ?? [];
  const landmarks = seo?.landmarks ?? [];
  const cityCopy = AREA_CITY_COPY[city.slug];

  const sections: LandingSection[] = [
    {
      heading: `Remodeling services in ${city.name}`,
      paragraphs: [
        `Boise Remodeling Co is a full-service design-build remodeler serving ${city.name} and the surrounding ${county} area. Whether you are updating a single room or reimagining your whole home, every project runs through one accountable team - from the first in-home consultation and design, through permits, construction, and the final walkthrough.`,
        `Explore the specific services we provide for ${city.name} homeowners below. Each links to a dedicated ${city.name} service page with local details, typical scope, and planning guidance.`,
        ...(city.slug === 'boise'
          ? ['Kitchen remodeling and bathroom remodeling are listed with the Boise services below. Both stay design-build, with a written scope before construction.']
          : []),
      ],
      links: [
        // Same index rule as the sitemap: a noindexed combo is not linked.
        ...SERVICES.map((s) => ({
          label: `${s.name} in ${city.name}`,
          href: `/services/${s.slug}/${city.slug}`,
        })).filter((link) => isIndexedPath(link.href)),
        { label: city.slug === 'boise' ? 'Kitchen remodeling' : 'Kitchen remodel', href: '/services/kitchen-remodel' },
        { label: city.slug === 'boise' ? 'Bathroom remodeling' : 'Bathroom remodel', href: '/services/bathroom-remodel' },
        { label: 'Room addition', href: '/services/room-addition' },
      ],
    },
    {
      heading: `Neighborhoods and homes we work on in ${city.name}`,
      paragraphs: [
        neighborhoods.length
          ? `We remodel homes throughout ${city.name}, including ${neighborhoods.join(', ')}. Housing stock varies block by block, so our designers tailor layouts, structural plans, and finish selections to the age and style of your specific home.`
          : `We remodel homes throughout ${city.name}, tailoring layouts, structural plans, and finish selections to the age and style of your specific home.`,
        ...(cityCopy?.creekNote ? [cityCopy.creekNote] : []),
        landmarks.length
          ? `As a local team familiar with ${city.name} landmarks like ${landmarks.slice(0, 3).join(', ')}, we understand the area's character and how to design remodels that fit the neighborhood and protect resale value.`
          : `As a local team, we understand the area's character and how to design remodels that fit the neighborhood and protect resale value.`,
      ],
    },
    {
      heading: `Permits and planning in ${city.name}`,
      links: permitSource(city.name)
        ? [{ label: `Official ${city.name} permit guidance`, href: permitSource(city.name)! }]
        : undefined,
      paragraphs: [
        permitGuidance(city.name),
        'We confirm the required submissions and inspection steps for your scope, then account for them in the project schedule.',
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
            serviceType: p.serviceType,
          })),
        }
      : undefined;

  const h1 = new Set(['eagle', 'boise', 'nampa', 'kuna', 'meridian']).has(city.slug)
    ? `Remodeling contractors in ${city.name}, Idaho`
    : `Remodeling contractor in ${city.name}, Idaho`;
  const faqs = cityCopy?.faqs ?? [
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
    <InteriorPage kind="areas"><>
      <JsonLd data={schemas} />
      <LandingPageTemplate
        h1={h1}
        speakableSummary={overview}
        overview={overview}
        heroImageUrl={images.hero}
        breatherImageUrl={images.breather}
        processImageUrl={images.process}
        imageSubject="general"
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
    </></InteriorPage>
  );
}
