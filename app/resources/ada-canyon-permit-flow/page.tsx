import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { buildPageMetadata } from '@/lib/page-metadata';
import { Section } from '@/components/marketing/Section';
import { PermitFlowGraphic } from './PermitFlowGraphic';
import { EstimateCTA } from '@/components/modals/EstimateCTA';
import { CTA_PRIMARY } from '@/shared/ctaCopy';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateHowToSchema,
} from '@/lib/schema';

const PERMIT_FLOW_DESCRIPTION =
  'Visual guide to remodeling permits in Ada and Canyon County - jurisdiction, review steps, and inspections for Treasure Valley homeowners.';

export const metadata: Metadata = buildPageMetadata({
  kind: 'blog',
  path: '/resources/ada-canyon-permit-flow',
  titleOverride: 'Ada vs Canyon County Permit Flow | Boise Remodeling Co',
  descriptionOverride: PERMIT_FLOW_DESCRIPTION,
});

export default function AdaCanyonPermitFlowPage() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Resources', url: '/resources' },
      { name: 'Ada vs Canyon County Permit Flow', url: '/resources/ada-canyon-permit-flow' },
    ]),
    generateArticleSchema({
      title: 'Ada vs Canyon County Permit Flow',
      description: PERMIT_FLOW_DESCRIPTION,
      publishedAt: '2026-05-01',
      slug: 'ada-canyon-permit-flow',
      pathPrefix: 'resources',
    }),
    generateHowToSchema({
      name: 'How remodeling permits move through Ada and Canyon County',
      description: PERMIT_FLOW_DESCRIPTION,
      url: '/resources/ada-canyon-permit-flow',
      steps: [
        { name: 'Confirm jurisdiction', text: 'Determine whether your address falls under Ada County, Canyon County, or a specific city building department.' },
        { name: 'Prepare and submit plans', text: 'Submit construction documents - including structural and MEP sheets for layout changes - through the correct county or city portal.' },
        { name: 'Plan review', text: 'The building department reviews plans for code compliance; layout and structural remodels often need several weeks of review.' },
        { name: 'Permit issuance', text: 'Pay fees and receive approved permits before covered construction begins.' },
        { name: 'Inspections', text: 'Schedule required inspections at framing, rough-in, and final stages as construction progresses.' },
      ],
    }),
  ];

  return (
    <div className="flex flex-col pb-20">
      <JsonLd data={schemas} />
      <Section spacing="default" className="pt-28 md:pt-32">
        <div className="container px-4 max-w-4xl mx-auto">
          <Link
            href="/resources"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Planning resources
          </Link>

          <p className="text-xs font-normal uppercase tracking-wider text-accent-legible mb-3">
            Visual guide
          </p>
          <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground mb-4">
            Ada vs Canyon County permit flow
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl">
            A step-by-step view of how remodeling permits move through review and inspections in
            the Treasure Valley. Timelines vary by project scope.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <a
              href="/downloads/ada-canyon-permit-guide.pdf"
              download
              className="inline-flex items-center gap-2 rounded-md bg-accent text-accent-foreground px-4 py-2 text-sm font-normal hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Download PDF reference
            </a>
            <Link
              href="/blog/ada-vs-canyon-county-permit-timelines"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-muted/50"
            >
              Read full article
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <PermitFlowGraphic />

          <div className="mt-12 prose-measure text-sm text-muted-foreground space-y-4">
            <p>
              <strong className="text-foreground">Note:</strong> HOAs in Eagle, Harris Ranch,
              Hidden Springs, and similar communities may require architectural review in addition
              to county permits.
            </p>
            <p>
              Design-build contracts should state who submits plans, pays fees, and schedules
              inspections. Cosmetic work without layout changes may not need the full path below.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <EstimateCTA variant="brand">
              {CTA_PRIMARY}
              <ArrowRight className="ml-2 h-4 w-4" />
            </EstimateCTA>
            <Link
              href="/guides/boise-remodeling-process-guide"
              className="inline-flex items-center min-h-11 lg:min-h-0 text-sm text-accent-legible hover:underline"
            >
              Remodeling process guide
            </Link>
          </div>
        </div>
      </Section>
    </div>
  );
}
