import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { SITE_IMAGES } from "@/shared/siteImages";
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
            {/* The column used to end after the intro and sit empty beside a
                long list. A photograph now fills it, so the evidence on the
                right has a picture of the work on the left. */}
            <Reveal delay={60}>
              <figure className="mt-10 hidden lg:block">
                <div className="relative aspect-[4/3] overflow-hidden" style={{ border: "1px solid var(--ed-line)" }}>
                  <Image
                    src={SITE_IMAGES.value}
                    alt="Finish samples and materials reviewed with a homeowner before a Treasure Valley remodel"
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover img-brand-grade"
                  />
                </div>
              </figure>
            </Reveal>
          </div>

          <div className="ed-steps">
            {items.map((item, i) => (
              <Reveal key={item.title} delay={i * 40}>
                <div className="ed-step">
                  <span className="ed-step-n">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="ed-h3">{item.title}</h3>
                    {/* The contrast ends mid-sentence and the body completes
                        it, so they read as one paragraph with the turn in the
                        stronger colour rather than two fragments with a gap. */}
                    <p className="ed-body mt-3 max-w-[56ch]">
                      <span className="text-foreground">{item.contrast}</span> {item.body}
                    </p>
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
