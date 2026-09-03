import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, ChevronRight, Star } from 'lucide-react';
import { DisplayNum, formatStepNumber, Section } from '@/components/marketing';
import { MarketingCard } from '@/components/marketing/MarketingCard';
import { Reveal } from '@/components/Reveal';
import { RelatedLinks } from './RelatedLinks';
import { RelatedPostCards } from '@/components/marketing/RelatedPostCards';
import type { FAQItem } from '@/shared/seoContent';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { CTA_PRIMARY, CTA_SECONDARY } from '@/shared/ctaCopy';
import { ConsultCTA } from '@/components/modals/ConsultCTA';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { GalleryProject } from '@/shared/galleryData';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { FeaturedBeforeAfterSection } from '@/components/sections/FeaturedBeforeAfterSection';
import { GRAIN_URL } from '@/lib/grain';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface LandingPageTemplateProps {
  h1: string;
  speakableSummary: string;
  overview: string;
  breadcrumbs: BreadcrumbItem[];
  heroImageUrl?: string;
  breatherImageUrl?: string;
  processImageUrl?: string;
  manifestPath?: string;
  /** Optional planning starting point ("$15k") shown near the hero CTAs. */
  planningFrom?: string;
  benefits?: string[];
  inclusions?: string[];
  timeline?: string;
  processSteps?: { title: string; description: string }[];
  localNote?: string;
  /**
   * Optional long-form content sections rendered as H2 blocks (with optional H3
   * subsections and link lists). Used to expand thin area/service pages with
   * localized copy and contextual internal links.
   */
  sections?: LandingSection[];
  /**
   * Optional embedded local proof (matched testimonials + before/after
   * projects). Surfacing real, city-specific proof on landing pages is part of
   * the doorway-page mitigation (see seo-audit/doorway-page-analysis.md).
   */
  proof?: LandingProof;
  proofHeading?: string;
  /** Optional featured before/after for service hub pages. */
  featuredProject?: GalleryProject;
  /** Show contextual estimator prompt band (default true on service/area pages). */
  showEstimatePrompt?: boolean;
  faqs: FAQItem[];
  related: {
    variant: 'service' | 'area' | 'city-service';
    serviceSlug?: string;
    citySlug?: string;
  };
}

export interface LandingSection {
  heading: string;
  paragraphs?: string[];
  links?: { label: string; href: string }[];
  subsections?: { heading: string; paragraphs: string[] }[];
}

export interface LandingProof {
  testimonials?: { name: string; rating: number; quote: string }[];
  projects?: {
    title: string;
    description: string;
    beforeImageUrl: string;
    afterImageUrl: string;
  }[];
}

function HeroBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-inverse-foreground/80 [&_a]:inline-flex [&_a]:items-center [&_a]:min-h-11 md:[&_a]:min-h-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1.5">
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

/**
 * Splits a benefit string into a bold lead phrase and a muted supporting caption.
 * Priority: split on first comma; fallback: split after first 4 words if string > 6 words.
 */
function splitBenefit(text: string): { lead: string; body: string } {
  const commaIdx = text.indexOf(',');
  if (commaIdx > 0 && commaIdx < text.length - 1) {
    return {
      lead: text.slice(0, commaIdx).trim(),
      body: text.slice(commaIdx + 1).trim(),
    };
  }
  const words = text.split(' ');
  if (words.length > 6) {
    return {
      lead: words.slice(0, 4).join(' '),
      body: words.slice(4).join(' '),
    };
  }
  return { lead: text, body: '' };
}

