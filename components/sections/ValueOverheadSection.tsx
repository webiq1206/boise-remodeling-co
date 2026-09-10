import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { VALUE_MODEL } from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { CTA_PRIMARY } from "@/shared/ctaCopy";

/**
 * "Where your money goes" value band. Placed just before the estimator so it
 * frames the pricing conversation: lean overhead means more of the budget lands
 * in the home. Copy lives in shared/siteContent.ts.
 *
 * LAYOUT: the first light band on the page, and the first thing a visitor meets
 * after the hero, so it carries the biggest tonal break on the site - charcoal
 * straight into bone. The heading runs the full measure on its own line, with
 * the reading column and the image below it at an asymmetric 1.15/0.85, the
 * image pulled up into the heading's whitespace. That is deliberately NOT the
 * centred image-beside-text this used to be: the same arrangement repeated down
 * a page is what made the old one read as assembled rather than designed.
 */
export function ValueOverheadSection() {
  return (
    <Section id="value" surface="bone" spacing="xl">
      <div className="ed-shell">
        <Reveal>
          <p className="ed-eyebrow">{VALUE_MODEL.eyebrow}</p>
          <h2 className="ed-h2 ed-statement-wide">
            {VALUE_MODEL.headlineA}
            <br />
            {VALUE_MODEL.headlineB}{" "}
            <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
              {VALUE_MODEL.accentWord}
            </em>
            .
          </h2>
        </Reveal>

        <div className="mt-[clamp(40px,5vw,72px)] grid gap-[var(--ed-gutter)] lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <Reveal>
            <div className="max-w-[52ch]">
              <p className="ed-lede">{VALUE_MODEL.costs}</p>
              <p className="ed-body mt-6">
                {VALUE_MODEL.costsBody} {VALUE_MODEL.reframe}
              </p>

              <p className="ed-h3 mt-10">
                {VALUE_MODEL.taglineLead}{" "}
                <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                  {VALUE_MODEL.taglineAccent}
                </em>
                .
              </p>

              <div className="mt-10">
                <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
              </div>
            </div>
          </Reveal>

          {/*
            Pulled up on large screens so the image top-aligns with the heading
            rather than the copy, which is what makes the band read as offset
            instead of as two equal columns.
          */}
          <Reveal delay={80}>
            <figure className="ed-zoom relative m-0 lg:-mt-[clamp(60px,7vw,120px)]">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={SITE_IMAGES.value}
                  alt="Representative kitchen installation with cabinet doors, tools and protected flooring"
                  fill
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover img-brand-grade"
                />
              </div>
              <figcaption className="ed-small mt-4 border-t pt-4" style={{ borderColor: "var(--ed-line)" }}>
                Kitchen installation · Representative imagery
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
