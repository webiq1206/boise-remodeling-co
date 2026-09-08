import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, ChevronRight, Star } from 'lucide-react';
import { Section } from '@/components/marketing';
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
  /**
   * Cost-and-timeline expectation, rendered directly AFTER THE HERO: the first
   * question a visitor researches is what this costs and how long it takes, so
   * it must not sit below inclusions and process. When provided, the `timeline`
   * renders alongside it instead of in the lower planning-details block.
   */
  costGuidance?: {
    heading: string;
    paragraphs: string[];
    links?: { label: string; href: string }[];
  };
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
                <Link href={item.href} className="hover:text-inverse-foreground transition-colors">
                  {item.name}
                </Link>
              ) : (
                <span className={isLast ? 'text-inverse-foreground font-normal' : ''}>{item.name}</span>
              )}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-40" />}
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
    return { lead: text.slice(0, commaIdx).trim(), body: text.slice(commaIdx + 1).trim() };
  }
  const words = text.split(' ');
  if (words.length > 6) {
    return { lead: words.slice(0, 4).join(' '), body: words.slice(4).join(' ') };
  }
  return { lead: text, body: '' };
}

const accent = { color: 'var(--ed-accent)' } as const;
const line = { borderColor: 'var(--ed-line)' } as const;

/**
 * The landing template behind every service, area and city-service page - the
 * highest-volume SEO routes on the site, dozens of pages from one file.
 *
 * Rebuilt on the family layer. Every band keeps its content and its order (the
 * order is the sales conversation and the SEO structure - untouched), but each
 * takes the layout that suits what it holds rather than the same card grid:
 * benefits as a hairline matrix, inclusions as a split with an inset list,
 * process as the family's image panel, long-form copy on the prose measure,
 * proof as a matrix, FAQ as the parent site's split. Grounds alternate dark /
 * deep / gradient so a long page has a rhythm; there is no light band here by
 * design - these pages are dark-dominant like the rest of the site.
 */
