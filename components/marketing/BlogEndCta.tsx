import { Section } from "./Section";
import { familyButtonClass } from "@/components/family/Button";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/shared/ctaCopy";
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
const link = familyButtonClass({ variant: "tertiary" });

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
        Get a preliminary planning range online, then book a free in-home visit when you&apos;re
        ready. No obligation, no pressure.
      </p>
      {/* One primary action (C5); the visit, call and text are tertiary text links. */}
      <div className="mt-8 flex flex-col items-start gap-4">
        <EstimateCTA tone="dark" size="lg" block data-testid="link-bottom-cta-estimate">
          {CTA_PRIMARY}
        </EstimateCTA>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <a href="/contact#consult" className={link} data-testid="link-bottom-cta-consult">
            {CTA_SECONDARY}
          </a>
          <BusinessPhoneLink data-testid="link-bottom-cta-call" className={link}>
            Call {SITE_CONFIG.phone}
          </BusinessPhoneLink>
          <a href={SITE_CONFIG.phoneSmsHref} data-testid="link-bottom-cta-text" className={link}>
            Text us
          </a>
          <SaveContactLink className={link}>Save to contacts</SaveContactLink>
        </div>
      </div>
    </div>
        </div>
      </div>
    </Section>
  );
}
