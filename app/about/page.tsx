import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/JsonLd';
import Image from 'next/image';
import { DisplayNum, formatStepNumber, Section } from '@/components/marketing';
import { SectionHeader } from '@/components/marketing/SectionHeader';
import { Hairline } from '@/components/marketing/Hairline';
import { SITE_IMAGES } from '@/shared/siteImages';
import { MarketingCard } from '@/components/marketing/MarketingCard';
import { Reveal } from '@/components/Reveal';
import { WhyChooseUsSection } from '@/components/sections/WhyChooseUsSection';
import { StatementBandSection } from '@/components/sections/StatementBandSection';
import { buildPageMetadata } from '@/lib/page-metadata';
import {
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateSpeakableSchema,
  generateWebPageSchema,
} from '@/lib/schema';
import { CITIES, TREASURE_VALLEY_CITIES } from '@/shared/contentData';
import { HERO_STATS, PRINCIPLES, TRUST_ITEMS } from '@/shared/siteContent';
import { CTA_PRIMARY, CTA_SECONDARY } from '@/shared/ctaCopy';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { AreaCard } from '@/components/marketing/AreaCard';
import { CITY_HERO_IMAGES } from '@/shared/cityServiceImages';
import { ConsultCTA } from '@/components/modals/ConsultCTA';
import { GRAIN_URL } from '@/lib/grain';

const SPEAKABLE_SUMMARY =
  'We are a locally owned design-build remodeling company serving the Treasure Valley. Our focus is clarity: written scope before construction, proactive weekly updates, permits handled in-house for Ada and Canyon County, and a written workmanship guarantee on our labor.';

