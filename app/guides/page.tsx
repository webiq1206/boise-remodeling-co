import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, MapPin } from 'lucide-react';
import { buildPageMetadata } from '@/lib/page-metadata';
import { Section } from '@/components/marketing/Section';
import { MarketingCard } from '@/components/marketing/MarketingCard';
import { PageHeroBand } from '@/components/sections/PageHeroBand';
import { EstimatePromptBand } from '@/components/marketing/EstimatePromptBand';
import { CONTENT_HUBS, guidePath } from '@/shared/contentHubs';
import { GUIDE_PAGES, type GuidePageData } from '@/shared/guideContent';
import { getBlogHeroImage, getBlogImageAlt } from '@/shared/blogImages';
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/schema';
import {
  countH2Headings,
  countSubstantiveWords,
  estimateReadingTime,
} from '@/lib/content-utils';

function guideCardMeta(guide: GuidePageData) {
  const words = countSubstantiveWords(guide.content);
  const topics = countH2Headings(guide.content);
  const minutes = estimateReadingTime(words);
  return { minutes, topics };
}

function GuideCardStats({ guide }: { guide: GuidePageData }) {
  const { minutes, topics } = guideCardMeta(guide);
  return (
    <p className="text-xs text-muted-foreground mb-4">
      {topics} topics · {minutes} min read
    </p>
  );
}

export const metadata: Metadata = buildPageMetadata({
  kind: 'blog',
  path: '/guides',
  titleOverride: 'Remodeling Guides | Boise Remodeling Co',
  descriptionOverride:
    'Definitive Treasure Valley remodeling guides: costs, kitchens, baths, additions, contractor selection, ROI, outdoor living, and local city resources.',
});

const PILLAR_TYPES = new Set(['hub-pillar', 'master']);

export default function GuidesIndexPage() {
  const pillarGuides = GUIDE_PAGES.filter((g) => PILLAR_TYPES.has(g.guideType));
  const locationGuides = GUIDE_PAGES.filter(
    (g) => g.guideType === 'location' || g.guideType === 'neighborhood',
  );
  const sortedHubs = [...CONTENT_HUBS].sort((a, b) => a.priorityTier - b.priorityTier);

  const webPageSchema = generateWebPageSchema({
    title: 'Remodeling Guides',
    description:
      'Definitive Treasure Valley remodeling guides: costs, kitchens, baths, additions, contractor selection, ROI, outdoor living, and local city resources.',
    url: '/guides',
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Guides', url: '/guides' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <PageHeroBand
        imageSrc={getBlogHeroImage('boise-remodeling-cost-guide')}
        imageAlt={getBlogImageAlt('boise-remodeling-cost-guide')}
      >
        <p className="ed-eyebrow mt-8" style={{ color: "rgb(255 255 255 / 0.72)" }}>Treasure Valley authority</p>
        <h1 className="ed-display ed-statement-display text-inverse-foreground">
          Remodeling Guides
        </h1>
        <p className="ed-lede mt-8 max-w-[44ch] text-inverse-foreground/85">
          In-depth guides for Boise, Meridian, Eagle, Nampa, and the entire Treasure Valley - costs,
          process, locations, and planning resources from Boise Remodeling Co.
        </p>
        <Link
          href="/resources"
          className="text-sm text-inverse-foreground/90 hover:text-inverse-foreground inline-flex items-center min-h-11 lg:min-h-0 transition-colors"
        >
          Free PDF worksheets &amp; permit infographic
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </PageHeroBand>

      <Section spacing="default" className="pt-12 md:pt-16">
        <div className="container px-4 max-w-6xl mx-auto mb-16">
          <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-6">
            Hub pillar guides
          </h2>
          <div className="ed-cards-3 gap-6">
            {pillarGuides.map((guide) => (
              <MarketingCard key={guide.slug} className="p-0 flex flex-col h-full overflow-hidden">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image
                    src={getBlogHeroImage(guide.slug, guide.heroImage)}
                    alt={getBlogImageAlt(guide.slug)}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover img-brand-grade"
                  />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <BookOpen className="h-5 w-5 text-accent-legible mb-3" />
                  <h3 className="font-normal text-lg mb-2">{guide.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 mb-3">{guide.excerpt}</p>
                  <GuideCardStats guide={guide} />
                  <Link
                    href={guidePath(guide.slug)}
                    className="inline-flex items-center min-h-11 lg:min-h-0 text-sm text-accent-legible hover:underline"
                  >
                    Read guide
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </MarketingCard>
            ))}
          </div>
        </div>

        <div className="container px-4 max-w-6xl mx-auto mb-16">
          <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-6">
            City &amp; neighborhood guides
          </h2>
          <div className="ed-cards-3 gap-4">
            {locationGuides.map((guide) => (
              <MarketingCard key={guide.slug} className="p-0 flex flex-col h-full overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={getBlogHeroImage(guide.slug, guide.heroImage)}
                    alt={getBlogImageAlt(guide.slug)}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover img-brand-grade"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <MapPin className="h-4 w-4 text-accent-legible mb-2" />
                  <h3 className="font-normal text-base mb-1">{guide.title}</h3>
                  <p className="text-sm text-muted-foreground flex-1 mb-2 line-clamp-2">
                    {guide.excerpt}
                  </p>
                  <GuideCardStats guide={guide} />
                  <Link
                    href={guidePath(guide.slug)}
                    className="text-sm text-accent-legible hover:underline inline-flex items-center min-h-11 lg:min-h-0"
                  >
                    Read
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              </MarketingCard>
            ))}
          </div>
        </div>

        <div className="container px-4 max-w-6xl mx-auto">
          <h2 className="text-sm font-normal uppercase tracking-wider text-muted-foreground mb-6">
            Browse by topic
          </h2>
          <div className="ed-cards-3 gap-4">
            {sortedHubs.map((hub) => (
              <MarketingCard key={hub.hubSlug} className="p-5">
                <h3 className="font-normal mb-1">{hub.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{hub.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <Link
                    href={guidePath(hub.pillarSlug)}
                    className="text-accent-legible hover:underline inline-flex items-center min-h-11 lg:min-h-0"
                  >
                    Pillar guide
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                  <Link
                    href={`/blog/category/${hub.hubSlug}`}
                    className="inline-flex items-center min-h-11 lg:min-h-0 text-muted-foreground hover:text-accent-legible hover:underline"
                  >
                    Related articles
                  </Link>
                </div>
              </MarketingCard>
            ))}
          </div>
        </div>
      </Section>

      <EstimatePromptBand
        eyebrow="From reading to planning"
        title={
          <>
            Turn what you learned into a{' '}
            <em className="brc-accent">number</em>
          </>
        }
        description="After reading our guides, use the project estimator for an instant Treasure Valley planning range - then book a free in-home visit when you're ready to move forward."
        variant="canvas"
      />
    </>
  );
}
