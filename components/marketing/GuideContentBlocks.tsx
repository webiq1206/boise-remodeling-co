import Link from 'next/link';
import type { TocHeading } from '@/lib/content-utils';

interface GuideContentBlocksProps {
  quickAnswer?: string;
  keyTakeaways?: string[];
  children: React.ReactNode;
}

export function GuideContentBlocks({
  quickAnswer,
  keyTakeaways,
  children,
}: GuideContentBlocksProps) {
  return (
    <div className="space-y-8">
      {quickAnswer && (
        <div
          className="quick-answer rounded-lg border border-accent/20 bg-accent/5 p-5 md:p-6"
          data-speakable="summary"
        >
          <p className="text-xs font-normal uppercase tracking-wider text-accent-legible mb-2">Quick answer</p>
          <p className="text-foreground leading-relaxed">{quickAnswer}</p>
        </div>
      )}

      {keyTakeaways && keyTakeaways.length > 0 && (
        <div className="key-takeaways rounded-lg border border-border bg-muted/30 p-5 md:p-6">
          <p className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-3">
            Key takeaways
          </p>
          <ul className="space-y-2 text-sm md:text-base text-foreground list-disc pl-5">
            {keyTakeaways.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {children}
    </div>
  );
}

interface GuideJumpChipsProps {
  headings: TocHeading[];
}

/** Mobile-friendly jump links for top-level sections. */
export function GuideJumpChips({ headings }: GuideJumpChipsProps) {
  const h2s = headings.filter((h) => h.level === 2).slice(0, 5);
  if (h2s.length < 2) return null;

  return (
    <nav className="lg:hidden mb-6" aria-label="Jump to section" data-testid="guide-jump-chips">
      <p className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-2">
        Jump to
      </p>
      <div className="flex flex-wrap gap-2">
        {h2s.map((h) => (
          <Link
            key={h.id}
            href={`#${h.id}`}
            className="inline-flex items-center min-h-11 lg:min-h-0 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-foreground hover:bg-muted transition-colors"
          >
            {h.text.length > 42 ? `${h.text.slice(0, 40)}…` : h.text}
          </Link>
        ))}
      </div>
    </nav>
  );
}

interface GuideSidebarTocProps {
  headings: TocHeading[];
}

export function GuideSidebarToc({ headings }: GuideSidebarTocProps) {
  if (!headings || headings.length < 2) return null;

  return (
    <nav
      className="rounded-lg border border-border p-4 mb-4 max-h-[min(50vh,20rem)] overflow-y-auto"
      aria-label="Table of contents"
      data-testid="guide-toc"
    >
      <p className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      <ol className="space-y-1 text-sm">
        {headings.map((h) => (
          <li
            key={h.id}
            className={h.level === 3 ? 'ml-3 list-[circle]' : 'list-decimal ml-4'}
          >
            <a
              href={`#${h.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors leading-snug"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
