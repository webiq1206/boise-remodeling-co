import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Section } from '@/components/marketing/Section';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Reveal } from '@/components/Reveal';
import { JsonLd } from '@/components/seo/JsonLd';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { ConsultCTA } from '@/components/modals/ConsultCTA';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { PageHeroBand } from '@/components/sections/PageHeroBand';
import { AreaCard } from '@/components/marketing/AreaCard';
import { SERVICES, CITIES } from '@/shared/contentData';
import { servicePath } from '@/lib/seo-routes';
import { getServiceBackground } from '@/shared/serviceBackgrounds';
import { CITY_HERO_IMAGES } from '@/shared/cityServiceImages';
import { SITE_IMAGES } from '@/shared/siteImages';
import { buildCanonical, FEED_ALTERNATES } from '@/lib/page-metadata';
import { getBaseUrl } from '@/lib/seo';
import { generateBreadcrumbSchema } from '@/lib/schema';
import { CTA_PRIMARY, CTA_SECONDARY } from '@/shared/ctaCopy';

const TITLE = 'Remodeling Services | Treasure Valley';
const DESCRIPTION =
  'Design-build remodeling in Boise, Meridian, Eagle, Nampa and the Treasure Valley. Kitchen, bathroom, whole-home, addition, and ADU projects under one accountable team.';

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | Boise Remodeling Co` },
  description: DESCRIPTION,
  alternates: { canonical: buildCanonical('/services'), types: FEED_ALTERNATES },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonical('/services'),
    type: 'website',
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'Boise Remodeling Co' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/images/og-default.png'],
  },
};

export default function ServicesIndexPage() {
  const base = getBaseUrl().replace(/\/$/, '');
  const [lead, ...rest] = SERVICES;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Services', url: '/services' },
  ]);

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Remodeling Services',
    itemListElement: SERVICES.map((service, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: service.name,
      url: `${base}${servicePath(service.slug)}`,
    })),
  };

  return (
    <>
      <JsonLd data={[breadcrumbSchema, itemListSchema]} />

      <PageHeroBand
        imageSrc={SITE_IMAGES.statementBand}
        imageAlt="Remodeled Treasure Valley great room with warm finishes and natural light"
      >
        <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Services' }]} />
        <p className="ed-eyebrow mt-8" style={{ color: 'rgb(255 255 255 / 0.72)' }}>Our services</p>
        <h1 className="ed-display ed-statement-display text-inverse-foreground">
          Design-build expertise for every major{' '}
          <em className="not-italic" style={{ color: 'var(--ed-accent)' }}>remodel</em>
        </h1>
        <p className="ed-lede mt-8 max-w-[44ch] text-inverse-foreground/85">
          One accountable team handles design, estimating, permitting and construction under a
          single contract, from the first in-home visit through the final walkthrough.
        </p>
      </PageHeroBand>

      {/* WAS seven identical cards in a three-column grid with 16px names - the
          arrangement the redesign brief singles out. NOW the same lead-panel-plus-
          index the homepage uses, so a homeowner who arrives from the homepage
          recognises the pattern, and one who lands cold can scan every service and
          its planning-from figure down a single column. */}
      <Section surface="dark" spacing="xl">
        <div className="ed-shell">
          {lead && (
            <Reveal>
              <Link
                href={servicePath(lead.slug)}
                className="ed-zoom group grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]"
                style={{ border: '1px solid var(--ed-line)' }}
              >
                <div className="relative min-h-[clamp(280px,38vw,460px)] overflow-hidden">
                  <Image
                    src={getServiceBackground(lead.slug)}
                    alt={`${lead.name} project by Boise Remodeling Co`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    quality={72}
                    className="object-cover img-brand-grade"
                  />
                </div>
                <div className="flex flex-col justify-center p-[clamp(28px,3.4vw,56px)]">
                  <p className="ed-eyebrow ed-eyebrow-accent">Most requested</p>
                  <h2 className="ed-h2-sm">{lead.name}</h2>
                  <p className="ed-body mt-5">{lead.shortDescription}</p>
                  <p className="ed-small mt-7 flex items-baseline gap-3">
                    <span className="uppercase tracking-[0.16em]">Planning from</span>
                    <span className="brc-display-num text-[1.75rem] leading-none" style={{ color: 'var(--ed-ink)' }}>
                      {lead.planningFrom}
                    </span>
                  </p>
                  <span className="ed-link ed-link-accent mt-8 self-start">
                    Explore {lead.name.toLowerCase()}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </Reveal>
          )}

          <div className="ed-steps mt-[clamp(40px,5vw,72px)]">
            {rest.map((service, i) => (
              <Reveal key={service.slug} delay={Math.min(i, 5) * 40}>
                <Link
                  href={servicePath(service.slug)}
                  className="group grid items-baseline gap-x-8 gap-y-2 py-[clamp(20px,2.4vw,30px)] md:grid-cols-[minmax(210px,0.9fr)_1.6fr_auto_28px]"
                  style={{ borderBottom: '1px solid var(--ed-line)' }}
                >
                  <h2 className="ed-h3 transition-colors group-hover:[color:var(--ed-accent)]">{service.name}</h2>
                  <p className="ed-body max-w-none">{service.shortDescription}</p>
                  <p className="ed-small flex items-baseline gap-2 whitespace-nowrap">
                    <span className="uppercase tracking-[0.16em]">From</span>
                    <span className="brc-display-num text-[1.25rem] leading-none" style={{ color: 'var(--ed-ink)' }}>
                      {service.planningFrom}
                    </span>
                  </p>
                  <ArrowRight className="hidden h-4 w-4 transition-transform group-hover:translate-x-1 md:block" aria-hidden="true" />
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="ed-inset mt-[clamp(40px,5vw,72px)] flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="ed-eyebrow">Not sure where to start</p>
                <p className="ed-h3 max-w-[24ch]">
                  Tell us about your{' '}
                  <em className="not-italic" style={{ color: 'var(--ed-accent)' }}>project</em>
                </p>
                <p className="ed-body mt-4">
                  Every remodel starts with a free in-home visit and an honest planning range, with no obligation.
                </p>
              </div>
              <div className="flex flex-shrink-0 flex-col gap-4 sm:flex-row sm:items-center">
                <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
                <ConsultCTA variant="brandOutline">{CTA_SECONDARY}</ConsultCTA>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>

      <EstimatePromptBand
        title={
          <>
            Know your range before you{' '}
            <em className="not-italic" style={{ color: 'var(--ed-accent)' }}>commit</em>
          </>
        }
        description="Use our Treasure Valley project estimator to see a realistic planning range for kitchen, bath, whole-home and addition work - then book a free visit when you're ready."
      />

      <Section surface="deep" spacing="xl" edge>
        <div className="ed-shell">
          <div className="ed-split ed-split-end">
            <Reveal>
              <p className="ed-eyebrow">Treasure Valley</p>
              <h2 className="ed-h2 ed-statement-wide">
                Serving communities across the{' '}
                <em className="not-italic" style={{ color: 'var(--ed-accent)' }}>valley</em>
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <p className="ed-body">
                Permit paths, housing stock and HOA requirements differ between Ada and Canyon
                County communities. Choose your city for local guidance.
              </p>
            </Reveal>
          </div>
          <div className="mt-[clamp(40px,5vw,72px)] grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CITIES.map((city, i) => (
              <Reveal key={city.slug} delay={Math.min(i, 7) * 40}>
                <AreaCard city={city} imageSrc={CITY_HERO_IMAGES[city.slug]} />
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      <Section surface="gradient" spacing="lg" edge>
        <div className="ed-shell">
          <div className="ed-split ed-split-center">
            <h2 className="ed-h2 ed-statement">
              Ready to plan your{' '}
              <em className="not-italic" style={{ color: 'var(--ed-accent)' }}>remodel</em>?
            </h2>
            <div>
              <p className="ed-body">
                Book a free in-home visit or get an instant planning range for your project.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
                <ConsultCTA variant="brandOutline">{CTA_SECONDARY}</ConsultCTA>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
