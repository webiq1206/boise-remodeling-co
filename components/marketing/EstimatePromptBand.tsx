import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { familyButtonClass } from "@/components/family/Button";
import { CTA_PRIMARY, CTA_REQUEST, REQUEST_PATH } from "@/shared/ctaCopy";

interface EstimatePromptBandProps {
  eyebrow?: string;
  title: React.ReactNode;
  description: string;
  /** Kept for callers; both now render on the family's gradient ground. */
  variant?: "greige" | "canvas";
  /** Optional bullet trust points shown beside the CTA on md+. */
  bullets?: string[];
}

/**
 * Contextual estimator prompt for service, area and content pages.
 *
 * Owner decision, 13 November 2026: the one action is the central estimator at
 * /instant-estimate, which shows a preliminary range on screen. "Request a
 * quote" sits under it as the path to a person.
 *
 * WAS a card inside a card: a bordered panel with an icon box, a left accent
 * rule and a 36px heading, centred in a 1024px container on a band the same
 * value as its neighbours. It read as a widget.
 *
 * NOW a statement band. The brief asked for large statement sections, and a
 * single prompt with one action is exactly the content that suits one: display
 * heading, a short lede, the CTA. It sits on the family's gradient ground - the
 * one accent-tinted surface on the page - so it marks a pause between the work
 * and the reasons, rather than being another box in a column of boxes.
 */
export function EstimatePromptBand({
  eyebrow = "Planning your budget",
  title,
  description,
  bullets = [
    "Free and open day or night",
    "No appointment needed to see your range",
    "A preliminary range now, a firm written proposal after we visit",
  ],
}: EstimatePromptBandProps) {
  return (
    <Section surface="gradient" spacing="lg" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-end">
          <Reveal>
            <p className="ed-eyebrow ed-eyebrow-accent">{eyebrow}</p>
            <h2 className="ed-h2 ed-statement-wide">{title}</h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-col items-start gap-6">
              <p className="ed-body">{description}</p>
              <EstimateCTA tone="dark" size="lg" block>
                {CTA_PRIMARY}
              </EstimateCTA>
              <p className="ed-small">Free · A preliminary range, not a final price</p>
              <a href={REQUEST_PATH} className={familyButtonClass({ variant: "tertiary" })} data-testid="link-prompt-band-request">
                {CTA_REQUEST}
              </a>
            </div>
          </Reveal>
        </div>

        {bullets.length > 0 && (
          <Reveal delay={120}>
            <ul
              className="ed-matrix mt-[clamp(40px,5vw,72px)] list-none p-0"
              style={{ ["--ed-cols" as string]: Math.min(bullets.length, 3), ["--ed-cell-h" as string]: "0" }}
            >
              {bullets.map((b, i) => (
                <li key={b} style={{ maxWidth: "none", margin: 0 }} className="ed-body flex items-start gap-4 text-[0.875rem]">
                  <span className="ed-small shrink-0 pt-1" style={{ color: "var(--ed-accent)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