/** Anchor id for a long-form section heading, used by the sticky index. */
function sectionId(heading: string): string {
  return 'section-' + heading.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
  costGuidance,
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
    !!proof && ((proof.testimonials?.length ?? 0) > 0 || (proof.projects?.length ?? 0) > 0);
  const breatherImage = breatherImageUrl ?? heroImageUrl;
  const processImage = processImageUrl ?? heroImageUrl;
  const showTimelineBelow = !!timeline && !costGuidance;

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      {/* ─── Cinematic hero ─── */}
      <section className="relative min-h-[clamp(560px,78vh,860px)] flex items-end overflow-hidden bg-inverse" data-contrast-skip>
        {heroImageUrl && (
          <Image src={heroImageUrl} alt="" fill className="object-cover opacity-[0.82] img-brand-grade" sizes="100vw" priority />
        )}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/85 via-inverse/60 to-transparent" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/60 via-inverse/15 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-44 pointer-events-none bg-gradient-to-b from-inverse/70 via-inverse/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }} />

        <div className="ed-shell relative z-10 w-full pb-[clamp(56px,7vw,96px)] pt-10 fade-up">
          <HeroBreadcrumbs items={breadcrumbs} />
          <p data-speakable="summary" className="sr-only">{speakableSummary}</p>
          {eyebrow && (
            <p className="ed-eyebrow mt-8" style={{ color: 'rgb(255 255 255 / 0.72)' }}>{eyebrow}</p>
          )}
          <h1 className="ed-display ed-statement-display text-inverse-foreground">{h1}</h1>
          <p className="ed-lede mt-8 max-w-[44ch] text-inverse-foreground/85">{overview}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 [&>*]:w-full sm:[&>*]:w-auto">
            <EstimateCTA variant="brand">
              {CTA_PRIMARY} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </EstimateCTA>
            <ConsultCTA variant="heroOutline">{CTA_SECONDARY}</ConsultCTA>
          </div>
          {planningFrom && (
            <p className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-inverse-foreground/80">
              <span className="ed-eyebrow !mb-0" style={{ color: 'rgb(255 255 255 / 0.72)' }}>Planning from</span>
              <span className="brc-display-num text-inverse-foreground text-[1.5rem] leading-none">{planningFrom}</span>
              <span className="ed-small text-inverse-foreground/70">Your exact range is confirmed at the free in-home visit</span>
            </p>
          )}
        </div>
      </section>

      {/* ─── Cost and timeline expectation ───
          Position 2 by design: cost is the question that brought the visitor
          here, so it answers before benefits, inclusions or process. */}
      {costGuidance && (
        <Section surface="dark" spacing="xl">
          <div className="ed-shell">
            <div className="ed-split ed-split-narrow">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Reveal>
                  <p className="ed-eyebrow">Cost and timeline</p>
                  <h2 className="ed-h2 ed-statement">{costGuidance.heading}</h2>
                  {timeline && (
                    <div className="ed-inset mt-10">
                      <p className="ed-eyebrow ed-eyebrow-accent">Typical timeline</p>
                      <p className="ed-body">{timeline}</p>
                    </div>
                  )}
                </Reveal>
              </div>
              <Reveal delay={60}>
                {costGuidance.paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? 'ed-lede' : 'ed-body mt-5'}>{p}</p>
                ))}
                {costGuidance.links && costGuidance.links.length > 0 && (
                  <ul className="mt-8 flex list-none flex-wrap gap-x-8 gap-y-3 p-0">
                    {costGuidance.links.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} className="ed-link ed-link-accent">
                          {link.label}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Reveal>
            </div>
          </div>
        </Section>
      )}

      {/* ─── Benefits: a hairline matrix, not a card grid ─── */}
      {benefits && benefits.length > 0 && (
        <Section surface="bone" spacing="xl" edge>
          <div className="ed-shell">
            <Reveal>
              <p className="ed-eyebrow">Why choose us</p>
              <h2 className="ed-h2 ed-statement-wide">
                Why homeowners <em className="not-italic" style={accent}>choose us</em>
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <ul
                className="ed-matrix mt-[clamp(40px,5vw,72px)] list-none p-0"
                style={{ ['--ed-cols' as string]: benefits.length === 4 ? 4 : Math.min(benefits.length, 3), ['--ed-cell-h' as string]: '200px' }}
              >
                {benefits.map((item, i) => {
                  const { lead, body } = splitBenefit(item);
                  return (
                    <li key={item} className="flex flex-col">
                      <span className="ed-small" style={accent}>{String(i + 1).padStart(2, '0')}</span>
                      <p className="ed-h4 mt-auto pt-8">{lead}</p>
                      {body && <p className="ed-body mt-2 text-[0.875rem]">{body}</p>}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>
        </Section>
      )}

      {/* ─── Full-bleed image breather ─── */}
      {breatherImage && (
        <section className="relative h-[clamp(220px,32vw,400px)] overflow-hidden" aria-hidden>
          <Image src={breatherImage} alt="" fill sizes="100vw" className="object-cover img-brand-grade" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-inverse/10 to-background/80" />
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }} />
        </section>
      )}

      {/* ─── Inclusions: split, list in an inset panel ─── */}
      {inclusions && inclusions.length > 0 && (
        <Section surface="dark" spacing="xl">
          <div className="ed-shell">
            <div className="ed-split ed-split-narrow">
              <Reveal>
                <p className="ed-eyebrow">Scope of work</p>
                <h2 className="ed-h2 ed-statement">
                  What&apos;s <em className="not-italic" style={accent}>included</em>
                </h2>
              </Reveal>
              <Reveal delay={60}>
                <ul className="ed-inset ed-grid-balance m-0 grid list-none gap-x-8 gap-y-4 p-[clamp(24px,2.6vw,40px)] sm:grid-cols-2">
                  {inclusions.map((item) => (
                    <li key={item} className="ed-body flex items-start gap-3 text-[0.9375rem]">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0" style={accent} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </Section>
      )}

      {/* ─── Featured before/after (service hub) ─── */}
      {featuredProject && <FeaturedBeforeAfterSection project={featuredProject} />}

      {/* ─── Process: the family's image panel, timeline leading ─── */}
      {processSteps && processSteps.length > 0 && (
        <Section surface="deep" spacing="none" edge className="p-0">
          <div className="ed-panel ed-panel-reverse">
            <div className="ed-panel-media">
              {processImage && (
                <Image src={processImage} alt="" fill className="object-cover img-brand-grade" sizes="(max-width: 820px) 100vw, 43vw" />
              )}
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: GRAIN_URL, backgroundRepeat: 'repeat', opacity: 0.03 }} />
            </div>
            <div className="ed-panel-body">
              <Reveal>
                <p className="ed-eyebrow">How it works</p>
                <h2 className="ed-h2-sm ed-statement">
                  Our <em className="not-italic" style={accent}>process</em>, step by step
                </h2>
              </Reveal>
              <div className="ed-steps mt-[clamp(32px,4vw,56px)]">
                {processSteps.map((step, i) => (
                  <Reveal key={step.title} delay={Math.min(i, 5) * 60}>
                    <div className="ed-step">
                      <span className="ed-step-n">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3 className="ed-h4">{step.title}</h3>
                        <p className="ed-body mt-2 text-[0.875rem]">{step.description}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ─── Timeline & local notes ───
          The timeline renders up in the cost section when costGuidance hoisted
          it; showing it twice would be noise. */}
      {(showTimelineBelow || localNote) && (
        <Section surface="dark" spacing="lg" edge>
          <div className="ed-shell">
            {showTimelineBelow && localNote ? (
              <div className="grid gap-[var(--ed-gutter)] lg:grid-cols-2">
                <Reveal>
                  <div className="ed-inset h-full">
                    <p className="ed-eyebrow ed-eyebrow-accent">Planning details</p>
                    <h3 className="ed-h3">Typical timeline</h3>
                    <p className="ed-body mt-4">{timeline}</p>
                  </div>
                </Reveal>
                <Reveal delay={90}>
                  <div className="ed-inset h-full">
                    <p className="ed-eyebrow ed-eyebrow-accent">Local details</p>
                    <h3 className="ed-h3">Local notes</h3>
                    <p className="ed-body mt-4">{localNote}</p>
                  </div>
                </Reveal>
              </div>
            ) : (
              /* One note on its own used to sit in a small box on the left of
                 an otherwise empty band. It is now a split: the heading holds
                 the left column, the note reads as a lede on the right. */
              <div className="ed-split ed-split-narrow">
                <Reveal>
                  <p className="ed-eyebrow ed-eyebrow-accent">{showTimelineBelow ? 'Planning details' : 'Local details'}</p>
                  <h2 className="ed-h2 ed-statement">
                    {showTimelineBelow ? (<>Typical <em className="not-italic" style={accent}>timeline</em></>) : (<>Local <em className="not-italic" style={accent}>notes</em></>)}
                  </h2>
                </Reveal>
                <Reveal delay={60}>
                  <p className="ed-lede">{showTimelineBelow ? timeline : localNote}</p>
                </Reveal>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ─── Long-form content sections: the prose measure ─── */}
      {sections && sections.length > 0 && (
        <Section surface="dark" spacing="xl" edge>
          <div className="ed-shell">
            <div className="grid gap-[var(--ed-gutter)] lg:grid-cols-[0.75fr_1.25fr]">
              {/* The left column used to be empty: a prose measure on the right
                  with nothing on the left read as copy pushed to one side. It
                  now holds a sticky index of the sections, so the column has a
                  job and long pages get jump links. */}
              <aside className="lg:sticky lg:top-28 lg:self-start" aria-label="In this guide">
                <Reveal>
                  <p className="ed-eyebrow">In this guide</p>
                  <ol className="m-0 list-none border-t p-0" style={line}>
                    {sections.map((section, i) => (
                      <li key={section.heading} className="border-b" style={line}>
                        <a
                          href={`#${sectionId(section.heading)}`}
                          className="flex min-h-11 items-baseline gap-4 py-3 text-[0.9375rem] leading-snug transition-colors hover:[color:var(--ed-accent)] focus-visible:[color:var(--ed-accent)]"
                        >
                          <span className="ed-small shrink-0" style={accent}>{String(i + 1).padStart(2, '0')}</span>
                          <span>{section.heading}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </Reveal>
              </aside>
              <div className="space-y-[clamp(48px,6vw,88px)]">
                {sections.map((section, i) => (
                  <Reveal key={section.heading} delay={Math.min(i, 4) * 60}>
                    <h2 id={sectionId(section.heading)} className="ed-h2-sm ed-statement-wide scroll-mt-28">{section.heading}</h2>
                    {section.paragraphs?.map((p, j) => (
                      <p key={j} className={j === 0 ? 'ed-lede mt-6 max-w-[52ch]' : 'ed-body mt-4 max-w-[62ch]'}>{p}</p>
                    ))}
                    {section.subsections?.map((sub) => (
                      <div key={sub.heading} className="mt-8 border-t pt-6" style={line}>
                        <h3 className="ed-h4">{sub.heading}</h3>
                        {sub.paragraphs.map((p, k) => (
                          <p key={k} className="ed-body mt-3 max-w-[62ch]">{p}</p>
                        ))}
                      </div>
                    ))}
                    {section.links && section.links.length > 0 && (
                      <ul className="mt-6 flex list-none flex-wrap gap-x-8 gap-y-3 p-0">
                        {section.links.map((link) => (
                          <li key={link.href}>
                            <Link href={link.href} className="ed-link ed-link-accent min-h-11 lg:min-h-0">
                              {link.label}
                              <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ─── Local proof (matched testimonials + projects) ─── */}
      {hasProof && (
        <Section surface="deep" spacing="xl" edge>
          <div className="ed-shell">
            <Reveal>
              <p className="ed-eyebrow">Proof of work</p>
              <h2 className="ed-h2 ed-statement-wide">
                {proofHeading ?? (<>Recent <em className="not-italic" style={accent}>local work</em></>)}
              </h2>
            </Reveal>

            {proof?.projects && proof.projects.length > 0 && (
              <div className="mt-[clamp(40px,5vw,72px)] grid gap-6 sm:grid-cols-2">
                {proof.projects.map((project) => (
                  <Reveal key={project.title}>
                    <article className="flex h-full flex-col" style={{ border: '1px solid var(--ed-line)' }}>
                      <div className="grid grid-cols-2">
                        <div className="relative aspect-[4/3]">
                          <Image src={project.beforeImageUrl} alt={`${project.title} - before`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                          <span className="absolute bottom-2 left-2 bg-inverse/70 px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.18em] text-inverse-foreground">Before</span>
                        </div>
                        <div className="relative aspect-[4/3]">
                          <Image src={project.afterImageUrl} alt={`${project.title} - after`} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                          <span className="absolute bottom-2 left-2 bg-accent px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.18em]" style={{ color: "hsl(var(--accent-foreground))" }}>After</span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="ed-h4">{project.title}</h3>
                        <p className="ed-body mt-2 text-[0.875rem]">{project.description}</p>
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            )}

            {proof?.testimonials && proof.testimonials.length > 0 && (
              <div
                className="ed-matrix mt-[clamp(32px,4vw,56px)]"
                style={{ ['--ed-cols' as string]: Math.min(proof.testimonials.length, 2), ['--ed-cell-h' as string]: '0' }}
              >
                {proof.testimonials.map((t) => (
                  <figure key={t.name} className="m-0">
                    <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                      {Array.from({ length: Math.round(t.rating) }).map((_, i) => (
                        <Star key={i} className="h-4 w-4" style={{ fill: 'var(--ed-accent)', color: 'var(--ed-accent)' }} aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote className="ed-body mt-4 text-[0.9375rem]">&ldquo;{t.quote}&rdquo;</blockquote>
                    <figcaption className="ed-h4 mt-4 text-[1rem]">{t.name}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ─── Estimator prompt ─── */}
      {showEstimatePrompt && (
        <EstimatePromptBand
          title={<>What might your <em className="not-italic" style={accent}>project</em> cost?</>}
          description="Get an instant planning range based on real Treasure Valley remodel costs - about 60 seconds, no obligation."
        />
      )}

      {/* ─── FAQ: the parent site's split ─── */}
      <Section surface="bone" spacing="xl" edge>
        <div className="ed-shell">
          <div className="ed-split ed-split-narrow">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="ed-eyebrow">Common questions</p>
              <h2 className="ed-h2 ed-statement">
                Frequently asked <em className="not-italic" style={accent}>questions</em>
              </h2>
            </div>
            <Accordion type="single" collapsible className="w-full border-t" style={line}>
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border-0 border-b" style={line}>
                  <AccordionTrigger className="ed-h4 py-6 text-left hover:no-underline [&[data-state=open]]:[color:var(--ed-accent)]">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="ed-body pb-7 text-[0.9375rem]">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </Section>

      {/* ─── Related links & posts ─── */}
      <Section surface="deep" spacing="lg" edge>
        <div className="ed-shell space-y-12">
          <Reveal><RelatedLinks {...related} /></Reveal>
          {manifestPath && (<Reveal><RelatedPostCards path={manifestPath} /></Reveal>)}
        </div>
      </Section>

      {/* ─── Bottom CTA: a statement on the gradient ground ─── */}
      <Section surface="gradient" spacing="xl" edge>
        <div className="ed-shell">
          <div className="ed-split ed-split-center">
            <Reveal>
              <p className="ed-eyebrow ed-eyebrow-accent">Start your project</p>
              <h2 className="ed-h2 ed-statement">
                Ready to <em className="not-italic" style={accent}>begin</em>?
              </h2>
            </Reveal>
            <Reveal delay={60}>
              <p className="ed-lede">Free 60 to 90 minute in-home visit.</p>
              <p className="ed-body mt-3">Planning guidance, design direction, no obligation.</p>
              <div className="mt-8"><EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA></div>
            </Reveal>
          </div>
        </div>
      </Section>
    </div>
  );
}
