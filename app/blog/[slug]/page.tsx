import { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/shared/blogContent";
import { CONTENT_AUTHOR } from "@/shared/authors";
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateSpeakableSchema,
} from "@/lib/schema";
import { buildCanonical, stripBrandSuffix, FEED_ALTERNATES } from "@/lib/page-metadata";
import { generateSafePageTitle } from "@/lib/seo";
import { BlogPostLayout } from "@/components/marketing/BlogPostLayout";
import {
  getAbsoluteImageUrl,
  getBlogHeroImage,
  getBlogImageAlt,
} from "@/shared/blogImages";
import { getBlogOgImage } from "@/shared/blogOgImages";
import { getBaseUrl } from "@/lib/seo";
import { fitDescription } from '@/lib/page-metadata';

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  // Strip any brand the author baked into seoTitle, then enforce the budget so
  // the layout template's " | Boise Remodeling Co" keeps the rendered <title>
  // under ~60 chars. OG/Twitter use the same title (no extra "| ... Blog"
  // suffix, which previously doubled the brand and diverged from <title>).
  const rawTitle = post.seoTitle || post.title;
  const title = generateSafePageTitle(stripBrandSuffix(rawTitle));
  const description =
    fitDescription(post.metaDescription ||
    (post.excerpt.length > 160 ? post.excerpt.substring(0, 157) + "..." : post.excerpt));
  const heroPath = getBlogHeroImage(post.slug, post.heroImage);
  const imageUrl = getAbsoluteImageUrl(heroPath, getBaseUrl());
  const imageAlt = getBlogImageAlt(post.slug);

  // Prefer the branded Open Graph share card (photo + dark overlay + title +
  // seal, 1200x630) when one exists; fall back to the featured hero image.
  const ogCard = getBlogOgImage(post.slug);
  const shareImageUrl = ogCard ? getAbsoluteImageUrl(ogCard, getBaseUrl()) : imageUrl;

  return {
    title,
    description,
    alternates: {
      canonical: buildCanonical(`/blog/${post.slug}`),
      types: FEED_ALTERNATES,
    },
    openGraph: {
      title,
      description,
      url: buildCanonical(`/blog/${post.slug}`),
      type: "article",
      publishedTime: post.publishedAt,
      images: [{ url: shareImageUrl, width: 1200, height: 630, alt: imageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImageUrl],
    },
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);

  if (!post) {
    notFound();
  }

  const articleSchema = generateArticleSchema({
    title: post.title,
    description: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    author: CONTENT_AUTHOR.name,
    slug: post.slug,
    image: getAbsoluteImageUrl(getBlogHeroImage(post.slug, post.heroImage), getBaseUrl()),
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: post.title, url: `/blog/${post.slug}` },
  ]);

  const faqSchema = post.faqs.length > 0 ? generateFAQSchema(post.faqs) : null;
  const speakableSchema = post.quickAnswer
    ? generateSpeakableSchema({ name: post.title, path: `/blog/${post.slug}` })
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {speakableSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableSchema) }}
        />
      )}
      <BlogPostLayout post={post} formatDate={formatDate} />
    </>
  );
}
