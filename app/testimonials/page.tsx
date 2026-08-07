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
  titleOverride: 'Our Work',
  descriptionOverride:
    'Treasure Valley remodeling transformations by Boise Remodeling Co: kitchen, bathroom, whole-home, and addition projects with before-and-after comparisons.',
});

export default function TestimonialsPage() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Projects & Reviews', url: '/testimonials' },
    ]),
    generateCollectionPageSchema({
      title: 'Our Work',
      description:
        'Treasure Valley remodeling transformations from Boise Remodeling Co: kitchen, bath, whole-home, and addition projects.',
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
        imageAlt="After: modern kitchen remodel in Boise Idaho"
        scrim={0.75}
      >
        <Breadcrumbs
          items={[
            { name: 'Home', href: '/' },
            { name: 'Our Work' },
          ]}
        />
        <div className="brc-label text-inverse-muted mt-6 mb-4">Before &amp; after</div>
        <h1 className="font-sans font-light text-display tracking-tight text-inverse-foreground max-w-3xl mb-4">
          Our <em className="brc-accent">work</em> across the Treasure Valley
        </h1>
        <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-8">
          Explore recent design-build transformations. Drag any slider to compare the before and after,
          then picture the same clarity and craftsmanship in your home.
        </p>
        <div className="flex flex-wrap gap-3">
          <EstimateCTA variant="brand">
            {CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
          </EstimateCTA>
          <ConsultCTA variant="heroGhost">{CTA_SECONDARY}</ConsultCTA>
        </div>
      </PageHeroBand>

      <ProjectGallerySection showViewAll={false} />

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

      <Section divider spacing="sm">
        <div className="container px-4 max-w-2xl mx-auto">
          <div className="marketing-card p-10 md:p-12 text-center">
            <h2 className="font-sans font-light text-section-title mb-4 text-foreground">
              Ready to start your project?
            </h2>
            <p className="text-base text-muted-foreground mb-8">
              Schedule a free in-home visit for planning guidance, design direction, and an honest
              project range.
            </p>
            <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
          </div>
        </div>
      </Section>
    </div>
  );
}
