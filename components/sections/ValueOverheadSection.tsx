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
 * in the home. Confident editorial voice; copy lives in shared/siteContent.ts.
 */
export function ValueOverheadSection() {
  return (
    <Section id="value" divider>
      <div className="container px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          <Reveal>
            <div className="brc-label mb-6">{VALUE_MODEL.eyebrow}</div>
            <h2 className="font-serif text-[2rem] md:text-[3rem] lg:text-[3.25rem] leading-[1.06] tracking-tight text-foreground">
              {VALUE_MODEL.headlineA}
              <br />
              {VALUE_MODEL.headlineB}{" "}
              <em className="brc-accent">{VALUE_MODEL.accentWord}</em>.
            </h2>

            <div className="mt-8 h-px w-16 bg-accent-legible" />

            <p className="mt-8 max-w-2xl text-lg md:text-xl leading-relaxed text-foreground/90">
              {VALUE_MODEL.costs}
            </p>
            <p className="mt-3 max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground">
              {VALUE_MODEL.costsBody} {VALUE_MODEL.reframe}
            </p>

            <p className="mt-8 font-sans font-light text-2xl md:text-3xl tracking-tight text-foreground">
              {VALUE_MODEL.taglineLead}{" "}
              <em className="brc-accent">{VALUE_MODEL.taglineAccent}</em>.
            </p>

            <div className="mt-8">
              <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="relative aspect-[4/5] md:aspect-[3/4] overflow-hidden rounded-sm">
              <Image
                src={SITE_IMAGES.value}
                alt="Custom cabinetry being leveled and a quartz countertop set during a Boise kitchen remodel, with white-oak flooring staged for installation"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover img-brand-grade"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
