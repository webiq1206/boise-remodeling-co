import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { Button } from "@/components/ui/button";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { SERVICES } from "@/shared/contentData";
import { servicePath } from "@/lib/seo-routes";
import { CTA_SECONDARY } from "@/shared/ctaCopy";
import { getServiceBackground } from "@/shared/serviceBackgrounds";

/** A lead service panel followed by relevant image-led service links. */
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

        {/* Lead service. */}
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

        {/* Related services with supporting imagery. */}
        <div className="ed-steps mt-[clamp(40px,5vw,72px)]">
          {rest.map((service, i) => (
            <Reveal key={service.slug} delay={i * 40}>
              <a
                href={servicePath(service.slug)}
                className="group grid items-center gap-5 py-6 transition-colors sm:grid-cols-[144px_minmax(0,1fr)] lg:grid-cols-[160px_minmax(150px,0.9fr)_minmax(0,1.5fr)_auto]"
                style={{ borderBottom: "1px solid var(--ed-line)" }}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden sm:row-span-3 lg:row-span-1">
                  <Image src={getServiceBackground(service.slug)} alt={service.name}
                    fill sizes="(max-width: 640px) 100vw, 160px" quality={75}
                    className="object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
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
            <div className="flex w-full flex-shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
              <ConsultCTA variant="brand" className="w-full sm:w-auto">{CTA_SECONDARY}</ConsultCTA>
              <Button variant="brandOutline" className="w-full sm:w-auto" asChild>
                <a href="/services">All services</a>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
