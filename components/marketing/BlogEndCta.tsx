import { ArrowRight, MessageSquare } from "lucide-react";
import { Section } from "./Section";
import { Button } from "@/components/ui/button";
import { CTA_PRIMARY } from "@/shared/ctaCopy";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { SaveContactLink } from "@/components/SaveContactLink";

/**
 * The closing ask on every article, guide and area page.
 *
 * WAS a dark card centred in a 896px column - a box at the end of a page. NOW
 * the same gradient statement band every other page closes on. It is a full-
 * width band, so callers render it bare - not inside a page container. A first
 * cut pulled it out of the container with a negative margin instead; measured,
 * that overflowed the viewport by 24px on the areas page at every width.
 */
export function BlogEndCta() {
  return (
    <Section surface="gradient" spacing="xl" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-center">
          <div>
            <p className="ed-eyebrow ed-eyebrow-accent">Start your project</p>
      <h2 className="ed-h2 ed-statement">
        Ready to start your project?
      </h2>
      </div>
      <div>
      <p className="ed-body">
        Get an instant planning range in 60 seconds, then book a free in-home visit when you&apos;re
        ready. No obligation, no pressure.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
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
    </div>
        </div>
      </div>
    </Section>
  );
}
