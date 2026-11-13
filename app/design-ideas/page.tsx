import { InteriorPage } from '@/components/approved/InteriorLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { Section } from '@/components/marketing/Section';
import { ConsultCTA } from '@/components/modals/ConsultCTA';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { PageHeroBand } from '@/components/sections/PageHeroBand';
import { ProjectGallerySection } from '@/components/sections/ProjectGallerySection';
import { JsonLd } from '@/components/seo/JsonLd';
import { AnswerBlock } from '@/components/seo/AnswerBlock';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildPageMetadata } from '@/lib/page-metadata';
import {
generateBreadcrumbSchema,
generateCollectionPageSchema,
} from '@/lib/schema';
import { CTA_PRIMARY,CTA_SECONDARY } from '@/shared/ctaCopy';
import { GALLERY_PROJECTS } from '@/shared/galleryData';
import { GALLERY_IMAGES } from '@/shared/siteImages';
import { ArrowRight } from 'lucide-react';

export const metadata = withBrandPageMetadata((buildPageMetadata({
  kind: 'about',
  path: '/design-ideas',
  titleOverride: 'Remodeling Design Ideas',
  descriptionOverride:
    'Kitchen, bathroom, whole-home and addition design ideas for Treasure Valley homeowners. Explore layouts, cabinetry, tile, lighting and finishes.',
})), "/design-ideas");

export default function DesignIdeasPage() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Design ideas', url: '/design-ideas' },
    ]),
    generateCollectionPageSchema({
      title: 'Remodeling Design Ideas',
      description:
        'Remodeling design inspiration for kitchens, bathrooms, whole homes, and additions across the Treasure Valley.',
      url: '/design-ideas',
      items: GALLERY_PROJECTS.map((p) => ({
        name: p.title,
        url: '/design-ideas#gallery',
      })),
    }),
  ];

  return (
    <InteriorPage kind="gallery">
      <>
        <JsonLd data={schemas} />
        <PageHeroBand
          imageSrc={GALLERY_IMAGES.kitchen.after}
          imageAlt="White kitchen with wood island and brass lighting"
        >
          <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Design ideas' }]} />
          <p className="ed-eyebrow mt-6">Design ideas</p>
          <h1 className="ed-display ed-statement-display mb-8">
            Remodeling design ideas for <em className="brc-accent">Boise</em> homes
          </h1>
          <p className="ed-body max-w-2xl mb-6">
            Browse kitchen, bath, whole-home and addition layouts, materials and finishes.
          </p>
          <div className="flex flex-wrap gap-3">
            <EstimateCTA>{CTA_PRIMARY}</EstimateCTA>
            <ConsultCTA>{CTA_SECONDARY}</ConsultCTA>
          </div>
        </PageHeroBand>
        <AnswerBlock
          question="What are these remodeling design ideas?"
          answer="Explore kitchen layouts, primary bath finishes, whole-home plans, basement spaces, additions and outdoor living. Save the details you like, then bring them to a free in-home visit to discuss your written scope."
        />
        <Section divider>
          <div className="container px-4">
            <p className="ed-body max-w-3xl">
              Bring your layout ideas and finish preferences to a free in-home visit, or{' '}
              <a href="/#request" className="underline underline-offset-2">
                request a quote
              </a>
              .
            </p>
          </div>
        </Section>
        <ProjectGallerySection />
        <EstimatePromptBand title="See what your remodel could cost" description="Answer a few questions and see a preliminary price range on screen. Free, any time, with no appointment." />
        <Section variant="inverse" divider>
          <div className="container px-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="ed-eyebrow text-inverse-muted">Next step</p>
              <h2 className="ed-h2 text-inverse-foreground">Ready to plan your remodel?</h2>
            </div>
            <a
              href="/#request"
              className="inline-flex min-h-12 items-center gap-2 text-inverse-foreground underline underline-offset-4"
              data-cta="primary"
            >
              Request a quote <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </Section>
      </>
    </InteriorPage>
  );
}
