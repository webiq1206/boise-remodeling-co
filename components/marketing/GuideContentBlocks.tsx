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

/** Phone and tablet contents: one closed row that opens to every section, in place of a wall of chips. */
export function GuideJumpChips({ headings }: GuideJumpChipsProps) {
  const h2s = headings.filter((h) => h.level === 2);
  if (h2s.length < 2) return null;

  return (
    <details className="lx-toc lg:hidden" data-testid="guide-jump-chips">
      <summary>
        <span>On this page</span>
        <span className="lx-toc-count">{h2s.length} sections</span>
      </summary>
      <nav aria-label="Jump to section">
        <ol>
          {h2s.map((h) => (
            <li key={h.id}>
              <Link href={`#${h.id}`}>{h.text}</Link>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  );
}

export { GuideSidebarToc } from './GuideSidebarToc';
