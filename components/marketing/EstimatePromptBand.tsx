import { ArrowRight } from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { CTA_PRIMARY } from "@/shared/ctaCopy";

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
 * Opens the modal off-home; scrolls to #calculator on the homepage.
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
    "Based on real Treasure Valley project costs",
    "Instant range in about 60 seconds",
    "No obligation - we email you a copy",
  ],
}: EstimatePromptBandProps) {
  return (
    <Section surface="gradient" spacing="xl" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-end">
          <Reveal>
            <p className="ed-eyebrow ed-eyebrow-accent">{eyebrow}</p>
            <h2 className="ed-h2 ed-statement-wide">{title}</h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="flex flex-col items-start gap-6">
              <p className="ed-body">{description}</p>
              <EstimateCTA variant="brand" size="lg" className="w-full sm:w-auto">
                {CTA_PRIMARY}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </EstimateCTA>
              <p className="ed-small">Free · Not a binding quote</p>
            </div>
          </Reveal>
        </div>

        {bullets.length > 0 && (
          <Reveal delay={120}>
            <ul
              className="mt-[clamp(40px,5vw,72px)] grid list-none gap-6 border-t pt-8 sm:grid-cols-3"
              style={{ borderColor: "var(--ed-line)" }}
            >
              {bullets.map((b, i) => (
                <li key={b} className="ed-body flex items-start gap-4 text-[0.875rem]">
                  <span className="ed-small pt-1" style={{ color: "var(--ed-accent)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </Section>
  );
}
