import {
  BLOG_IMAGE_REGISTRY,
  HUB_HERO_IMAGES,
  type BlogImageEntry,
} from './blogImageRegistry';
import { SITE_IMAGES } from './siteImages';

const DEFAULT_BLOG_IMAGE = SITE_IMAGES.hero;

export function getBlogImageEntry(slug: string): BlogImageEntry | undefined {
  return BLOG_IMAGE_REGISTRY[slug];
}

export function getBlogImageForSlug(
  slug: string,
  variant: 'hero' | 'thumbnail' = 'hero',
  override?: string,
): string {
  if (override) return override;
  const entry = BLOG_IMAGE_REGISTRY[slug];
  if (!entry) return DEFAULT_BLOG_IMAGE;
  if (variant === 'thumbnail' && entry.thumbnail) return entry.thumbnail;
  return entry.hero;
}

export function getBlogImageAlt(slug: string): string {
  return BLOG_IMAGE_REGISTRY[slug]?.alt ?? 'Representative remodeling design imagery';
}

export function getBlogHeroImage(
  slug: string,
  override?: string,
): string {
  return getBlogImageForSlug(slug, 'hero', override);
}

export function getBlogThumbnail(
  slug: string,
  override?: string,
): string {
  return getBlogImageForSlug(slug, 'thumbnail', override);
}

export function getHubHeroImage(hubSlug: string): string {
  return HUB_HERO_IMAGES[hubSlug] ?? DEFAULT_BLOG_IMAGE;
}

/** True for cost guides, cost hub articles, and slug/topic-tagged cost content. */
export function isCostRelatedContent(slug: string, hubSlug?: string): boolean {
  if (hubSlug === 'remodeling-costs') return true;
  const entry = BLOG_IMAGE_REGISTRY[slug];
  if (entry?.topicTags.includes('cost')) return true;
  return slug.includes('cost');
}

export function getAbsoluteImageUrl(path: string, baseUrl: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface ArticleInlineFigurePlacement {
  afterSectionIndex: number;
  src: string;
  alt: string;
  caption?: string;
}

/**
 * Editorial inline figures for long articles - inserted after key H2 sections
 * to break up text-heavy content (Phase 4).
 */
export function getArticleInlineFigures(
  slug: string,
  sectionCount: number,
  hubSlug?: string,
): ArticleInlineFigurePlacement[] {
  if (sectionCount < 4) return [];

  const entry = BLOG_IMAGE_REGISTRY[slug];
  const primarySrc = entry?.hero ?? DEFAULT_BLOG_IMAGE;
  const primaryAlt = entry?.alt ?? getBlogImageAlt(slug);

  const figures: ArticleInlineFigurePlacement[] = [
    {
      afterSectionIndex: 1,
      src: primarySrc,
      alt: primaryAlt,
    },
  ];

  if (sectionCount >= 6 && hubSlug) {
    const hubHero = getHubHeroImage(hubSlug);
    if (hubHero !== primarySrc) {
      figures.push({
        afterSectionIndex: Math.floor(sectionCount / 2),
        src: hubHero,
        alt: Object.values(BLOG_IMAGE_REGISTRY).find((image) => image.hero === hubHero)?.alt
          ?? `Representative ${hubSlug.replace(/-/g, ' ')} imagery`,
      });
    }
  }

  return figures;
}
