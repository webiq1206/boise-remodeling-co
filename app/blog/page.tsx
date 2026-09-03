import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BlogIndexClient } from "@/components/marketing/BlogIndexClient";
import { PageHeroBand } from "@/components/sections/PageHeroBand";
import { EstimatePromptBand } from "@/components/marketing/EstimatePromptBand";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { buildPageMetadata } from "@/lib/page-metadata";
import { JsonLd } from "@/components/seo/JsonLd";
import { BLOG_POSTS } from "@/shared/blogContent";
import { getBlogHeroImage, getBlogImageAlt } from "@/shared/blogImages";
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
} from "@/lib/schema";

export const metadata: Metadata = buildPageMetadata({
  kind: "blog",
  path: "/blog",
});

export default function BlogPage() {
  const schemas = [
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
    ]),
    generateCollectionPageSchema({
      title: "Remodeling Insights & Ideas",
      description:
        "Honest remodeling advice for Idaho homeowners: budgeting, timelines, permits, and design-build guidance from Boise Remodeling Co.",
      url: "/blog",
      items: BLOG_POSTS.map((post) => ({
        name: post.title,
        url: `/blog/${post.slug}`,
      })),
    }),
  ];

  return (
    <>
      <JsonLd data={schemas} />

      <PageHeroBand
        imageSrc={getBlogHeroImage("boise-remodeling-process-guide")}
        imageAlt={getBlogImageAlt("boise-remodeling-process-guide")}
      >
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Blog" }]} />
        <div className="brc-label text-inverse-muted mt-6 mb-4">Blog</div>
        <h1 className="font-serif text-display tracking-tight text-inverse-foreground max-w-3xl mb-4">
          Remodeling Insights &amp; Ideas
        </h1>
        <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-4">
          Honest advice for Idaho homeowners planning their next renovation - budgeting, timelines,
          permits, and design-build guidance from Boise Remodeling Co.
        </p>
        <Link
          href="/guides"
          className="text-sm text-inverse-foreground/90 hover:text-inverse-foreground inline-flex items-center min-h-11 lg:min-h-0 transition-colors"
        >
          Browse full remodeling guides
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </PageHeroBand>

      <BlogIndexClient />

      <EstimatePromptBand
        eyebrow="Ready to plan"
        title={
          <>
            From articles to an actual{' '}
            <em className="brc-accent">range</em>
          </>
        }
        description="Read enough to know what you want? Use our project estimator for an instant Treasure Valley planning range - takes about 60 seconds, no obligation."
        variant="greige"
      />
    </>
  );
}
