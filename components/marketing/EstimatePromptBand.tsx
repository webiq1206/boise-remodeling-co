import { ArrowRight, Calculator } from "lucide-react";
import { Section } from "./Section";
import { Reveal } from "@/components/Reveal";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { CTA_PRIMARY } from "@/shared/ctaCopy";

interface EstimatePromptBandProps {
  eyebrow?: string;
  title: React.ReactNode;
  description: string;
  variant?: "greige" | "canvas";
  /** Optional bullet trust points shown beside the CTA on md+. */
  bullets?: string[];
}

/**
 * Contextual estimator prompt for service, area, and content pages.
 * Opens the modal off-home; scrolls to #calculator on the homepage.
 */
export function EstimatePromptBand({
  eyebrow = "Planning your budget",
  title,
  description,
  variant = "greige",
  bullets = [
    "Based on real Treasure Valley project costs",
    "Instant range in about 60 seconds",
    "No obligation - we email you a copy",
  ],
}: EstimatePromptBandProps) {
  return (
    <Section variant={variant} divider>
      <div className="container px-4 max-w-5xl mx-auto">
        <Reveal>
          <div className="marketing-card relative overflow-hidden border-accent-legible/25 p-8 md:p-10 lg:p-12">
            <div className="absolute inset-y-0 left-0 w-1 bg-accent-legible/70" aria-hidden />
            <div className="grid md:grid-cols-[1fr_auto] gap-8 items-center">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-legible/10 text-accent-legible">
                    <Calculator className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div className="brc-label">{eyebrow}</div>
                </div>
                <h2 className="font-serif text-[1.75rem] md:text-[2.25rem] leading-[1.08] tracking-tight text-foreground mb-3">
                  {title}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mb-6">
                  {description}
                </p>
                <ul className="hidden sm:grid sm:grid-cols-1 gap-2 text-sm text-muted-foreground">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="text-accent-legible mt-0.5">·</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col items-stretch sm:items-start gap-3 md:min-w-[200px]">
                <EstimateCTA variant="brand" size="lg" className="w-full sm:w-auto">
                  {CTA_PRIMARY}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </EstimateCTA>
                <p className="text-label text-muted-foreground text-center sm:text-left">
                  Free · Not a binding quote
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
