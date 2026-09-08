"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { BlogCard } from "@/components/marketing/BlogCard";
import { Chip } from "@/components/marketing/Chip";
import { BLOG_POSTS } from "@/shared/blogContent";
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

export function BlogIndexClient() {
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

  const filtered = activeHub
    ? sortedPosts.filter((p) => p.hubSlug === activeHub)
    : sortedPosts;

  const activeHubMeta = activeHub
    ? CONTENT_HUBS.find((h) => h.hubSlug === activeHub)
    : undefined;

  const [featured, ...rest] = filtered;

  return (
    <div className="flex flex-col pb-20 md:pb-0">
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
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
