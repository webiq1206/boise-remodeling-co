import { Calculator } from 'lucide-react';
import { MarketingCard } from './MarketingCard';
import { GuideSidebarToc } from './GuideContentBlocks';
import type { TocHeading } from '@/lib/content-utils';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { CTA_PRIMARY, CTA_REQUEST } from '@/shared/ctaCopy';
import { BusinessPhoneContact } from '@/components/BusinessPhoneContact';

type ArticleCtaDestination = 'estimator' | 'request';

interface ArticleSidebarProps {
  tocHeadings: TocHeading[];
  /** "request" keeps the request form, for subjects the estimator cannot price. */
  destination?: ArticleCtaDestination;
}

export function ArticleSidebar({ tocHeadings, destination = 'estimator' }: ArticleSidebarProps) {
  return (
    <>
      <GuideSidebarToc headings={tocHeadings} />
      <ArticleSidebarCta destination={destination} />
    </>
  );
}

/**
 * The article rail's one action. Estimator (owner decision, 13 November 2026):
 * the central estimator, with the phone beneath it as the path to a person.
 * Request: the short request form, as before.
 */
export function ArticleSidebarCta({ destination = 'estimator' }: { destination?: ArticleCtaDestination }) {
  const request = destination === 'request';
  const description = request
    ? 'Tell us about the work. The free in-home visit ends with a planning range and design direction.'
    : 'Answer a few questions and see a preliminary price range on screen. Free, with no appointment.';
  return (
    <MarketingCard data-article-sidebar-cta className="cta-card-dark relative overflow-hidden border-accent-legible/30">
      <div className="absolute inset-y-0 left-0 w-1 bg-accent-legible/70" aria-hidden />
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-accent-legible/15">
            <Calculator className="h-5 w-5 text-accent-legible" strokeWidth={1.5} />
          </div>
          <h3 className="font-normal text-sm text-inverse-foreground">{request ? 'Talk through your project' : 'Price your project'}</h3>
        </div>
        <p className="text-sm text-inverse-muted">{description}</p>
        <EstimateCTA tone="dark" className="fam-btn--block" destination={destination}>
          {request ? CTA_REQUEST : CTA_PRIMARY}
        </EstimateCTA>
        <BusinessPhoneContact
          layout="stack"
          className="items-center"
          phoneClassName="inline-flex min-h-11 items-center whitespace-nowrap text-xs text-inverse-muted hover:text-inverse-foreground transition-colors"
          saveClassName="inline-flex min-h-11 items-center whitespace-nowrap text-xs text-inverse-muted hover:text-inverse-foreground transition-colors"
          showPhoneIcon
          iconClassName="h-3 w-3"
          phoneTestId="link-sidebar-phone"
        />
      </div>
    </MarketingCard>
  );
}
