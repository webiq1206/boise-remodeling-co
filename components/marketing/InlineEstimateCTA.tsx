import { Calculator } from "lucide-react";
import { MarketingCard } from "./MarketingCard";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { CTA_PRIMARY, CTA_REQUEST } from "@/shared/ctaCopy";

interface InlineEstimateCTAProps {
  title?: string;
  description?: string;
  className?: string;
  /** "request" keeps the request form, for subjects the estimator cannot price. */
  destination?: "estimator" | "request";
}

/** Compact in-article estimator prompt for cost-related blog posts and guides. */
export function InlineEstimateCTA({
  title,
  description,
  className,
  destination = "estimator",
}: InlineEstimateCTAProps) {
  const request = destination === "request";
  const heading = title ?? (request ? "Ready to talk through your project?" : "Want a number for your own project?");
  const body =
    description ??
    (request
      ? "Request a quote. The free in-home visit ends with a planning range and design direction."
      : "Answer a few questions and see a preliminary price range on screen. Free, with no appointment.");
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
          <p className="font-sans font-normal text-base text-foreground mb-1">{heading}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
        </div>
        <EstimateCTA block className="flex-shrink-0" destination={destination}>
          {request ? CTA_REQUEST : CTA_PRIMARY}
        </EstimateCTA>
      </div>
    </MarketingCard>
  );
}
