import { InteriorPage } from '@/components/approved/InteriorLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { Section } from '@/components/marketing/Section';
import { ConsultCTA } from '@/components/modals/ConsultCTA';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { PageHeroBand } from '@/components/sections/PageHeroBand';
import { ProjectGallerySection } from '@/components/sections/ProjectGallerySection';
import { JsonLd } from '@/components/seo/JsonLd';
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
    'Kitchen, bathroom, whole-home, and addition design inspiration for Treasure Valley homeowners. Captioned for materials and layout, not invented project records.',
})), "/design-ideas");

export default function DesignIdeasPage() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Design Ideas', url: '/design-ideas' },
    ]),
    generateCollectionPageSchema({
      title: 'Remodeling Design Ideas',
      description:
        'Remodeling design inspiration for kitchens, bathrooms, whole homes, and additions across the Treasure Valley.',
      url: '/design-ideas',
      items: GALLERY_PROJECTS.map((p) => ({
        name: p.title,
        url: `/design-ideas#${p.id}`,
      })),
    }),
  ];

  return (
    <InteriorPage kind="gallery">
      <>
        <JsonLd data={schemas} />
        <PageHeroBand
          eyebrow="Design ideas"
          title={
            <>
              Remodeling design ideas for{' '}
              <em className="brc-accent">Boise</em> homes
            </>
          }
          description="Browse kitchen, bath, whole-home and addition layouts. Images are captioned for materials and design, not as completed customer jobs."
          imageSrc={GALLERY_IMAGES.kitchenAfter}
          imageAlt="White kitchen with wood island and brass lighting"
          breadcrumbs={<Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Design Ideas' }]} />}
          actions={
            <>
              <EstimateCTA>{CTA_PRIMARY}</EstimateCTA>
              <ConsultCTA variant="outline">{CTA_SECONDARY}</ConsultCTA>
            </>
          }
        />
        <Section divider>
          <div className="container px-4">
            <p className="ed-body max-w-3xl">
              Want to see finished work when we publish it? Ask for references on your free visit, or{' '}
              <a href="/#request" className="underline underline-offset-2">
                request a quote
              </a>
              .
            </p>
          </div>
        </Section>
        <ProjectGallerySection />
        <EstimatePromptBand />
        <Section variant="charcoal" divider>
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
