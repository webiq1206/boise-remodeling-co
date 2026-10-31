"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { BlogCard } from "@/components/marketing/BlogCard";
import { Chip } from "@/components/marketing/Chip";
import { BLOG_POSTS } from "@/shared/blogContent";
import { BLOG_PAGE_SIZE, blogPageCount, blogPagePath } from "@/lib/blogPagination";
import {
  CONTENT_HUBS,
  categoryHubPath,
  isCategoryHubIndexable,
} from "@/shared/contentHubs";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Page links under the grid: Previous, every page number, Next. Plain anchors in
 * the server HTML, so crawlers reach every post through /blog/page/N.
 */
function BlogPagination({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;
  const item = "inline-flex min-h-11 min-w-11 items-center justify-center px-3 text-sm";
  return (
    <nav aria-label="Blog pages" className="mt-12 flex flex-wrap items-center justify-center gap-2" data-testid="blog-pagination">
      {page > 1 ? (
        <Link href={blogPagePath(page - 1)} rel="prev" className={`${item} underline underline-offset-4`}>
          Previous
        </Link>
      ) : null}
      <ol className="flex flex-wrap items-center gap-1">
        {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
          <li key={n}>
            {n === page ? (
              <span aria-current="page" className={`${item} border border-foreground text-foreground`}>
                <span className="sr-only">Page </span>
                {n}
              </span>
            ) : (
              <Link href={blogPagePath(n)} className={`${item} text-muted-foreground hover:text-foreground underline-offset-4 hover:underline`}>
                <span className="sr-only">Page </span>
                {n}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {page < pages ? (
        <Link href={blogPagePath(page + 1)} rel="next" className={`${item} underline underline-offset-4`}>
          Next
        </Link>
      ) : null}
    </nav>
  );
}

export function BlogIndexClient({ page = 1 }: { page?: number }) {
  const sortedPosts = useMemo(
    () =>
      [...BLOG_POSTS].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      ),
    []
  );

  const indexableHubs = useMemo(
    () =>
      [...CONTENT_HUBS]
        .sort((a, b) => a.priorityTier - b.priorityTier)
        .filter((hub) => {
          const count = sortedPosts.filter((p) => p.hubSlug === hub.hubSlug).length;
          return count > 0 && isCategoryHubIndexable(hub.hubSlug, count);
        }),
    [sortedPosts],
  );

  const [activeHub, setActiveHub] = useState<string | null>(null);

  // A topic chip shows every post in that topic; otherwise the page shows its
  // twelve. Page 1 leads with the newest post as the featured card.
  const pages = blogPageCount(sortedPosts.length);
  const filtered = activeHub
    ? sortedPosts.filter((p) => p.hubSlug === activeHub)
    : sortedPosts.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);

  const activeHubMeta = activeHub
    ? CONTENT_HUBS.find((h) => h.hubSlug === activeHub)
    : undefined;

  const leadWithFeatured = Boolean(activeHub) || page === 1;
  const featured = leadWithFeatured ? filtered[0] : undefined;
  const rest = leadWithFeatured ? filtered.slice(1) : filtered;

  return (
    <div className="flex flex-col ">
      <Section spacing="default" className="pt-10 md:pt-12">
        <div className="container px-4">
          <div className="max-w-6xl mx-auto">
            {sortedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-24 space-y-6">
                <div className="rounded-full bg-muted p-6">
                  <PenLine className="h-10 w-10 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-serif text-foreground">Articles coming soon</h2>
                <p className="text-muted-foreground max-w-md">
                  We&apos;re writing in-depth guides on budgeting, timelines, and more.
                </p>
                <Button variant="brand" asChild>
                  <Link href="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <>
                {indexableHubs.length >= 2 && (
                  <div className="flex flex-wrap gap-2 justify-center mb-6">
                    <Chip active={!activeHub} onClick={() => setActiveHub(null)}>
                      All topics
                    </Chip>
                    {indexableHubs.map((hub) => (
                      <Chip
                        key={hub.hubSlug}
                        active={activeHub === hub.hubSlug}
                        onClick={() => setActiveHub(hub.hubSlug)}
                      >
                        {hub.title}
                      </Chip>
                    ))}
                  </div>
                )}

                {activeHubMeta && (
                  <p className="text-center text-sm text-muted-foreground mb-10 max-w-xl mx-auto">
                    Showing articles in{' '}
                    <span className="text-foreground">{activeHubMeta.title}</span>.{' '}
                    <Link
                      href={categoryHubPath(activeHubMeta.hubSlug)}
                      className="text-accent-legible hover:underline"
                    >
                      View topic hub
                    </Link>
                  </p>
                )}

                {featured && (
                  <div className="mb-10">
                    <BlogCard post={featured} featured formatDate={formatDate} />
                  </div>
                )}

                {rest.length > 0 && (
                  <>
                    {featured && (
                      <div role="presentation" className="border-t border-border/60 mb-10" />
                    )}
                    <div className="ed-cards-3 gap-6">
                      {rest.map((post) => (
                        <BlogCard key={post.slug} post={post} formatDate={formatDate} />
                      ))}
                    </div>
                  </>
                )}
                {!activeHub && <BlogPagination page={page} pages={pages} />}
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
