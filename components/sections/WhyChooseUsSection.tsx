import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
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

/**
 * What sets us apart.
 *
 * WAS a centred heading over a single 768px column of divided rows - a list
 * that read as a list.
 *
 * NOW a split: the heading and intro hold the left column and stay put while
 * the right column scrolls, so the claim ("clarity, not chaos") stays in view
 * beside every piece of evidence for it. The differentiators become a numbered
 * index in the family's step pattern, each contrast line set in the serif so
 * the "with us / elsewhere" turn actually reads as a turn.
 */
export function WhyChooseUsSection({ limit }: WhyChooseUsSectionProps) {
  const items =
    limit !== undefined
      ? HOMEPAGE_DIFFERENTIATOR_INDICES.map((i) => DIFFERENTIATORS[i])
      : DIFFERENTIATORS;

  return (
    <Section id="why-choose-us" surface="dark" spacing="xl" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-narrow">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <p className="ed-eyebrow">What sets us apart</p>
              <h2 className="ed-h2 ed-statement">
                Built for homeowners who want{" "}
                <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                  clarity
                </em>
                , not chaos
              </h2>
              <p className="ed-body mt-7">{DIFFERENTIATORS_INTRO}</p>
              {limit !== undefined && (
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
                  <a href="/about" className="ed-link">
                    Our approach
                  </a>
                  <a href="#consult" className="ed-link ed-link-accent">
                    {CTA_SECONDARY}
                  </a>
                </div>
              )}
            </Reveal>
          </div>

          <div className="ed-steps">
            {items.map((item, i) => (
              <Reveal key={item.title} delay={i * 40}>
                <div className="ed-step">
                  <span className="ed-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="ed-h3">{item.title}</h3>
                    <p className="ed-lede mt-4 max-w-[46ch] text-[1.0625rem]">{item.contrast}</p>
                    <p className="ed-body mt-3">{item.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
