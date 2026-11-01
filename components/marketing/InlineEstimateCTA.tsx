import { Calculator } from "lucide-react";
import { MarketingCard } from "./MarketingCard";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { CTA_PRIMARY } from "@/shared/ctaCopy";

interface InlineEstimateCTAProps {
  title?: string;
  description?: string;
  className?: string;
}

/** Compact in-article estimator prompt for cost-related blog posts and guides. */
export function InlineEstimateCTA({
  title = "Ready to talk through your project?",
  description = "Request a quote. The free in-home visit ends with a planning range and design direction.",
  className,
}: InlineEstimateCTAProps) {
  return (
    <MarketingCard
      className={`my-10 border-accent-legible/20 bg-surface-greige/50 ${className ?? ""}`}
      padding="lg"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-sm bg-accent-legible/10 text-accent-legible">
          <Calculator className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-sans font-normal text-base text-foreground mb-1">{title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <EstimateCTA block className="flex-shrink-0">
          {CTA_PRIMARY}
        </EstimateCTA>
      </div>
    </MarketingCard>
  );
}
