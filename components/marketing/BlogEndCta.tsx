import { ArrowRight, MessageSquare } from "lucide-react";
import { MarketingCard } from "./MarketingCard";
import { Button } from "@/components/ui/button";
import { CTA_PRIMARY } from "@/shared/ctaCopy";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { SaveContactLink } from "@/components/SaveContactLink";

export function BlogEndCta() {
  return (
    <MarketingCard className="cta-card-dark p-10 md:p-16 text-center max-w-4xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-serif tracking-tight mb-4 text-inverse-foreground">
        Ready to start your project?
      </h2>
      <p className="text-inverse-muted mb-8 max-w-lg mx-auto">
        Get an instant planning range in 60 seconds, then book a free in-home visit when you&apos;re
        ready. No obligation, no pressure.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <EstimateCTA variant="brand" size="lg" data-testid="link-bottom-cta-estimate">
          {CTA_PRIMARY}
          <ArrowRight className="ml-2 h-5 w-5" />
        </EstimateCTA>
        <Button variant="heroGhost" size="lg" asChild data-testid="link-bottom-cta-consult">
          <a href="/contact#consult">Book a free visit</a>
        </Button>
        <div className="flex flex-col items-center gap-1">
          <BusinessPhoneLink
            data-testid="link-bottom-cta-call"
            showIcon
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-inverse-foreground/30 bg-inverse-foreground/10 px-4 py-2 min-h-11 text-sm font-normal text-inverse-foreground transition-colors hover-elevate"
          />
          <SaveContactLink className="text-xs text-inverse-muted hover:text-inverse-foreground transition-colors">
            Save to contacts
          </SaveContactLink>
        </div>
        <a
          href={SITE_CONFIG.phoneSmsHref}
          data-testid="link-bottom-cta-text"
          className="inline-flex items-center justify-center gap-2 rounded-sm border border-inverse-foreground/30 bg-inverse-foreground/10 px-4 py-2 min-h-11 text-sm font-normal text-inverse-foreground transition-colors hover-elevate"
        >
          <MessageSquare className="h-4 w-4" />
          Text us
        </a>
      </div>
    </MarketingCard>
  );
}
