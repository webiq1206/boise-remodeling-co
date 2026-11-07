import { FamilyButton } from '@/components/family/Button';
import { PageHeroBand } from '@/components/sections/PageHeroBand';
import { JsonLd } from '@/components/seo/JsonLd';
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema';
import { ADU_FAQS, ADU_QUOTE_URL, AEO } from '@/shared/content/p5Visibility';
import { AeoParagraph } from './AeoParagraph';
import { VisibleFaqs } from './VisibleFaqs';

const HERO = '/images/blog/multigenerational-living-remodels.webp';

/**
 * /services/adu stays live as a hand-off. One H1, one page CTA, two FAQs.
 * No call, text, or consultation action on this page.
 */
export function AduHandoff() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Services', url: '/services' },
      { name: 'ADU', url: '/services/adu' },
    ]),
    generateFAQSchema(ADU_FAQS),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <PageHeroBand imageSrc={HERO} imageAlt="Living area with a kitchenette, a sofa and a doorway to a bedroom">
        <p className="ed-eyebrow mt-8" style={{ color: 'rgb(255 255 255 / 0.72)' }}>
          P5 Home Co
        </p>
        <h1 className="ed-display ed-statement-display text-inverse-foreground">
          Start your ADU request with Boise ADU Co
        </h1>
        <AeoParagraph text={AEO.adu} tone="inverse" />
        <FamilyButton href={ADU_QUOTE_URL} variant="hero" size="lg">
          Start your ADU request
        </FamilyButton>
      </PageHeroBand>
      <VisibleFaqs faqs={ADU_FAQS} heading="ADU questions" />
    </>
  );
}
