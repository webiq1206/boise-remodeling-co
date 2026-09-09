import { ArrowRight } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Section } from '@/components/marketing/Section';
import { ProjectGallerySection } from '@/components/sections/ProjectGallerySection';
import { PageHeroBand } from '@/components/sections/PageHeroBand';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { buildPageMetadata } from '@/lib/page-metadata';
import { CTA_PRIMARY, CTA_SECONDARY } from '@/shared/ctaCopy';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { ConsultCTA } from '@/components/modals/ConsultCTA';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
} from '@/lib/schema';
import { GALLERY_PROJECTS } from '@/shared/galleryData';
import { GALLERY_IMAGES } from '@/shared/siteImages';

export const metadata = buildPageMetadata({
  kind: 'about',
  path: '/testimonials',
  titleOverride: 'Remodeling Inspiration',
  descriptionOverride:
    'Kitchen, bathroom, whole-home, and addition design inspiration for Treasure Valley homeowners. Representative imagery, not completed customer projects.',
});

export default function TestimonialsPage() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Remodeling Inspiration', url: '/testimonials' },
    ]),
    generateCollectionPageSchema({
      title: 'Remodeling Inspiration',
      description:
        'Representative remodeling design inspiration for kitchens, bathrooms, whole homes, and additions.',
      url: '/testimonials',
      items: GALLERY_PROJECTS.map((p) => ({
        name: p.title,
        url: `/services/${p.serviceType}/${p.city}`,
      })),
    }),
  ];

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <JsonLd data={schemas} />

      <PageHeroBand
        imageSrc={GALLERY_IMAGES.kitchen.after}
        imageAlt="Representative modern kitchen design inspiration"
        scrim={0.75}
      >
        <Breadcrumbs
          items={[
            { name: 'Home', href: '/' },
            { name: 'Remodeling Inspiration' },
          ]}
        />
        <p className="ed-eyebrow mt-8" style={{ color: "rgb(255 255 255 / 0.72)" }}>Design inspiration</p>
        <h1 className="ed-display ed-statement-display text-inverse-foreground">
          Imagine the <em className="brc-accent">possibilities</em> for your home
        </h1>
        <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-8">
          Explore representative design ideas for your next remodel. These images are inspiration,
          not photographs of specific completed customer projects.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap [&>*]:w-full sm:[&>*]:w-auto">
          <EstimateCTA variant="brand">
            {CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
          </EstimateCTA>
          <ConsultCTA variant="heroOutline">{CTA_SECONDARY}</ConsultCTA>
        </div>
      </PageHeroBand>

      <ProjectGallerySection limit={GALLERY_PROJECTS.length} showViewAll={false} />

      <EstimatePromptBand
        eyebrow="Planning your project"
        title={
          <>
            Curious what your remodel might{' '}
            <em className="brc-accent">cost</em>?
          </>
        }
        description="After seeing what's possible, get an instant planning range tailored to Treasure Valley project costs - then book a free in-home visit for a written scope."
      />

      <Section surface="gradient" spacing="xl" edge>
        <div className="ed-shell">
          <div className="ed-split ed-split-center">
            <h2 className="ed-h2-sm ed-statement-wide">
              Ready to start your project?
            </h2>
              <div>
            <p className="ed-body">
              Schedule a free in-home visit for planning guidance, design direction, and an honest
              project range.
            </p>
            <div className="mt-8"><EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
</div>

              </div>          </div>
        </div>
      </Section>
    </div>
  );
}
