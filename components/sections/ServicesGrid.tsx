import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { TextLink } from "@/components/marketing/TextLink";
import { Button } from "@/components/ui/button";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { SERVICES } from "@/shared/contentData";
import { servicePath } from "@/lib/seo-routes";
import { CTA_SECONDARY } from "@/shared/ctaCopy";
import { getServiceBackground } from "@/shared/serviceBackgrounds";

/**
 * Services.
 *
 * WAS a two-column grid of equal cards: photo, a 16px service name, two lines of
 * copy, a link. Six of them, identical. It is the arrangement the redesign brief
 * singles out - nothing in it tells you which service matters, the type is too
 * small to skim, and it looks assembled rather than composed.
 *
 * NOW a lead panel plus an index. The first service gets a full-height image and
 * a display-size name; the rest become a bordered index whose rows carry the
 * name, the one-line description and the planning-from figure on a single
 * horizontal baseline, the name taking the accent on hover. A homeowner scanning for
 * "bathroom, and what does it start at" reads one column instead of six cards,
 * and the section still leads with a real photograph.
 *
 * Ground stays dark. The layout change is what fixes this section; the page is
 * deliberately dark-dominant and spends its one light band elsewhere.
 *
 * Deliberately no client JavaScript: the hover states are CSS, so this stays a
 * server component and the section costs nothing on the wire.
 */
export function ServicesGrid() {
  // Homepage shows the primary services; secondary ones (basement, outdoor,
  // aging-in-place) live on their own pages and the full /services hub.
  const primary = SERVICES.filter((s) => !s.secondary);
  const [lead, ...rest] = primary;

  return (
    <Section id="services" surface="dark" spacing="xl" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-end">
          <Reveal>
            <p className="ed-eyebrow">Our services</p>
            <h2 className="ed-h2 ed-statement-wide">
              Design-build expertise for every major{" "}
              <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                remodel
              </em>
            </h2>
          </Reveal>
          <Reveal delay={60}>
            <p className="ed-body">
              Full design-build coordination under one roof, not piecemeal trades
              managed by multiple vendors. One team handles layout, permitting and
              construction.
            </p>
          </Reveal>
        </div>

        {/* LEAD SERVICE - the one large photograph in the section. */}
        {lead && (
          <Reveal delay={80}>
            <a
              href={servicePath(lead.slug)}
              className="ed-zoom group mt-[clamp(48px,6vw,88px)] grid overflow-hidden lg:grid-cols-[1.15fr_0.85fr]"
              style={{ border: "1px solid var(--ed-line)" }}
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
                <h3 className="ed-h2-sm">{lead.name}</h3>
                <p className="ed-body mt-5">{lead.shortDescription}</p>
                <p className="ed-small mt-7 flex items-baseline gap-3">
                  <span className="uppercase tracking-[0.16em]">Planning from</span>
                  <span
                    className="brc-display-num text-[1.75rem] leading-none"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {lead.planningFrom}
                  </span>
                </p>
                <span className="ed-link ed-link-accent mt-8 self-start">
                  Explore {lead.name.toLowerCase()}
                  <svg className="ed-arrow" viewBox="0 0 22 15" fill="none" aria-hidden="true">
                    <path d="M0 7.5h20M14 1.5l6 6-6 6" />
                  </svg>
                </span>
              </div>
            </a>
          </Reveal>
        )}

        {/* THE INDEX - everything else, on one scannable baseline. */}
        <div className="ed-steps mt-[clamp(40px,5vw,72px)]">
          {rest.map((service, i) => (
            <Reveal key={service.slug} delay={i * 40}>
              <a
                href={servicePath(service.slug)}
                className="group grid items-baseline gap-x-8 gap-y-2 py-[clamp(20px,2.4vw,30px)] transition-colors md:grid-cols-[minmax(210px,0.9fr)_1.6fr_auto_28px]"
                style={{ borderBottom: "1px solid var(--ed-line)" }}
              >
                <h3 className="ed-h3 transition-colors group-hover:[color:var(--ed-accent)]">
                  {service.name}
                </h3>
                <p className="ed-body max-w-none">{service.shortDescription}</p>
                <p className="ed-small flex items-baseline gap-2 whitespace-nowrap">
                  <span className="uppercase tracking-[0.16em]">From</span>
                  <span
                    className="brc-display-num text-[1.25rem] leading-none"
                    style={{ color: "var(--ed-ink)" }}
                  >
                    {service.planningFrom}
                  </span>
                </p>
                <svg
                  className="ed-arrow hidden transition-transform group-hover:translate-x-1 md:block"
                  viewBox="0 0 22 15"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M0 7.5h20M14 1.5l6 6-6 6" />
                </svg>
              </a>
            </Reveal>
          ))}
        </div>

        {/* The "not sure where to start" card no longer has to fill a stray grid
            cell, so it becomes a proper closing statement instead of a sixth box. */}
        <Reveal>
          <div className="ed-inset mt-[clamp(40px,5vw,72px)] flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="ed-eyebrow">Not sure where to start</p>
              <p className="ed-h3 max-w-[24ch]">
                Tell us about your{" "}
                <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                  project
                </em>
              </p>
              <p className="ed-body mt-4">
                Every remodel starts with a free in-home visit and an honest
                planning range, with no obligation.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-4 sm:flex-row sm:items-center">
              <ConsultCTA variant="brand">{CTA_SECONDARY}</ConsultCTA>
              <Button variant="brandOutline" asChild>
                <a href="/services">All services</a>
              </Button>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 flex justify-center">
          <TextLink href="#consult">{CTA_SECONDARY}</TextLink>
        </div>
      </div>
    </Section>
  );
}
