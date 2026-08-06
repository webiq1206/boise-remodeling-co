import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { TextLink } from "@/components/marketing/TextLink";
import { Button } from "@/components/ui/button";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { SERVICES } from "@/shared/contentData";
import { servicePath } from "@/lib/seo-routes";
import { CTA_SECONDARY } from "@/shared/ctaCopy";
import { getServiceBackground } from "@/shared/serviceBackgrounds";

export function ServicesGrid() {
  // Homepage shows the primary services; secondary ones (basement, outdoor,
  // aging-in-place) live on their own pages and the full /services hub.
  const primary = SERVICES.filter((s) => !s.secondary);
  return (
    <Section id="services" divider>
      <div className="container px-4">
        <SectionHeader
          eyebrow="Our services"
          size="display"
          title={
            <>
              Design-build expertise for every major{" "}
              <em className="brc-accent">remodel</em>
            </>
          }
          description="Full design-build coordination under one roof, not piecemeal trades managed by multiple vendors. One team handles layout, permitting, and construction so your project stays aligned from start to finish."
        />

        <div className="grid sm:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
          {primary.map((service, i) => (
            <Reveal key={service.slug} delay={i * 40}>
              <article className="group">
                <div className="relative aspect-[4/3] overflow-hidden rounded-sm mb-4">
                  <Image
                    src={getServiceBackground(service.slug)}
                    alt={`${service.name} project by Boise Remodeling Co`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    quality={70}
                    className="object-cover img-brand-grade transition-transform duration-300 ease-out group-hover:scale-[1.02]"
                  />
                </div>
                <h3 className="font-sans font-normal text-base mb-2 text-foreground">
                  {service.name}
                </h3>
                <p className="text-sm leading-relaxed mb-3 text-muted-foreground">
                  {service.shortDescription}
                </p>
                <div className="mb-4 flex items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Planning from
                  </span>
                  <span className="brc-display-num text-foreground text-base leading-none">
                    {service.planningFrom}
                  </span>
                </div>
                <TextLink href={servicePath(service.slug)} showArrow ariaLabel={`Learn more about ${service.name}`}>
                  Learn more
                </TextLink>
              </article>
            </Reveal>
          ))}

          {/* CTA card fills the final grid cell so an odd service count never
              leaves a lonely card, and gives the section a clear next step. */}
          <Reveal delay={primary.length * 40}>
            <div className="h-full min-h-[220px] rounded-sm border border-card-border bg-card p-6 md:p-8 flex flex-col justify-center">
              <div className="brc-label mb-3">Not sure where to start</div>
              <h3 className="font-sans font-light text-xl md:text-2xl tracking-tight mb-2 text-foreground">
                Tell us about your <em className="brc-accent">project</em>
              </h3>
              <p className="text-sm leading-relaxed mb-5 text-muted-foreground">
                Every remodel starts with a free in-home visit and an honest planning range, with no obligation.
              </p>
              <ConsultCTA variant="brand" className="self-start">{CTA_SECONDARY}</ConsultCTA>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Button variant="brandOutline" asChild>
            <a href="/services">Explore all services</a>
          </Button>
          <TextLink href="#consult">{CTA_SECONDARY}</TextLink>
        </div>
      </div>
    </Section>
  );
}
