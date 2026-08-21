import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Phone,
  Tag,
  User,
  BookOpen,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CONTENT_AUTHOR } from '@/shared/authors';
import { ArticleFaqs } from './ArticleFaqs';
import { Chip } from './Chip';
import { BlogEndCta } from './BlogEndCta';
import { RelatedPostCards } from './RelatedPostCards';
import { Section } from './Section';
import { GuideContentBlocks, GuideJumpChips } from './GuideContentBlocks';
import { SectionedArticle } from './SectionedArticle';
import { ArticleSidebar, ArticleSidebarCta } from './ArticleSidebar';
import type { GuidePageData } from '@/shared/guideContent';
import { getBlogHeroImage, getBlogImageAlt, getArticleInlineFigures, isCostRelatedContent } from '@/shared/blogImages';
import { BlogHeroBanner } from './BlogHeroBanner';
import {
  injectHeadingIds,
  extractHeadingsFromHtml,
  estimateReadingTime,
  countSubstantiveWords,
} from '@/lib/content-utils';
import { getHubBySlug, guidePath, getClustersForHub, categoryHubPath } from '@/shared/contentHubs';
import { CATEGORY_HUB_MIN_POSTS } from '@/shared/contentHubs';
import { getResourcesForGuide } from '@/shared/guideResources';
import { GuideResourceDownloads } from './GuideResourceDownloads';
import { InlineEstimateCTA } from './InlineEstimateCTA';

interface GuidePageLayoutProps {
  guide: GuidePageData;
  formatDate: (date: string) => string;
}

export function GuidePageLayout({ guide, formatDate }: GuidePageLayoutProps) {
  const hub = getHubBySlug(guide.hubSlug);
  const heroImage = getBlogHeroImage(guide.slug, guide.heroImage);
  const heroAlt = getBlogImageAlt(guide.slug);
  const guideUrl = guidePath(guide.slug);
  const contentWithIds = injectHeadingIds(guide.content);
  const tocHeadings = extractHeadingsFromHtml(contentWithIds);
  const readingTime = estimateReadingTime(countSubstantiveWords(guide.content));
  const publishedClusters = getClustersForHub(guide.hubSlug, true);
  const resources = getResourcesForGuide(guide.slug);
  const showInlineEstimate = isCostRelatedContent(guide.slug, guide.hubSlug);
  const inlineFigures = getArticleInlineFigures(
    guide.slug,
    tocHeadings.length,
    guide.hubSlug,
  );

  return (
    <div className="flex flex-col pb-20 md:pb-0">
      <BlogHeroBanner src={heroImage} alt={heroAlt} />

      <Section spacing="sm" className="pt-8 md:pt-10 pb-0">
        <div className="container px-4 max-w-6xl mx-auto">
          <Breadcrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'Guides', href: '/guides' },
              { name: guide.title },
            ]}
          />

          <header className="max-w-[42rem] mb-8 md:mb-10 mt-2">
            {hub && <Chip className="mb-4">{hub.categoryLabel}</Chip>}
            <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-sans font-light tracking-tight text-foreground mb-4">
              {guide.title}
            </h1>
            <p className="text-lg text-muted-foreground mb-5">{guide.excerpt}</p>
            <div role="presentation" className="border-t border-border/60 mb-5" />
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {formatDate(guide.publishedAt)}
              </span>
              <span>{readingTime} min read</span>
              <Link
                href={CONTENT_AUTHOR.url}
                className="flex items-center gap-2 min-h-11 md:min-h-0 hover:text-foreground transition-colors"
              >
                <User className="h-4 w-4" />
                {CONTENT_AUTHOR.name}
              </Link>
            </div>
          </header>

          <GuideJumpChips headings={tocHeadings} />

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-start">
            <div className="flex-1 min-w-0 w-full">
              <GuideContentBlocks
                quickAnswer={guide.quickAnswer}
                keyTakeaways={guide.keyTakeaways}
              >
                {/* The guide itself leads - always fully visible, never collapsed. */}
                <SectionedArticle
                  html={contentWithIds}
                  testId="guide-content"
                  forceExpanded
                  inlineFigures={inlineFigures}
                />

                {showInlineEstimate && <InlineEstimateCTA />}

                {publishedClusters.length > 0 && (
                  <div
                    className="rounded-xl border border-accent/20 bg-accent/5 p-5 md:p-6 mt-12"
                    data-testid="guide-cluster-links"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <BookOpen className="h-5 w-5 text-accent-legible" />
                      <h2 className="text-base font-normal text-foreground">Go deeper on specific topics</h2>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      In-depth articles that expand on the sections above.
                    </p>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {publishedClusters.slice(0, 8).map((c) => (
                        <li key={c.slug}>
                          <Link
                            href={`/blog/${c.slug}`}
                            className="text-sm text-accent-legible hover:underline inline-flex items-center min-h-11 md:min-h-0"
                          >
                            {c.title}
                            <ArrowRight className="ml-1 h-3 w-3 shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                    {publishedClusters.length >= CATEGORY_HUB_MIN_POSTS && hub && (
                      <Link
                        href={categoryHubPath(guide.hubSlug)}
                        className="inline-flex items-center min-h-11 md:min-h-0 text-sm text-muted-foreground hover:text-foreground mt-4"
                      >
                        View all in {hub.title}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )}

                <GuideResourceDownloads resources={resources} />
              </GuideContentBlocks>

              {guide.faqs.length > 0 && (
                <ArticleFaqs faqs={guide.faqs} testId="guide-faqs" />
              )}

              {guide.tags && guide.tags.length > 0 && (
                <div className="mt-10 pt-8 border-t border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {guide.tags.map((tag) => (
                      <Chip key={tag}>{tag}</Chip>
                    ))}
                  </div>
                </div>
              )}

              <div className="lg:hidden mt-10">
                <ArticleSidebarCta description="See what your project might cost with an instant Treasure Valley planning range." />
              </div>
            </div>

            <aside className="hidden lg:block w-72 xl:w-80 flex-shrink-0 sticky top-24 self-start">
              <ArticleSidebar tocHeadings={tocHeadings} />
            </aside>
          </div>
        </div>
      </Section>

      <Section spacing="sm" divider>
        <div className="container px-4 max-w-6xl mx-auto">
          <RelatedPostCards path={guideUrl} limit={8} />
        </div>
      </Section>

      <Section divider>
        <div className="container px-4">
          <BlogEndCta />
        </div>
      </Section>
    </div>
  );
}
