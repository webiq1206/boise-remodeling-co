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
import { areaPageServiceHref } from '@/lib/siteUrls';
import { permitGuidance, permitSource } from '@/lib/permitGuidance';
import { generateSpeakableSchema, generateWebPageSchema } from '@/lib/schema';
import { CITY_SEO_DATA } from '@/lib/seo';
import { areaPath,CITY_SLUGS,getCityBySlug } from '@/lib/seo-routes';
import { getAreaImageSet } from '@/shared/cityServiceImages';
import { getCountyLabel,SERVICES } from '@/shared/contentData';
import { getGalleryProjectsForCity } from '@/shared/galleryData';
import { AREA_CITY_COPY } from '@/shared/content/areaCopy';
import {
  GARDEN_CITY_DESCRIPTION,
  GARDEN_CITY_FAQS,
  GARDEN_CITY_H1,
  GARDEN_CITY_LOCAL_NOTE,
  GARDEN_CITY_OVERVIEW,
  GARDEN_CITY_SERVICE_LINKS,
} from '@/shared/content/gardenCityArea';
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
  const isGardenCity = city.slug === 'garden-city';
  const answerFirst = new Set(['eagle', 'boise', 'nampa', 'kuna', 'meridian']).has(city.slug)
    ? `${publishFoundingCopy(`Boise Remodeling Co is a design-build remodeling contractor in ${city.name}, founded in 2020 and part of P5. A free in-home visit includes a written scope and a workmanship guarantee. The first figures are budget ranges, not quotes.`)} `
    : '';
  const overview = isGardenCity ? GARDEN_CITY_OVERVIEW : publishFoundingCopy(`${answerFirst}${getAreaIntro(city)}`);
  const images = getAreaImageSet(city.slug);
  const localNote = isGardenCity
    ? GARDEN_CITY_LOCAL_NOTE
    : seo
    ? `We serve ${city.name} homeowners across ${seo.neighborhoods.slice(0, 3).join(', ')}, and all of ${county}. Confirm the permitting authority for the project address before applying.`
    : `We serve ${city.name} and all of ${county} with design-build remodeling.`;

  const neighborhoods = seo?.neighborhoods ?? [];
  const landmarks = seo?.landmarks ?? [];
  const cityCopy = AREA_CITY_COPY[city.slug];

  const gardenSections: LandingSection[] = [
    {
      heading: 'Remodeling services in Garden City',
      paragraphs: [
        'Boise Remodeling Co is a full-service design-build remodeler serving Garden City and the surrounding Ada County area. Whether you are updating a single room or reimagining your whole home, every project runs through one accountable team, from the first in-home visit and design, through permits, construction, and the final walkthrough.',
        'For how each service works across the whole valley, use the parent service pages.',
      ],
      links: [...GARDEN_CITY_SERVICE_LINKS],
    },
    {
      heading: 'Neighborhoods and homes we work on in Garden City',
      paragraphs: [
        {
          text: 'Garden City is its own city in Ada County, nearly surrounded by Boise, with the Boise River and the',
          link: { label: 'Greenbelt', href: 'https://gardencityidaho.org/greenbelt-pathway/' },
          after: ' running through town and Chinden Boulevard as the main street.',
        },
        {
          text: 'North of the river, Riverside Village and The Plantation, near The River Club golf course, have many homes from the 1980s and 1990s that are ready for a kitchen, bath or whole-home update. South of the river, the Marigold and Glenwood area has mostly 1980s and 1990s homes on smaller lots. Most recent new construction has been townhomes, including rows near the',
          link: { label: 'Surel Mitchell Live-Work-Create District', href: 'https://gardencityidaho.org/surel-mitchell-live-work-create-district/' },
          after: ' on the east end.',
        },
        'Housing stock varies block by block, so layouts, structural plans and finish selections follow the age and style of the home in front of us, including compact townhome plans and established riverside houses.',
      ],
    },
    {
      heading: 'Permits and planning in Garden City',
      paragraphs: [
        'Garden City issues building permits through its own Development Services department, separate from Boise, so confirm your address is inside city limits before you apply. Trade permits for plumbing, electrical and mechanical work go through the State of Idaho. Development Services also handles floodplain questions for riverside lots. Which permits, inspections and review timing apply to your remodel should be confirmed with the city for the actual address.',
        'We confirm the required submissions and inspection steps for your scope, then account for them in the project schedule. Additions and outdoor living near the Boise River or the Greenbelt can have extra setback and review rules; we flag those during design and confirm them with the city.',
        "Our Garden City designs also account for the valley's hot summers and cold winters, from insulation and window upgrades to exterior materials that hold up to freeze-thaw cycles.",
        {
          text: 'For valley-wide context, see the',
          link: { label: 'Ada and Canyon County permit flow', href: '/resources/ada-canyon-permit-flow' },
          after: '.',
        },
      ],
    },
    {
      heading: 'Inside a remodel in Garden City',
      subsections: [
        { heading: 'Garden City kitchen', paragraphs: ['A layout, storage and lighting plan that fits an established riverside kitchen or a compact townhome.'] },
        { heading: 'Garden City bathroom', paragraphs: ['Showers, vanities, tile and waterproofing sized to the room you have.'] },
        { heading: 'Garden City addition or outdoor living', paragraphs: ['A buildable layout depends on the existing home, the site and, on riverside lots, what the city confirms for setbacks and floodplain review.'] },
        { heading: 'Whole-home remodel', paragraphs: ['Coordinated finishes and connected living spaces, under one schedule.'] },
      ],
    },
  ];

  const sections: LandingSection[] = isGardenCity ? gardenSections : [
    {
      heading: `Remodeling services in ${city.name}`,
      paragraphs: [
        `Boise Remodeling Co is a full-service design-build remodeler serving ${city.name} and the surrounding ${county} area. Whether you are updating a single room or reimagining your whole home, every project runs through one accountable team - from the first in-home consultation and design, through permits, construction, and the final walkthrough.`,
        `Explore the specific services we provide for ${city.name} homeowners below. Each links to a dedicated ${city.name} service page with local details, typical scope, and planning guidance.`,
        city.slug === 'boise'
          ? 'Kitchen remodeling, bathroom remodeling and whole-home remodeling are listed with the Boise services below. All three stay design-build, with a written scope before construction.'
          : `For how each service works across the whole valley, see kitchen remodeling, bathroom remodeling and whole-home remodeling at the end of the list.`,
      ],
      links: [
        // Same index rule as the sitemap: a noindexed combo is not linked.
        ...SERVICES.map((s) => {
          const href = areaPageServiceHref(s.slug, city.slug);
          return { label: `${s.name} in ${city.name}`, href: href === path ? `/services/${s.slug}` : href };
        }),
        ...(city.slug === 'boise' ? [{ label: 'home remodeling in Boise', href: '/' }] : []),
        // Phase 4: the money service pages, with service anchors, from every
        // area page, so the parents take the generic terms back from this page.
        { label: 'Kitchen remodeling', href: '/services/kitchen-remodel' },
        { label: 'Bathroom remodeling', href: '/services/bathroom-remodel' },
        { label: 'Whole-home remodeling', href: '/services/whole-home-remodel' },
        { label: 'Room additions and bump-outs', href: '/services/room-addition' },
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

  const h1 = isGardenCity
    ? GARDEN_CITY_H1
    : city.slug === 'boise'
      ? "Remodeling homes across Boise's neighborhoods"
      : city.slug === 'eagle'
        ? 'Home remodeling in Eagle, Idaho'
        : city.slug === 'kuna'
          ? 'Home remodeling in Kuna, Idaho'
          : new Set(['nampa', 'meridian']).has(city.slug)
            ? `Remodeling contractors in ${city.name}, Idaho`
            : `Remodeling contractor in ${city.name}, Idaho`;
  const faqs = isGardenCity ? GARDEN_CITY_FAQS : cityCopy?.faqs ?? [
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
    ...(isGardenCity
      ? [generateWebPageSchema({ title: GARDEN_CITY_H1, description: GARDEN_CITY_DESCRIPTION, url: path })]
      : []),
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
        benefits={isGardenCity ? [
          'Local experience in Garden City and Ada County',
          'Design-build team, one accountable contact',
          'Written scope before construction',
        ] : [
          `Local experience in ${city.name} and ${county}`,
          'Design-build team, one accountable contact',
          'Written scope before construction',
          'Written workmanship guarantee',
        ]}
        localNote={localNote}
        inclusions={isGardenCity ? [
          'Kitchen remodeling in Garden City: layout, cabinetry, surfaces and lighting',
          'Bathroom remodeling in Garden City: showers, vanities, tile and waterproofing',
          'Whole-home remodeling across Garden City: one coordinated plan and schedule',
          'Room additions, basements and outdoor living where the home allows',
          'Garden City permits, inspections and scheduling handled in-house',
        ] : [
          `Kitchen remodeling in ${city.name}: layout, cabinetry, surfaces and lighting`,
          `Bathroom remodeling in ${city.name}: showers, vanities, tile and waterproofing`,
          `Whole-home remodeling across ${city.name}: one coordinated plan and schedule`,
          'Room additions, basements and outdoor living where the home allows',
          `${county} permits, inspections and scheduling handled in-house`,
        ]}
        sections={sections}
        proof={proof}
        proofHeading={`Recent ${city.name} remodeling projects`}
        showEstimatePrompt
        faqs={faqs}
        subject={{ noun: 'remodel', place: city.name }}
        related={{ variant: 'area', citySlug: city.slug }}
      />
    </></InteriorPage>
  );
}