export function LandingPageTemplate({
  h1,
  speakableSummary,
  overview,
  breadcrumbs,
  heroImageUrl,
  breatherImageUrl,
  processImageUrl,
  manifestPath,
  planningFrom,
  benefits,
  inclusions,
  timeline,
  processSteps,
  localNote,
  sections,
  proof,
  proofHeading,
  featuredProject,
  showEstimatePrompt = false,
  faqs,
  related,
}: LandingPageTemplateProps) {
  const eyebrow = breadcrumbs[breadcrumbs.length - 2]?.name;
  const hasProof =
    !!proof &&
    ((proof.testimonials?.length ?? 0) > 0 || (proof.projects?.length ?? 0) > 0);
  const breatherImage = breatherImageUrl ?? heroImageUrl;
  const processImage = processImageUrl ?? heroImageUrl;

  return (
    <div className="flex flex-col pb-20 md:pb-0">

      {/* ─── Cinematic hero ─── */}
      <section className="relative min-h-[540px] md:min-h-[78vh] flex items-end overflow-hidden bg-inverse">
        {heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt=""
            fill
            className="object-cover opacity-[0.82] img-brand-grade"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/80 via-inverse/60 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/60 via-inverse/15 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-44 pointer-events-none bg-gradient-to-b from-inverse/70 via-inverse/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }}
        />

        <div className="relative z-10 w-full container px-4 pb-14 md:pb-20 pt-10 fade-up">
          <HeroBreadcrumbs items={breadcrumbs} />
          <p data-speakable="summary" className="sr-only">
            {speakableSummary}
          </p>
          {eyebrow && (
            <div className="brc-label brc-label-on-photo mt-6 mb-5">{eyebrow}</div>
          )}
          <h1 className="font-serif text-display tracking-tight text-inverse-foreground max-w-4xl mb-6">
            {h1}
          </h1>
          <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-8">
            {overview}
          </p>
          <div className="flex flex-wrap gap-3">
            <EstimateCTA variant="brand">
              {CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
            </EstimateCTA>
            <ConsultCTA variant="heroGhost">{CTA_SECONDARY}</ConsultCTA>
          </div>
          {planningFrom && (
            <p className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-inverse-foreground/80">
              <span className="uppercase tracking-[0.12em] text-label">Planning from</span>
              <span className="brc-display-num text-inverse-foreground text-lg leading-none">
                {planningFrom}
              </span>
              <span className="opacity-40">·</span>
              <span>Your exact range is confirmed at the free in-home visit</span>
            </p>
          )}
        </div>
      </section>

      {/* ─── Benefits ─── */}
      {benefits && benefits.length > 0 && (
        <Section variant="greige" divider>
          <div className="container px-4 max-w-5xl">
            <Reveal>
              <div className="brc-label mb-5">Why choose us</div>
              <h2 className="font-serif text-[2rem] md:text-[2.5rem] leading-[1.08] tracking-tight text-foreground mb-10">
                Why homeowners <em className="brc-accent">choose us</em>
              </h2>
            </Reveal>
            <ul className="grid sm:grid-cols-2 gap-4">
              {benefits.map((item, i) => {
                const { lead, body } = splitBenefit(item);
                return (
                  <li key={item} className="list-none">
                    <Reveal
                      delay={Math.min(i, 5) * 70}
                      className="marketing-card p-5 flex items-start gap-3 h-full"
                    >
                      <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">
                        <strong className="font-normal text-foreground">{lead}</strong>
                        {body && (
                          <span className="text-muted-foreground">{', '}{body}</span>
                        )}
                      </span>
                    </Reveal>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      )}

      {/* ─── Full-bleed image breather ─── */}
      {breatherImage && (
        <section className="relative h-44 md:h-64 overflow-hidden" aria-hidden>
          <Image
            src={breatherImage}
            alt=""
            fill
            sizes="100vw"
            className="object-cover img-brand-grade"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-inverse/10 to-background/80" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }}
          />
        </section>
      )}

      {/* ─── Inclusions ─── */}
      {inclusions && inclusions.length > 0 && (
        <Section divider>
          <div className="container px-4 max-w-5xl">
            <Reveal>
              <div className="brc-label mb-5">Scope of work</div>
              <h2 className="font-serif text-[2rem] md:text-[2.5rem] leading-[1.08] tracking-tight text-foreground mb-10">
                What&apos;s <em className="brc-accent">included</em>
              </h2>
            </Reveal>
            <MarketingCard>
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {inclusions.map((item, i) => (
                  <li key={item} className="list-none">
                    <Reveal
                      delay={Math.min(i, 6) * 60}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </MarketingCard>
          </div>
        </Section>
      )}

      {/* ─── Featured before/after (service hub) ─── */}
      {featuredProject && <FeaturedBeforeAfterSection project={featuredProject} />}

      {/* ─── Process (split: charcoal panel + steps) ─── */}
      {processSteps && processSteps.length > 0 && (
        <Section variant="greige" divider spacing="none" className="p-0">
          <div className="grid md:grid-cols-2 overflow-hidden">
            <div className="relative min-h-[260px] md:min-h-[520px] overflow-hidden bg-inverse">
              {processImage && (
                <Image
                  src={processImage}
                  alt=""
                  fill
                  className="object-cover img-brand-grade"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-inverse/80 via-inverse/55 to-inverse/30" />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }}
              />
              <div className="relative h-full flex flex-col justify-end p-8 md:p-12 lg:p-14">
                <div className="brc-label brc-label-on-photo mb-4">How it works</div>
                <h2 className="font-serif text-[2rem] md:text-[2.75rem] leading-[1.06] tracking-tight text-inverse-foreground">
                  Our <em className="brc-accent">process</em>,
                  <br />
                  step by step
                </h2>
              </div>
            </div>

            <div className="section-y-sm px-6 md:px-12 lg:px-14 bg-card border-l border-border">
              <div className="divide-y divide-border border-t border-border">
                {processSteps.map((step, i) => (
                  <Reveal key={step.title} delay={Math.min(i, 5) * 70}>
                    <div className="flex gap-5 py-7">
                      <DisplayNum className="text-2xl w-9 flex-shrink-0 leading-none mt-0.5 text-accent-legible">
                        {formatStepNumber(i)}
                      </DisplayNum>
                      <div>
                        <h3 className="font-normal text-base text-foreground mb-1.5">{step.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ─── Timeline & local notes ─── */}
      {(timeline || localNote) && (
        <Section divider>
          <div className="container px-4 max-w-5xl">
            <div
              className={`grid gap-6 ${timeline && localNote ? 'md:grid-cols-2' : 'max-w-2xl'}`}
            >
              {timeline && (
                <Reveal>
                  <MarketingCard className="p-6 md:p-8 h-full">
                    <div className="flex gap-4">
                      <div className="w-0.5 bg-accent/50 flex-shrink-0 rounded-full" />
                      <div>
                        <div className="brc-label mb-3">Planning details</div>
                        <h3 className="font-serif font-normal text-base text-foreground mt-3 mb-3">
                          Typical timeline
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{timeline}</p>
                      </div>
                    </div>
                  </MarketingCard>
                </Reveal>
              )}
              {localNote && (
                <Reveal delay={timeline ? 90 : 0}>
                  <MarketingCard className="p-6 md:p-8 h-full">
                    <div className="flex gap-4">
                      <div className="w-0.5 bg-accent/50 flex-shrink-0 rounded-full" />
                      <div>
                        <div className="brc-label mb-3">Local details</div>
                        <h3 className="font-serif font-normal text-base text-foreground mt-3 mb-3">
                          Local notes
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{localNote}</p>
                      </div>
                    </div>
                  </MarketingCard>
                </Reveal>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ─── Long-form content sections ─── */}
      {sections && sections.length > 0 && (
        <Section divider>
          <div className="container px-4 max-w-3xl space-y-12">
            {sections.map((section, i) => (
              <Reveal key={section.heading} delay={Math.min(i, 4) * 60}>
                <div className="prose-measure">
                  <h2 className="font-serif text-[1.75rem] md:text-[2rem] leading-tight tracking-tight text-foreground mb-5">
                    {section.heading}
                  </h2>
                  {section.paragraphs?.map((p, j) => (
                    <p key={j} className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
                      {p}
                    </p>
                  ))}
                  {section.subsections?.map((sub) => (
                    <div key={sub.heading} className="mt-6">
                      <h3 className="font-serif font-normal text-base text-foreground mb-2">
                        {sub.heading}
                      </h3>
                      {sub.paragraphs.map((p, k) => (
                        <p key={k} className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {p}
                        </p>
                      ))}
                    </div>
                  ))}
                  {section.links && section.links.length > 0 && (
                    <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                      {section.links.map((link) => (
                        <li key={link.href} className="list-none">
                          <Link
                            href={link.href}
                            className="inline-flex items-center min-h-11 lg:min-h-0 text-sm text-accent-legible hover:underline font-normal"
                          >
                            {link.label}
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ─── Local proof (matched testimonials + projects) ─── */}
      {hasProof && (
        <Section divider>
          <div className="container px-4 max-w-5xl">
            <Reveal>
              <div className="brc-label mb-5">Proof of work</div>
              <h2 className="font-serif text-[2rem] md:text-[2.5rem] leading-[1.08] tracking-tight text-foreground mb-10">
                {proofHeading ?? (
                  <>
                    Recent <em className="brc-accent">local work</em>
                  </>
                )}
              </h2>
            </Reveal>

            {proof?.projects && proof.projects.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 mb-8">
                {proof.projects.map((project) => (
                  <Reveal key={project.title}>
                    <MarketingCard className="overflow-hidden h-full">
                      <div className="grid grid-cols-2">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={project.beforeImageUrl}
                            alt={`${project.title} - before`}
                            fill
                            sizes="(max-width: 640px) 50vw, 25vw"
                            className="object-cover"
                          />
                          <span className="absolute bottom-1 left-1 text-caption uppercase tracking-wide bg-inverse/70 text-inverse-foreground px-1.5 py-0.5 rounded">
                            Before
                          </span>
                        </div>
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={project.afterImageUrl}
                            alt={`${project.title} - after`}
                            fill
                            sizes="(max-width: 640px) 50vw, 25vw"
                            className="object-cover"
                          />
                          <span className="absolute bottom-1 left-1 text-caption uppercase tracking-wide bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                            After
                          </span>
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="font-normal text-base text-foreground mb-1.5">
                          {project.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {project.description}
                        </p>
                      </div>
                    </MarketingCard>
                  </Reveal>
                ))}
              </div>
            )}

            {proof?.testimonials && proof.testimonials.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {proof.testimonials.map((t) => (
                  <Reveal key={t.name}>
                    <MarketingCard className="p-6 h-full">
                      <div
                        className="flex gap-0.5 mb-3 text-accent"
                        aria-label={`${t.rating} out of 5 stars`}
                      >
                        {Array.from({ length: Math.round(t.rating) }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <blockquote className="text-sm text-muted-foreground leading-relaxed mb-3">
                        &ldquo;{t.quote}&rdquo;
                      </blockquote>
                      <cite className="text-sm font-normal text-foreground not-italic">
                        {t.name}
                      </cite>
                    </MarketingCard>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ─── Estimator prompt ─── */}
      {showEstimatePrompt && (
        <EstimatePromptBand
          title={
            <>
              What might your <em className="brc-accent">project</em> cost?
            </>
          }
          description="Get an instant planning range based on real Treasure Valley remodel costs - about 60 seconds, no obligation."
        />
      )}

      {/* ─── FAQ ─── */}
      <Section variant="greige" divider>
        <div className="container px-4 max-w-3xl">
          <Reveal>
            <div className="brc-label mb-5">Common questions</div>
            <h2 className="font-serif text-[2rem] md:text-[2.5rem] leading-[1.08] tracking-tight text-foreground mb-10">
              Frequently asked <em className="brc-accent">questions</em>
            </h2>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-0 border-t border-border"
                >
                  <AccordionTrigger className="text-left py-5 hover:no-underline font-sans font-normal text-sm text-foreground">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed pb-6 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </Section>

      {/* ─── Related links & posts ─── */}
      <Section divider>
        <div className="container px-4 max-w-5xl space-y-12">
          <Reveal>
            <RelatedLinks {...related} />
          </Reveal>
          {manifestPath && (
            <Reveal>
              <RelatedPostCards path={manifestPath} />
            </Reveal>
          )}
        </div>
      </Section>

      {/* ─── Bottom CTA strip ─── */}
      <Section divider>
        <div className="container px-4">
          <Reveal>
            <MarketingCard className="cta-card-dark relative overflow-hidden p-10 md:p-16 text-center max-w-4xl mx-auto">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.04 }}
              />
              <div className="relative">
                <div className="brc-label text-inverse-muted justify-center mb-6">
                  Start your project
                </div>
                <h2 className="font-serif text-[2rem] md:text-[2.5rem] leading-tight tracking-tight text-inverse-foreground mb-4">
                  Ready to <em className="brc-accent">begin</em>?
                </h2>
                <p className="text-inverse-muted mb-8 text-base leading-relaxed">
                  Free 60 to 90 minute in-home visit. Planning guidance, design direction, no
                  obligation.
                </p>
                <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
              </div>
            </MarketingCard>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}
