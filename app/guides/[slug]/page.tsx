import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GUIDE_PAGES, getGuideBySlug } from '@/shared/guideContent';
import { CONTENT_AUTHOR } from '@/shared/authors';
import {
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateSpeakableSchema,
} from '@/lib/schema';
import { buildCanonical, stripBrandSuffix, FEED_ALTERNATES } from '@/lib/page-metadata';
import { GuidePageLayout } from '@/components/marketing/GuidePageLayout';
import { getHubBySlug, guidePath } from '@/shared/contentHubs';
import {
  getAbsoluteImageUrl,
  getBlogHeroImage,
  getBlogImageAlt,
} from '@/shared/blogImages';
import { generateSafePageTitle, getBaseUrl } from '@/lib/seo';
import { fitDescription } from '@/lib/page-metadata';

export async function generateStaticParams() {
  return GUIDE_PAGES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;
  const guide = getGuideBySlug(params.slug);
  if (!guide) return { title: 'Guide Not Found' };

  const rawTitle = guide.seoTitle || guide.title;
  const title = generateSafePageTitle(stripBrandSuffix(rawTitle));
  const description =
    fitDescription(guide.metaDescription ||
    (guide.excerpt.length > 160 ? guide.excerpt.substring(0, 157) + '...' : guide.excerpt));
  const heroPath = getBlogHeroImage(guide.slug, guide.heroImage);
  const imageUrl = getAbsoluteImageUrl(heroPath, getBaseUrl());
  const imageAlt = getBlogImageAlt(guide.slug);

  return {
    title,
    description,
    alternates: { canonical: buildCanonical(guidePath(guide.slug)), types: FEED_ALTERNATES },
    openGraph: {
      title,
      description,
      url: buildCanonical(guidePath(guide.slug)),
      type: 'article',
      publishedTime: guide.publishedAt,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function GuidePage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const guide = getGuideBySlug(params.slug);
  if (!guide) notFound();

  const hub = getHubBySlug(guide.hubSlug);
  const path = guidePath(guide.slug);

  const articleSchema = generateArticleSchema({
    title: guide.title,
    description: guide.excerpt,
    publishedAt: guide.publishedAt,
    updatedAt: guide.updatedAt,
    author: CONTENT_AUTHOR.name,
    slug: guide.slug,
    pathPrefix: 'guides',
    image: getAbsoluteImageUrl(getBlogHeroImage(guide.slug, guide.heroImage), getBaseUrl()),
  });

  const breadcrumbItems = [
    { name: 'Home', url: '/' },
    { name: 'Guides', url: '/guides' },
  ];
  if (hub) {
    breadcrumbItems.push({
      name: hub.title,
      url: guidePath(hub.pillarSlug),
    });
  }
  breadcrumbItems.push({ name: guide.title, url: path });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbItems);
  const faqSchema = guide.faqs.length > 0 ? generateFAQSchema(guide.faqs) : null;
  const speakableSchema = guide.quickAnswer
    ? generateSpeakableSchema({ name: guide.title, path })
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
      <GuidePageLayout guide={guide} formatDate={formatDate} />
    </>
  );
}
