import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Download, FileText, Workflow } from 'lucide-react';
import { buildPageMetadata } from '@/lib/page-metadata';
import { Section } from '@/components/marketing/Section';
import { MarketingCard } from '@/components/marketing/MarketingCard';
import { ALL_RESOURCES_LIST } from '@/shared/guideResources';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
} from '@/lib/schema';

export const metadata: Metadata = buildPageMetadata({
  kind: 'blog',
  path: '/resources',
  titleOverride: 'Remodel Planning Resources | Boise Remodeling Co',
  descriptionOverride:
    'Free PDF worksheets and visual guides for Treasure Valley remodeling: budget worksheet, kitchen & bath checklist, Ada vs Canyon permits.',
});

export default function ResourcesIndexPage() {
  const pdfs = ALL_RESOURCES_LIST.filter((r) => r.kind === 'pdf');
  const visuals = ALL_RESOURCES_LIST.filter((r) => r.kind === 'visual');

  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Resources', url: '/resources' },
    ]),
    generateCollectionPageSchema({
      title: 'Remodel Planning Resources',
      description:
        'Free PDF worksheets and visual guides for Treasure Valley remodeling: budget worksheet, kitchen & bath checklist, Ada vs Canyon permits.',
      url: '/resources',
      items: ALL_RESOURCES_LIST.map((r) => ({
        name: r.title,
        url: r.href,
      })),
    }),
  ];

  return (
    <Section spacing="default" className="pt-28 md:pt-32">
      <JsonLd data={schemas} />
      <div className="container px-4 max-w-4xl mx-auto">
        <p className="text-xs font-normal uppercase tracking-wider text-accent-legible mb-3">
          Free downloads
        </p>
        <h1 className="text-3xl md:text-4xl font-serif tracking-tight text-foreground mb-4">
          Remodel planning resources
        </h1>
        <p className="text-lg text-muted-foreground mb-5 max-w-2xl">
          Printable PDFs and visual guides to use alongside our{' '}
          <Link href="/guides" className="text-accent-legible hover:underline">
            remodeling guides
          </Link>
          . These are planning tools - not quotes or contracts.
        </p>
        <p className="text-base text-muted-foreground mb-4 max-w-2xl leading-relaxed">
          We built these worksheets from the same process we use on real Treasure Valley
          projects: a budget worksheet to pressure-test your planning range before you talk to
          anyone, a scope checklist so nothing gets missed between design and construction, and a
          visual walkthrough of the Ada and Canyon County permit flow so you know what approvals a
          Boise, Meridian, Eagle or Nampa remodel actually needs.
        </p>
        <p className="text-base text-muted-foreground mb-12 max-w-2xl leading-relaxed">
          Download any of them for free, no email required. When you are ready, you can bring your
          notes to a{' '}
          <Link href="/contact" className="text-accent-legible hover:underline">
            free in-home consultation
          </Link>{' '}
          and we will turn them into a written scope and an honest planning range for your home.
        </p>

        <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-4">
          PDF worksheets
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          {pdfs.map((r) => (
            <MarketingCard key={r.id} className="p-5 flex flex-col h-full">
              <FileText className="h-5 w-5 text-accent-legible mb-3" />
              <h3 className="font-normal mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-4">{r.description}</p>
              <a
                href={r.href}
                download
                className="inline-flex items-center min-h-11 lg:min-h-0 text-sm text-accent-legible hover:underline font-normal"
              >
                <Download className="h-4 w-4 mr-1" />
                Download PDF
              </a>
            </MarketingCard>
          ))}
        </div>

        <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-4">
          Visual guides
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {visuals.map((r) => (
            <MarketingCard key={r.id} className="p-5 flex flex-col h-full">
              <Workflow className="h-5 w-5 text-accent-legible mb-3" />
              <h3 className="font-normal mb-2">{r.title}</h3>
              <p className="text-sm text-muted-foreground flex-1 mb-4">{r.description}</p>
              <Link
                href={r.href}
                className="inline-flex items-center min-h-11 lg:min-h-0 text-sm text-accent-legible hover:underline font-normal"
              >
                View infographic
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </MarketingCard>
          ))}
        </div>

        <p className="text-sm text-muted-foreground mt-12 text-center">
          <Link href="/guides/boise-remodeling-cost-guide" className="text-accent-legible hover:underline">
            Start with the cost guide
          </Link>
          {' · '}
          <Link href="/contact" className="text-accent-legible hover:underline">
            Schedule a consultation
          </Link>
        </p>
      </div>
    </Section>
  );
}
