import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { SITE_IMAGES } from "@/shared/siteImages";
import { STATEMENT_BAND } from "@/shared/siteContent";
import { GRAIN_URL } from "@/lib/grain";

/**
 * Full-bleed cinematic statement band - a photographic "breather" with an
 * editorial overlay. Placed between text-heavy sections (e.g. after the
 * estimator) to give the eye a rest and reinforce the brand voice. Copy lives
 * in shared/siteContent.ts (STATEMENT_BAND).
 */
export function BrandStatementBand() {
  return (
    <section
      className="relative overflow-hidden bg-inverse border-t border-border/60"
      aria-labelledby="statement-band-heading"
    >
      <Image
        src={SITE_IMAGES.statementBand}
        alt=""
        aria-hidden="true"
        fill
        loading="lazy"
        quality={65}
        sizes="(max-width: 768px) 100vw, 1400px"
        className="object-cover opacity-[0.7] img-brand-grade"
      />
      {/* Legibility scrims: darken left (where the text sits) and blend the top
          and bottom edges into the page ground so the band reads as one piece.
          The right side stays light so the photograph carries the band. */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/85 via-inverse/50 to-inverse/15" />
      <div className="absolute inset-x-0 top-0 h-28 pointer-events-none bg-gradient-to-b from-background via-background/40 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 pointer-events-none bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.04 }}
      />

      <div className="relative z-10 container px-4 py-24 md:py-36 lg:py-40">
        <Reveal className="max-w-3xl">
          <div className="brc-label brc-label-on-photo mb-6">{STATEMENT_BAND.eyebrow}</div>
          <p
            id="statement-band-heading"
            className="font-sans font-light text-[2rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.08] tracking-tight text-inverse-foreground"
          >
            {STATEMENT_BAND.statement}{" "}
            <em className="brc-accent">{STATEMENT_BAND.accentWord}</em>.
          </p>
          {/* Sage rule as the brand accent */}
          <div className="mt-8 h-px w-16 bg-accent-legible" />
          <p className="mt-7 max-w-xl text-base md:text-lg leading-relaxed text-inverse-foreground/80">
            {STATEMENT_BAND.support}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
