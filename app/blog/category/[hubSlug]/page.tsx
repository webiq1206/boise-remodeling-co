import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { BLOG_POSTS } from '@/shared/blogContent';
import {
  CONTENT_HUBS,
  categoryHubPath,
  getHubBySlug,
  guidePath,
  isCategoryHubIndexable,
} from '@/shared/contentHubs';
import { buildCanonical, FEED_ALTERNATES } from '@/lib/page-metadata';
import { getHubHeroImage, getBlogImageAlt, getAbsoluteImageUrl } from '@/shared/blogImages';
import { Section } from '@/components/marketing/Section';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { BlogCard } from '@/components/marketing/BlogCard';
import { HubHeroBanner } from '@/components/marketing/BlogHeroBanner';
import { generateBreadcrumbSchema, generateCollectionPageSchema } from '@/lib/schema';
import { getBaseUrl } from '@/lib/seo';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateStaticParams() {
  return CONTENT_HUBS.map((hub) => ({ hubSlug: hub.hubSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: { hubSlug: string };
}): Promise<Metadata> {
  const hub = getHubBySlug(params.hubSlug);
  if (!hub) return { title: 'Not Found' };

  const posts = BLOG_POSTS.filter((p) => p.hubSlug === params.hubSlug);
  const indexable = isCategoryHubIndexable(params.hubSlug, posts.length);
  const title = `${hub.title} Articles`;
  // Benefit-led, unique per hub (uses the hub's own description) and long enough
  // to earn the click, instead of the old formulaic 60-char template.
  const countPhrase = posts.length >= 3 ? `${posts.length} in-depth articles` : 'Expert articles';
  const rawDescription =
    `${hub.description} ${countPhrase} on ${hub.title.toLowerCase()} for Boise, Meridian, Eagle, Nampa and Treasure Valley homeowners planning a remodel.`.replace(
      /\s+/g,
      ' ',
    );
  // Trim to ~158 chars on a word boundary so descriptions never truncate mid-word.
  const description =
    rawDescription.length <= 158
      ? rawDescription
      : rawDescription.slice(0, 158).replace(/\s+\S*$/, '') + '…';
  const heroImage = getHubHeroImage(params.hubSlug);
  const imageUrl = getAbsoluteImageUrl(heroImage, getBaseUrl());

  return {
    title,
    description,
    alternates: { canonical: buildCanonical(categoryHubPath(params.hubSlug)), types: FEED_ALTERNATES },
    robots: indexable ? undefined : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: buildCanonical(categoryHubPath(params.hubSlug)),
      type: 'website',
      images: [{ url: imageUrl, alt: `${hub.title} articles` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function BlogCategoryHubPage({
  params,
}: {
  params: { hubSlug: string };
}) {
  const hub = getHubBySlug(params.hubSlug);
  if (!hub) notFound();

  const posts = BLOG_POSTS.filter((p) => p.hubSlug === params.hubSlug).sort(
    (a, b) => (a.publishedAt < b.publishedAt ? 1 : -1),
  );

  if (posts.length === 0) {
    redirect(hub.hubSlug === 'treasure-valley-locations' ? '/areas' : '/blog');
  }

  const hubHero = getHubHeroImage(params.hubSlug);
  const pillarSlug = hub.pillarSlug;
  const hubAlt = pillarSlug ? getBlogImageAlt(pillarSlug) : `${hub.title} articles`;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: hub.title, url: categoryHubPath(hub.hubSlug) },
  ]);

  const collectionSchema =
    posts.length > 0
      ? generateCollectionPageSchema({
          title: hub.title,
          description: hub.description,
          url: categoryHubPath(hub.hubSlug),
          items: posts.map((p) => ({ name: p.title, url: `/blog/${p.slug}` })),
        })
      : null;

  return (
    <>
      {collectionSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Section spacing="default" className="pt-28 md:pt-32">
        <div className="container px-4 max-w-6xl mx-auto">
          <Breadcrumbs
            items={[
              { name: 'Home', href: '/' },
              { name: 'Blog', href: '/blog' },
              { name: hub.title },
            ]}
          />

          <HubHeroBanner src={hubHero} alt={hubAlt} />

          <h1 className="text-3xl md:text-4xl font-serif tracking-tight mb-4">
            {hub.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-4 max-w-2xl">{hub.description}</p>
          <p className="text-base text-muted-foreground mb-6 max-w-2xl leading-relaxed">
            Every article below is written by the Boise Remodeling Co design-build team for
            homeowners across Boise, Meridian, Eagle, Nampa and the wider Treasure Valley, with
            real planning ranges, Ada and Canyon County permit context, and lessons from projects
            we have actually built. Start with the complete guide for the full overview, or jump
            to a specific article below.
          </p>
          <Link
            href={guidePath(hub.pillarSlug)}
            className="inline-flex items-center text-accent-legible hover:underline text-sm mb-10"
          >
            Read the complete guide
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>

          <div className="ed-cards-3 gap-6">
            {posts.map((post) => (
              <BlogCard key={post.slug} post={post} formatDate={formatDate} />
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