function HeroBreadcrumbs() {
  const items = [
    { name: 'Home', href: '/' },
    { name: 'About' },
  ];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-inverse-foreground/80">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.name} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-inverse-foreground transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span className={isLast ? 'text-inverse-foreground font-normal' : ''}>
                  {item.name}
                </span>
              )}
              {!isLast && (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-40" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StatCard({ num, label }: { num: string; label: string }) {
  return (
    <div className="px-3 py-3 md:px-6 md:py-5 rounded-sm bg-inverse/50 border border-inverse-foreground/20 backdrop-blur-md">
      <DisplayNum className="text-inverse-foreground text-lg md:text-3xl leading-none">
        {num}
      </DisplayNum>
      <div className="mt-1 md:mt-1.5 text-[9px] md:text-[11px] tracking-[0.08em] md:tracking-[0.1em] uppercase text-inverse-foreground/85 leading-snug">
        {label}
      </div>
    </div>
  );
}

export const metadata = buildPageMetadata({
  kind: 'about',
  path: '/about',
});

export default function AboutPage() {
  const schemas = [
    generateOrganizationSchema(),
    generateWebPageSchema({
      title: 'About Boise Remodeling Co',
      description:
        'Treasure Valley design-build remodeling company. Licensed, insured, and committed to clear communication.',
      url: '/about',
    }),
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'About', url: '/about' },
    ]),
    generateSpeakableSchema({ path: '/about', name: 'About Boise Remodeling Co' }),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <div className="flex flex-col pb-20 md:pb-0">
        {/* ─── Cinematic hero ─── */}
        <section className="relative min-h-[540px] md:min-h-[78vh] flex items-end overflow-hidden bg-inverse">
          <Image
            src={SITE_IMAGES.leadership}
            alt="Boise Remodeling Co design-build team at a finished kitchen project"
            fill
            className="object-cover opacity-[0.82] img-brand-grade"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/90 via-inverse/60 to-transparent" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/60 via-inverse/15 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-44 pointer-events-none bg-gradient-to-b from-inverse/70 via-inverse/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }}
          />

          <div className="relative z-10 w-full container px-4 pb-14 md:pb-20 pt-10 fade-up">
            <HeroBreadcrumbs />
            <p data-speakable="summary" className="sr-only">
              {SPEAKABLE_SUMMARY}
            </p>
            <div className="brc-label brc-label-on-photo mt-6 mb-5">About us</div>
            <h1 className="font-sans font-light text-display tracking-tight text-inverse-foreground max-w-4xl mb-6">
              About Boise Remodeling{' '}
              <em className="brc-accent">Co</em>
            </h1>
            <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-4">
              We are a locally owned design-build remodeling company serving the Treasure Valley.
              Homeowners work with one accountable team from first in-home visit through final
              walkthrough.
            </p>
            <p className="text-base md:text-lg text-inverse-foreground/75 max-w-2xl leading-relaxed mb-8">
              Our focus is clarity: written scope before construction, proactive weekly updates,
              permits handled in-house for Ada and Canyon County, and a written workmanship
              guarantee on our labor. Every detail, every decision - handled with intention.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <EstimateCTA variant="brand">
                {CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
              </EstimateCTA>
              <ConsultCTA variant="heroGhost">{CTA_SECONDARY}</ConsultCTA>
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {HERO_STATS.map((stat) => (
                <StatCard key={stat.num} num={stat.num} label={stat.label} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── Design-build split ─── */}
        <Section variant="greige" spacing="none" divider className="p-0">
          <div id="team" className="grid md:grid-cols-2 overflow-hidden scroll-mt-24">
            <div className="relative min-h-[260px] md:min-h-[520px] overflow-hidden bg-inverse">
              <Image
                src={SITE_IMAGES.process}
                alt="Architectural blueprints and finish material samples for a Treasure Valley remodel"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover img-brand-grade"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-primary/60" />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.028 }}
              />
              <div className="absolute bottom-0 left-0 p-8 md:p-12">
                <div className="brc-label brc-label-on-photo mb-3">Design-build, explained</div>
                <p className="font-sans font-light text-xl md:text-2xl text-inverse-foreground">
                  One team from
                  <br />
                  concept to completion
                </p>
              </div>
            </div>

            <div className="section-y-sm px-8 md:px-14 lg:px-16 bg-card border-l border-border">
              <Reveal>
                <SectionHeader
                  eyebrow="Our model"
                  title={
                    <>
                      Design-build,{' '}
                      <em className="brc-accent">explained</em>
                    </>
                  }
                  description="Design-build means your designer, estimator, and construction lead work together under one roof. Layout, selections, permits, and schedule stay aligned so your kitchen, bathroom, whole-home, or addition project does not drift between vendors."
                  className="mb-8 max-w-none"
                />
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                  Idaho contractor license information is available upon request. We are bonded and
                  insured for residential remodeling work across the Treasure Valley.
                </p>
                <ul className="grid sm:grid-cols-2 gap-3">
                  {TRUST_ITEMS.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="brc-label text-muted-foreground mb-3">Our commitment</div>
                  <h3 className="font-sans font-normal text-base text-foreground mb-2">
                    One accountable team
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Boise Remodeling Co has run design-build remodels across the Treasure Valley
                    since 2020. One team leads every project from the first in-home visit through
                    Ada and Canyon County permitting to the final walkthrough, and stands behind a
                    written scope before construction and a workmanship guarantee on our labor.
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                    New to remodeling? Start with our guide to{' '}
                    <Link
                      href="/guides/choose-remodeling-contractor-boise"
                      className="text-foreground underline underline-offset-2 hover:text-accent-legible"
                    >
                      choosing a remodeling contractor in Boise
                    </Link>{' '}
                    or explore our most requested service,{' '}
                    <Link
                      href="/services/kitchen-remodel"
                      className="text-foreground underline underline-offset-2 hover:text-accent-legible"
                    >
                      kitchen remodeling in Boise
                    </Link>
                    .
                  </p>
                </div>
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="brc-label text-muted-foreground mb-3">Where your money goes</div>
                  <h3 className="font-sans font-normal text-base text-foreground mb-2">
                    Don't pay for a contractor's overhead
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Big offices, showrooms, and fleets of trucks do not disappear. They get built
                    into your price. We run lean on purpose and put more of every dollar into the
                    materials, labor, and finish of your project, so more of what you spend ends up
                    in your home.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </Section>

        <WhyChooseUsSection />

        <StatementBandSection />

        {/* ─── Principles ─── */}
        <Section variant="inverse" divider>
          <div className="container px-4 max-w-5xl">
            {/* Stacked emblem - bright badge on the dark band */}
            <img
              src="/brand/svg/icon/boise-remodeling-co-icon-bone.svg"
              alt="Boise Remodeling Co emblem"
              width={72}
              height={72}
              className="h-16 w-16 md:h-[72px] md:w-[72px] mb-8"
            />
            <SectionHeader
              eyebrow="Our standards"
              inverse
              size="display"
              title={
                <>
                  Six principles we never{' '}
                  <em className="brc-accent">compromise</em> on
                </>
              }
              className="mb-0 max-w-3xl"
            />
            <Hairline inverse className="mt-8 mb-12" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {PRINCIPLES.map(({ title, desc }, i) => (
                <Reveal key={title} delay={Math.min(i, 5) * 60}>
                  <div className="h-full">
                    <DisplayNum className="text-2xl text-inverse-foreground/20 leading-none mb-4 block">
                      {formatStepNumber(i)}
                    </DisplayNum>
                    <h3 className="font-sans font-normal text-sm mb-2 text-inverse-foreground">
                      {title}
                    </h3>
                    <p className="text-sm text-inverse-muted leading-relaxed">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Service areas ─── */}
        <Section divider>
          <div className="container px-4 max-w-5xl">
            <SectionHeader
              eyebrow="Treasure Valley"
              size="display"
              title={
                <>
                  Service <em className="brc-accent">areas</em>
                </>
              }
              description={`We serve homeowners in ${TREASURE_VALLEY_CITIES}, and surrounding communities.`}
              className="max-w-3xl"
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {CITIES.map((city, i) => (
                <Reveal key={city.slug} delay={Math.min(i, 7) * 50}>
                  <AreaCard city={city} imageSrc={CITY_HERO_IMAGES[city.slug]} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Closing CTA ─── */}
        <Section divider spacing="sm">
          <div className="container px-4 max-w-2xl mx-auto">
            <MarketingCard className="cta-card-dark p-10 md:p-12 text-center">
              <h2 className="font-sans font-light text-section-title mb-4 text-inverse-foreground">
                Ready to start your project?
              </h2>
              <p className="text-base text-inverse-muted mb-8">
                Schedule a free in-home visit for planning guidance, design direction, and an honest
                project range.
              </p>
              <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
            </MarketingCard>
          </div>
        </Section>
      </div>
    </>
  );
}
