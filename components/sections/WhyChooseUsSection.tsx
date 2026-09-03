import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import {
  DIFFERENTIATORS,
  DIFFERENTIATORS_INTRO,
  HOMEPAGE_DIFFERENTIATOR_INDICES,
} from "@/shared/siteContent";
import { CTA_SECONDARY } from "@/shared/ctaCopy";

interface WhyChooseUsSectionProps {
  /** When set, show only the first N homepage-curated differentiators. */
  limit?: number;
}

export function WhyChooseUsSection({ limit }: WhyChooseUsSectionProps) {
  const items =
    limit !== undefined
      ? HOMEPAGE_DIFFERENTIATOR_INDICES.map((i) => DIFFERENTIATORS[i])
      : DIFFERENTIATORS;

  return (
    <Section id="why-choose-us" variant="greige" divider>
      <div className="container px-4">
        <SectionHeader
          eyebrow="What sets us apart"
          size="display"
          title={
            <>
              Built for homeowners who want{" "}
              <em className="brc-accent">clarity</em>, not chaos
            </>
          }
          description={DIFFERENTIATORS_INTRO}
          className="max-w-3xl"
        />

        <div className="max-w-3xl mx-auto divide-y divide-border border-t border-border">
          {items.map((item, i) => (
            <Reveal key={item.title} delay={i * 40}>
              <div className="py-7 md:py-8">
                <h3 className="font-serif text-foreground text-xl md:text-2xl leading-snug mb-2">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base leading-relaxed text-muted-foreground">
                  <span className="text-foreground/90">{item.contrast}</span> {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {limit !== undefined && (
          <p className="text-sm text-muted-foreground text-center mt-10 max-w-xl mx-auto">
            <a href="/about" className="text-foreground hover:text-foreground/70 transition-colors font-normal">
              Learn more about our approach
            </a>
            {' · '}
            <a href="#consult" className="text-foreground hover:text-foreground/70 transition-colors font-normal">
              {CTA_SECONDARY}
            </a>
          </p>
        )}
      </div>
    </Section>
  );
}
