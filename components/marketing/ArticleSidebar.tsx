import { ArrowRight, Calculator } from 'lucide-react';
import { MarketingCard } from './MarketingCard';
import { GuideSidebarToc } from './GuideContentBlocks';
import type { TocHeading } from '@/lib/content-utils';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { CTA_PRIMARY } from '@/shared/ctaCopy';
import { BusinessPhoneContact } from '@/components/BusinessPhoneContact';

interface ArticleSidebarProps {
  tocHeadings: TocHeading[];
  ctaDescription?: string;
}

export function ArticleSidebar({
  tocHeadings,
  ctaDescription = 'Get an instant planning range for your project before you commit to anything.',
}: ArticleSidebarProps) {
  return (
    <>
      <GuideSidebarToc headings={tocHeadings} />
      <ArticleSidebarCta description={ctaDescription} />
    </>
  );
}

export function ArticleSidebarCta({ description }: { description: string }) {
  return (
    <MarketingCard data-article-sidebar-cta className="cta-card-dark relative overflow-hidden border-accent-legible/30">
      <div className="absolute inset-y-0 left-0 w-1 bg-accent-legible/70" aria-hidden />
      <div className="min-w-0 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-sm bg-accent-legible/15">
            <Calculator className="h-5 w-5 text-accent-legible" strokeWidth={1.5} />
          </div>
          <h3 className="font-normal text-sm text-inverse-foreground">Instant estimate</h3>
        </div>
        <p className="text-sm text-inverse-muted">{description}</p>
        <EstimateCTA variant="brand" size="sm" className="h-auto min-h-11 w-full gap-2 whitespace-normal px-3 py-3 text-center">
          <span className="min-w-0 flex-1">{CTA_PRIMARY}</span>
          <ArrowRight className="h-4 w-4 shrink-0" />
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
