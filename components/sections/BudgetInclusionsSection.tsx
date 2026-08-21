import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { ArrowRight, Check } from "lucide-react";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { Hairline } from "@/components/marketing/Hairline";
import {
  BUDGET_GUIDANCE_POINTS,
  STANDARD_INCLUSIONS,
  OPTIONAL_ENHANCEMENTS,
} from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { CTA_SECONDARY } from "@/shared/ctaCopy";

export function BudgetInclusionsSection() {
  return (
    <Section id="budget" variant="inverse" divider className="relative overflow-hidden">
      {/* Photographic ground behind the dark band. Previously the image sat at
          10% opacity under a flat 75% scrim AND a 90% gradient - effectively
          invisible. One gradient over a somewhat-present image keeps the copy
          fully legible while letting the photograph actually read as a photo. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <Image
          src={SITE_IMAGES.budgetDetail}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover opacity-[0.22] img-brand-grade"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-inverse/85 via-inverse/50 to-inverse/85" />
      </div>
      <div className="container px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <SectionHeader
            eyebrow="Budget and scope"
            inverse
            size="display"
            title={
              <>
                Clear guidance on what to{" "}
                <em className="brc-accent">expect</em>
              </>
            }
            description="Planning ranges upfront, a written scope before construction, and standard inclusions on every project, so you always know where things stand."
            className="mb-0"
          />

          <Hairline inverse className="mt-8 mb-12" />

          <div className="grid md:grid-cols-2 gap-12 md:gap-0">
            <Reveal>
              <div className="space-y-8 md:pr-16">
                {BUDGET_GUIDANCE_POINTS.map((point) => (
                  <div key={point.title}>
                    <h3 className="font-sans font-normal text-sm mb-2 text-inverse-foreground">
                      {point.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-inverse-muted">{point.body}</p>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={60}>
              <div className="md:border-l md:border-inverse-foreground/15 md:pl-16">
                <h3 className="font-sans font-normal text-sm mb-5 text-inverse-foreground">
                  Included on every project
                </h3>
                <ul className="space-y-3 mb-10">
                  {STANDARD_INCLUSIONS.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-inverse-muted"
                    >
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5 text-accent-legible" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="pt-8 border-t border-inverse-foreground/15">
                  <p className="text-label tracking-[0.12em] uppercase font-normal text-inverse-muted mb-3">
                    Optional enhancement
                  </p>
                  <h3 className="font-sans font-normal text-sm mb-2 text-inverse-foreground">
                    {OPTIONAL_ENHANCEMENTS.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-3 text-inverse-muted">
                    {OPTIONAL_ENHANCEMENTS.body}
                  </p>
                  <p className="text-xs mb-4 text-inverse-muted/80">
                    {OPTIONAL_ENHANCEMENTS.note}
                  </p>
                  <a
                    href="#consult"
                    className="inline-flex items-center gap-2 text-sm font-normal text-inverse-foreground hover:text-inverse-muted transition-colors"
                  >
                    Ask about visualizations
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal className="mt-12">
            <ConsultCTA variant="brandOutline">{CTA_SECONDARY}</ConsultCTA>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
