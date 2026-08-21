import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { HERO_EYEBROW, HERO_SUBHEAD, HERO_STATS, TRUST_ITEMS } from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/shared/ctaCopy";
import { DisplayNum } from "@/components/marketing";
import { GRAIN_URL } from "@/lib/grain";

function StatCard({ num, label }: { num: string; label: string }) {
  return (
    /* A DARK translucent panel, not a light one. These cards carry light text,
       and they sit on the right of the hero where the horizontal scrim is at
       its weakest, directly over the brightest part of the kitchen photo. A 10%
       WHITE fill lightened that background further and pushed the small
       uppercase labels close to invisible. Tinting with the dark inverse colour
       instead gives the light text something to sit on wherever the photo
       happens to be bright. */
    <div className="px-3 py-3 md:px-6 md:py-5 rounded-sm bg-inverse/55 border border-inverse-foreground/20 backdrop-blur-md">
      <DisplayNum className="text-inverse-foreground text-lg md:text-3xl leading-none">
        {num}
      </DisplayNum>
      {/* Was text-inverse-muted. At 10-11px over the photo that measured 3.4:1,
          already under the 4.5:1 AA needs before the scrim above it was
          lightened, which would have taken it lower still. */}
      <div className="mt-1 md:mt-1.5 text-caption md:text-label tracking-[0.06em] md:tracking-[0.1em] uppercase text-inverse-foreground/85 leading-snug">
        {label}
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <>
      <section className="relative min-h-[85vh] md:min-h-screen flex items-center overflow-hidden bg-inverse">
        <Image
          src={SITE_IMAGES.hero}
          alt="Open-concept kitchen remodel with a navy island and brass fixtures opening to a sunlit living room, Boise Idaho Treasure Valley"
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1400px"
          className="object-cover opacity-[0.92] img-brand-grade"
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
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/75 via-inverse/40 to-inverse/25" />
        {/* Mobile: text + stat cards span full width over the bright image centre,
            so add a vertical scrim that the desktop horizontal gradient doesn't cover. */}
        <div className="md:hidden absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/80 via-inverse/55 to-inverse/30" />
        <div className="absolute inset-x-0 top-0 h-40 pointer-events-none bg-gradient-to-b from-inverse/70 via-inverse/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.03 }}
        />

        <div className="relative z-10 container px-4 md:px-8 py-20 md:py-32 pb-16 md:pb-28">
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-10 md:gap-16 items-center">
            <Reveal>
              {/* Not text-inverse-muted: at 11px over the photo it measured
                  3.15:1, under the 4.5:1 AA needs, and lightening the scrim
                  behind it would only widen that gap. */}
              <div className="brc-label brc-label-on-photo mb-6">{HERO_EYEBROW}</div>
              <h1 className="font-sans font-light text-inverse-foreground text-display tracking-tight mb-6">
                Boise remodeling with{" "}
                <em className="brc-accent">clarity</em> and confidence.
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
              <div className="flex flex-wrap gap-3 mb-6 md:mb-0">
                <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
                <ConsultCTA variant="heroGhost">{CTA_SECONDARY}</ConsultCTA>
              </div>

              <div className="grid grid-cols-3 gap-3 md:hidden">
                {HERO_STATS.map((stat) => (
                  <StatCard key={stat.num} num={stat.num} label={stat.label} />
                ))}
              </div>
            </Reveal>

            <div className="hidden md:flex flex-col gap-3">
              {HERO_STATS.map((stat, i) => (
                <Reveal key={stat.num} delay={i * 90}>
                  <StatCard num={stat.num} label={stat.label} />
                </Reveal>
              ))}
            </div>
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
                className="flex items-center justify-center gap-2 px-4 py-5 md:py-4 text-center border-r border-b border-accent-legible/20"
              >
                <span className="h-1 w-1 flex-shrink-0 rounded-full bg-accent-legible" aria-hidden="true" />
                <span
                  className={`text-label leading-snug tracking-[0.2em] uppercase ${
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
