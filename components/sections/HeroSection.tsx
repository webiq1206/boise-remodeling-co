import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { HERO_EYEBROW, HERO_SUBHEAD, HERO_STATS, TRUST_ITEMS } from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/shared/ctaCopy";

import { GRAIN_URL } from "@/lib/grain";

export function HeroSection() {
  return (
    <>
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden bg-inverse">
        <Image
          src={SITE_IMAGES.hero}
          alt="Representative open kitchen with a dark island, brass fixtures and a connected living room"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1400px"
          className="object-cover img-brand-grade animate-hero-reveal"
        />
        {/* Scrim stops tuned for the golden-hour interior: dark enough on the
            left where the headline sits, opening up quickly so the photograph
            carries the right two-thirds of the frame. Ends at /25 rather than
            /15 because the stat cards live in that last third.

            If you change these, HARD-RESTART the dev server and confirm the
            gradient still computes. Editing a scrim opacity can leave Next's
            Tailwind pass stale, and an ungenerated class is not an error - the
            rule is simply absent, the scrim vanishes, and the page looks like
            someone deleted it. */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/90 via-inverse/60 to-inverse/10" />
        {/* Mobile: text + stat cards span full width over the bright image centre,
            so add a vertical scrim that the desktop horizontal gradient doesn't cover. */}
        <div className="md:hidden absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/80 via-inverse/55 to-inverse/30" />
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none bg-gradient-to-b from-inverse/70 via-inverse/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.025 }}
        />

        <div className="relative z-10 container px-4 md:px-8 py-20 md:py-32 pb-16 md:pb-28">
          <div className="ed-hero-copy">
            <Reveal>
              {/* Not text-inverse-muted: at 11px over the photo it measured
                  3.15:1, under the 4.5:1 AA needs, and lightening the scrim
                  behind it would only widen that gap. */}
              <div className="brc-label brc-label-on-photo mb-6">{HERO_EYEBROW}</div>
              {/* Display scale from the family layer: up to 92px, tight leading,
                  negative tracking. The old `text-display` topped out well under
                  that, and the hero heading is the one line the whole site is
                  judged on in the first second. */}
              <h1 className="ed-display text-inverse-foreground mb-8 max-w-[17ch]">
                Boise remodeling with{" "}
                <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                  clarity
                </em>{" "}
                and confidence.
              </h1>
              {/* Full opacity, not /90: over the lightened scrim the subhead
                  measured 4.28:1 against the 4.5:1 minimum. Buying the
                  difference back from the TEXT rather than from the scrim
                  keeps the photograph as visible as it now is. */}
              <p
                data-speakable="summary"
                className="text-lg md:text-xl leading-relaxed mb-8 max-w-xl text-inverse-foreground"
              >
                {HERO_SUBHEAD}
              </p>
              {/* Phones: both CTAs full width and stacked, same height and
                  format, so the pair reads as a pair rather than a button
                  beside a stray outline. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap mb-6 md:mb-0">
                <EstimateCTA variant="brand" className="w-full sm:w-auto">{CTA_PRIMARY}</EstimateCTA>
                <ConsultCTA variant="heroOutline" className="w-full sm:w-auto">{CTA_SECONDARY}</ConsultCTA>
              </div>

              <dl className="ed-hero-facts">
                {HERO_STATS.map((stat) => (
                  <div key={stat.num} className="flex flex-col">
                    <dt className="order-2">{stat.label}</dt>
                    <dd className="order-1">{stat.num}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Trust bar. Sage-tinted so it reads as a deliberate branded band
          rather than a bare grid on the page ground - the tint follows the
          established bg-accent-legible/[0.07] + border-accent-legible idiom
          used by the estimator cards and CTA bands. The sage tick before each
          item is the same brand accent the eyebrow labels use. */}
      <div className="bg-accent-legible/[0.07] border-t border-accent-legible/25 py-8 md:py-10">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 max-w-5xl mx-auto border-l border-t border-accent-legible/20">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={item}
                className="flex items-center justify-start gap-2.5 px-3.5 py-3.5 text-left md:justify-center md:px-4 md:py-4 md:text-center border-r border-b border-accent-legible/20"
              >
                <span className="h-1 w-1 flex-shrink-0 rounded-full bg-accent-legible" aria-hidden="true" />
                <span
                  className={`text-[0.75rem] md:text-label leading-snug tracking-[0.12em] md:tracking-[0.2em] uppercase ${
                    i < 2 ? "text-foreground" : "text-foreground/80"
                  }`}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
