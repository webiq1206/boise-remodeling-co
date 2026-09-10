import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing";
import { HOW_WE_BUILD_STEPS } from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { GRAIN_URL } from "@/lib/grain";

/**
 * How we build.
 *
 * WAS a 50/50 split with a 44px heading and 14px step titles - the process
 * rendered smaller than the marketing copy around it.
 *
 * NOW the family's image-and-content panel at 43/57, reversed so the
 * photograph sits on the right and the timeline leads. Each step is a numbered
 * entry in the step pattern with a serif title at h3 scale, so the sequence
 * reads as a sequence: a homeowner can count to five and know what "yes" sets
 * in motion.
 */
export function ProcessSection() {
  return (
    <Section id="how-we-build" surface="deep" spacing="none" edge className="p-0">
      <div className="ed-panel ed-panel-reverse">
        <div className="ed-panel-media">
          <Image
            src={SITE_IMAGES.processInProgress}
            alt="Representative cabinet installation with a worker wearing Boise Remodeling Co branding"
            fill
            loading="lazy"
            sizes="(max-width: 820px) 100vw, 43vw"
            className="object-cover img-brand-grade"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.028 }}
          />
          <p className="ed-panel-caption">Cabinet installation · Representative imagery</p>
        </div>

        <div className="ed-panel-body">
          <Reveal>
            <p className="ed-eyebrow">Our process</p>
            <h2 className="ed-h2-sm ed-statement">
              From first visit to{" "}
              <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                final walkthrough
              </em>
            </h2>
          </Reveal>

          <div className="ed-steps mt-[clamp(32px,4vw,56px)]">
            {HOW_WE_BUILD_STEPS.map((step, i) => (
              <Reveal key={step.number} delay={i * 40}>
                <div className="ed-step">
                  <span className="ed-step-n">{step.number}</span>
                  <div>
                    <h3 className="ed-h4">{step.title}</h3>
                    <p className="ed-body mt-2 text-[0.875rem]">{step.desc}</p>
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
