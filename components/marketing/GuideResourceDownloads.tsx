import Link from 'next/link';
import { Download, FileText, Workflow } from 'lucide-react';
import type { GuideResource } from '@/shared/guideResources';

interface GuideResourceDownloadsProps {
  resources: GuideResource[];
}

export function GuideResourceDownloads({ resources }: GuideResourceDownloadsProps) {
  if (resources.length === 0) return null;

  return (
    <div
      className="rounded-lg border border-border bg-background p-5 md:p-6 mb-8"
      data-testid="guide-resources"
    >
      <p className="text-xs font-normal uppercase tracking-wider text-accent-legible mb-2">
        Free planning tools
      </p>
      <h2 className="text-base font-normal text-foreground mb-2">Downloads & visual guides</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Print these worksheets or save the PDFs for your remodel planning folder.
      </p>
      <ul className="space-y-3">
        {resources.map((resource) => (
          <li key={resource.id}>
            <ResourceRow resource={resource} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground mt-4">
        All resources are planning aids, not quotes or contracts.{' '}
        <Link href="/resources" className="text-accent-legible hover:underline">
          View all resources
        </Link>
      </p>
    </div>
  );
}

function ResourceRow({ resource }: { resource: GuideResource }) {
  const Icon = resource.kind === 'pdf' ? FileText : Workflow;
  const isExternalPdf = resource.href.endsWith('.pdf');

  return (
    <div className="flex gap-3 items-start rounded-md border border-border/80 p-3 bg-muted/20">
      <div className="flex items-center justify-center w-9 h-9 rounded-md bg-accent/10 shrink-0">
        <Icon className="h-4 w-4 text-accent-legible" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-normal text-foreground">{resource.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{resource.description}</p>
        {resource.fileLabel && (
          <p className="text-xs text-muted-foreground/80 mt-1">{resource.fileLabel}</p>
        )}
      </div>
      {isExternalPdf ? (
        <a
          href={resource.href}
          download
          className="inline-flex items-center gap-1.5 min-h-11 md:min-h-0 text-sm text-accent-legible hover:underline shrink-0 font-normal"
          data-testid={`download-${resource.id}`}
        >
          <Download className="h-4 w-4" />
          PDF
        </a>
      ) : (
        <Link
          href={resource.href}
          className="inline-flex items-center gap-1.5 min-h-11 md:min-h-0 text-sm text-accent-legible hover:underline shrink-0 font-normal"
        >
          View
          <Download className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
