import {
  splitHtmlByH2,
  shouldUseCollapsibleSections,
} from '@/lib/split-article-sections';
import {
  ArticleInlineFigure,
  type ArticleInlineFigureProps,
} from './ArticleInlineFigure';

export interface ArticleInlineFigurePlacement extends ArticleInlineFigureProps {
  /** Insert figure after this 0-based section index. */
  afterSectionIndex: number;
}

interface SectionedArticleProps {
  html: string;
  /** How many sections stay expanded by default (long articles). */
  defaultOpenCount?: number;
  testId?: string;
  /** When true, never collapse - render the full article inline (guides). */
  forceExpanded?: boolean;
  /** Optional editorial figures inserted between H2 sections. */
  inlineFigures?: ArticleInlineFigurePlacement[];
}

function InlineFigureSlot({
  sectionIndex,
  figures,
}: {
  sectionIndex: number;
  figures: ArticleInlineFigurePlacement[];
}) {
  const matches = figures.filter((f) => f.afterSectionIndex === sectionIndex);
  if (matches.length === 0) return null;
  return (
    <>
      {matches.map((figure) => (
        <ArticleInlineFigure
          key={`${figure.src}-${figure.afterSectionIndex}`}
          src={figure.src}
          alt={figure.alt}
          caption={figure.caption}
        />
      ))}
    </>
  );
}

function renderSectionBody(
  sectionIndex: number,
  bodyHtml: string,
  inlineFigures: ArticleInlineFigurePlacement[],
  className: string,
) {
  return (
    <>
      <div className={className} dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <InlineFigureSlot sectionIndex={sectionIndex} figures={inlineFigures} />
    </>
  );
}

export function SectionedArticle({
  html,
  defaultOpenCount = 3,
  testId = 'article-content',
  forceExpanded = false,
  inlineFigures = [],
}: SectionedArticleProps) {
  // A focusable region makes wide comparisons usable with keyboard and touch.
  html = html.replace(/<table\b/gi, '<div role="region" aria-label="Scrollable comparison table" tabindex="0" class="article-table-scroll"><table')
    .replace(/<\/table>/gi, '</table></div>');
  const sections = splitHtmlByH2(html);
  const hasInlineFigures = inlineFigures.length > 0;

  if (!hasInlineFigures && (forceExpanded || !shouldUseCollapsibleSections(sections.length))) {
    return (
      <article className="blog-content prose-measure" data-testid={testId}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </article>
    );
  }

  if (forceExpanded || !shouldUseCollapsibleSections(sections.length)) {
    return (
      <article className="blog-content prose-measure space-y-0" data-testid={testId}>
        {sections.map((section, index) => (
          <div key={`section-${index}`} className={index < sections.length - 1 ? 'pb-8 border-b border-border' : 'pb-2'}>
            {section.headingHtml && (
              <div
                className="blog-content [&_h2]:mt-0 [&_h2]:mb-6 [&_h2]:text-xl md:[&_h2]:text-2xl"
                dangerouslySetInnerHTML={{ __html: section.headingHtml }}
              />
            )}
            {renderSectionBody(index, section.bodyHtml, inlineFigures, 'blog-content')}
          </div>
        ))}
      </article>
    );
  }

  return (
    <article className="prose-measure space-y-0" data-testid={testId}>
      {sections.map((section, index) => {
        const isOpen = index < defaultOpenCount;

        if (!section.headingHtml) {
          return (
            <div key={`section-${index}`} className="blog-content pb-8 border-b border-border">
              {renderSectionBody(index, section.bodyHtml, inlineFigures, '')}
            </div>
          );
        }

        return (
          <details
            key={`section-${index}`}
            className="guide-section-details group border-b border-border"
            open={isOpen}
          >
            <summary className="guide-section-summary cursor-pointer list-none py-5 md:py-6 [&::-webkit-details-marker]:hidden">
              <div
                className="blog-content [&_h2]:mt-0 [&_h2]:mb-0 [&_h2]:text-xl md:[&_h2]:text-2xl flex items-start justify-between gap-4"
                dangerouslySetInnerHTML={{ __html: section.headingHtml }}
              />
              <span className="text-xs text-muted-foreground mt-1 block group-open:hidden">
                Tap to expand
              </span>
            </summary>
            <div className="blog-content pb-8 pt-0">
              {renderSectionBody(index, section.bodyHtml, inlineFigures, '')}
            </div>
          </details>
        );
      })}
    </article>
  );
}
