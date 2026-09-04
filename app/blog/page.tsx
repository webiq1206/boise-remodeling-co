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
        <p className="ed-eyebrow mt-8" style={{ color: "rgb(255 255 255 / 0.72)" }}>Blog</p>
        <h1 className="ed-display ed-statement-display text-inverse-foreground">
          Remodeling Insights &amp; Ideas
        </h1>
        <p className="ed-lede mt-8 max-w-[44ch] text-inverse-foreground/85">
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
