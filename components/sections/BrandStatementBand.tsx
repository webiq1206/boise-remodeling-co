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

      {/* The one place below the hero that uses the display size: a statement
          band is a pause, and its heading should be the largest thing on the
          screen when it arrives. Sans-light became the serif so it speaks in
          the same voice as every other heading on the page. */}
      <div className="ed-shell relative z-10 py-[var(--ed-pad-lg)]" data-contrast-skip>
        <Reveal className="max-w-[24ch]">
          <p className="ed-eyebrow" style={{ color: "rgb(255 255 255 / 0.72)" }}>
            {STATEMENT_BAND.eyebrow}
          </p>
          <p id="statement-band-heading" className="ed-display text-inverse-foreground">
            {STATEMENT_BAND.statement}{" "}
            <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
              {STATEMENT_BAND.accentWord}
            </em>
            .
          </p>
          <p className="ed-lede mt-9 max-w-[40ch] text-inverse-foreground/85">
            {STATEMENT_BAND.support}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
