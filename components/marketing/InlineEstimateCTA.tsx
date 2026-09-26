import { ArrowRight, Calculator } from "lucide-react";
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
  title = "See what your project might cost",
  description = "Get a preliminary planning range based on real Treasure Valley remodel costs, with no obligation.",
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
        <EstimateCTA variant="brand" className="flex-shrink-0 w-full sm:w-auto">
          {CTA_PRIMARY}
          <ArrowRight className="ml-2 h-4 w-4" />
        </EstimateCTA>
      </div>
    </MarketingCard>
  );
}
