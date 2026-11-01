import { InteriorPage } from '@/components/approved/InteriorLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BlogIndexClient } from '@/components/marketing/BlogIndexClient';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { JsonLd } from '@/components/seo/JsonLd';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { blogIndexPosts, blogPageCount, blogPagePath, blogPaginatedPages, blogPostsForPage } from '@/lib/blogPagination';
import { buildPageMetadata } from '@/lib/page-metadata';
import { generateBreadcrumbSchema, generateCollectionPageSchema } from '@/lib/schema';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * /blog/page/2 onward: the same index, twelve posts per page. /blog stays page 1
 * with its own title, description and canonical; each page here canonicalises to
 * itself and is linked from the page list under the grid.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return blogPaginatedPages().map((page) => ({ page: String(page) }));
}

function parsePage(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const page = Number(value);
  return page >= 2 && page <= blogPageCount() ? page : null;
}

const BLOG_DESCRIPTION =
  'Honest remodeling advice for Idaho homeowners: budgeting, timelines, permits, and design-build guidance from Boise Remodeling Co.';

export async function generateMetadata(props: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const page = parsePage((await props.params).page);
  if (!page) return {};
  const pages = blogPageCount();
  return withBrandPageMetadata(
    buildPageMetadata({
      kind: 'blog',
      path: blogPagePath(page),
      titleOverride: `Remodeling Insights & Ideas, Page ${page} of ${pages}`,
      descriptionOverride: `Page ${page} of ${pages}. ${BLOG_DESCRIPTION}`,
    }),
    '/blog/page/[page]',
  );
}

export default async function BlogPaginatedPage(props: { params: Promise<{ page: string }> }) {
  const page = parsePage((await props.params).page);
  if (!page) notFound();
  const pages = blogPageCount();
  const path = blogPagePath(page);
  const schemas = [
    generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: `Page ${page}`, url: path },
    ]),
    generateCollectionPageSchema({
      title: `Remodeling Insights & Ideas, Page ${page} of ${pages}`,
      description: BLOG_DESCRIPTION,
      url: path,
      items: blogPostsForPage(page).map((post) => ({ name: post.title, url: `/blog/${post.slug}` })),
    }),
  ];

  return (
    <InteriorPage kind="blog"><>
      <JsonLd data={schemas} />
      <section className="interior-hero interior-hero-editorial interior-hero-text blog-page-heading">
        <div className="interior-hero-copy">
          <Breadcrumbs items={[{ name: 'Home', href: '/' }, { name: 'Blog', href: '/blog' }, { name: `Page ${page}` }]} />
          <h1 className="ed-display ed-statement-display">
            Remodeling insights &amp; ideas, page {page} of {pages}
          </h1>
          <p className="ed-lede mt-6 max-w-[52ch]">
            More planning advice for Idaho homeowners. Start from the{' '}
            <Link href="/blog" className="underline underline-offset-4">newest articles</Link> or browse the{' '}
            <Link href="/guides" className="underline underline-offset-4">full remodeling guides</Link>.
          </p>
        </div>
      </section>

      <BlogIndexClient posts={blogIndexPosts()} page={page} />

      <EstimatePromptBand
        eyebrow="Ready to plan"
        title={
          <>
            From articles to an actual{' '}
            <em className="brc-accent">range</em>
          </>
        }
        description="Read enough to know what you want? Request a quote, and the free in-home visit ends with a planning range for your project. No obligation."
        variant="greige"
      />
    </></InteriorPage>
  );
}
