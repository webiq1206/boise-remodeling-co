import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { ArrowRight, Check } from "lucide-react";
import { Section } from "@/components/marketing/Section";
import {
  BUDGET_GUIDANCE_POINTS,
  STANDARD_INCLUSIONS,
  OPTIONAL_ENHANCEMENTS,
} from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { CTA_SECONDARY } from "@/shared/ctaCopy";

/**
 * Budget and scope.
 *
 * WAS a 14px serif heading over two stacked columns inside a 1024px container -
 * the most important reassurance on the page, set smaller than its own body
 * copy and squeezed into half the available width.
 *
 * NOW the full measure: a split heading, then the guidance points as a hairline
 * matrix. The matrix is the family's answer to a row of drop-shadowed cards -
 * one bordered object rather than four floating ones - and it lets four points
 * sit side by side and be compared, which is what a homeowner is doing here.
 * Inclusions and the optional enhancement then sit in an inset panel below,
 * separated from the guidance rather than stacked into the same column.
 */
export function BudgetInclusionsSection() {
  return (
    <Section
      id="budget"
      surface="deep"
      spacing="xl"
      edge
      className="relative overflow-hidden"
    >
      {/* Photographic ground behind the dark band. Previously the image sat at
          10% opacity under a flat 75% scrim AND a 90% gradient - effectively
          invisible. One gradient over a somewhat-present image keeps the copy
          fully legible while letting the photograph actually read as a photo. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <Image
          src={SITE_IMAGES.budgetDetail}
          alt=""
          fill
          loading="lazy"
          sizes="100vw"
          className="object-cover opacity-[0.34] img-brand-grade"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-inverse/72 via-inverse/38 to-inverse/72" />
      </div>

      <div className="ed-shell relative z-10">
        <div className="ed-split ed-split-end">
          <Reveal>
            <p className="ed-eyebrow">Budget and scope</p>
            <h2 className="ed-h2 ed-statement-wide">
              Clear guidance on what to{" "}
              <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                expect
              </em>
            </h2>
          </Reveal>
          <Reveal delay={60}>
            <p className="ed-body">
              Planning ranges upfront, a written scope before construction, and
              standard inclusions on every project - so you always know where
              things stand.
            </p>
          </Reveal>
        </div>

        {/* The four guidance points, comparable side by side. */}
        <Reveal delay={80}>
          <div
            className="ed-matrix mt-[clamp(48px,6vw,88px)]"
            style={{ ["--ed-cols" as string]: BUDGET_GUIDANCE_POINTS.length, ["--ed-cell-h" as string]: "230px" }}
          >
            {BUDGET_GUIDANCE_POINTS.map((point, i) => (
              <div key={point.title} className="flex flex-col">
                <span className="ed-small" style={{ color: "var(--ed-accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="ed-h4 mt-auto pt-6 sm:pt-10">{point.title}</h3>
                <p className="ed-body mt-3 text-[0.875rem]">{point.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Inclusions and the optional add-on, given their own framed panel. */}
        <Reveal delay={120}>
          <div className="ed-inset mt-[clamp(32px,4vw,56px)] grid gap-[var(--ed-gutter)] lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="ed-eyebrow">Included on every project</p>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
                {STANDARD_INCLUSIONS.map((item) => (
                  <li key={item} className="ed-body flex items-start gap-3 text-[0.875rem]">
                    <Check
                      className="mt-1 h-4 w-4 flex-shrink-0"
                      style={{ color: "var(--ed-accent)" }}
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="lg:border-l lg:pl-[var(--ed-gutter)]"
              style={{ borderColor: "var(--ed-line)" }}
            >
              <p className="ed-eyebrow ed-eyebrow-accent">Optional enhancement</p>
              <h3 className="ed-h4">{OPTIONAL_ENHANCEMENTS.title}</h3>
              <p className="ed-body mt-3 text-[0.875rem]">{OPTIONAL_ENHANCEMENTS.body}</p>
              <p className="ed-small mt-3">{OPTIONAL_ENHANCEMENTS.note}</p>
              <a
                href="#consult"
                className="ed-link mt-6 inline-flex min-h-11 items-center lg:min-h-0"
              >
                Ask about visualizations
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div className="mt-[clamp(32px,4vw,56px)]">
            <ConsultCTA variant="brandOutline">{CTA_SECONDARY}</ConsultCTA>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
