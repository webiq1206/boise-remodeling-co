import {
  BLOG_IMAGE_REGISTRY,
  HUB_HERO_IMAGES,
  type BlogImageEntry,
} from './blogImageRegistry';
import { GALLERY_IMAGES, SITE_IMAGES } from './siteImages';

const DEFAULT_BLOG_IMAGE = SITE_IMAGES.hero;

/** Secondary mid-article figures by hub so long posts get visual relief. */
const HUB_INLINE_GALLERY: Record<string, { src: string; alt: string }[]> = {
  'remodeling-costs': [
    { src: SITE_IMAGES.value, alt: 'Kitchen cabinetry and quartz materials during a Treasure Valley remodel' },
    { src: GALLERY_IMAGES.kitchen.after, alt: 'Completed kitchen remodel used for planning-range context' },
  ],
  'kitchen-remodeling': [
    { src: GALLERY_IMAGES.kitchen.after, alt: 'White shaker kitchen remodel with quartz counters' },
    { src: GALLERY_IMAGES.kitchenMeridian.after, alt: 'Meridian kitchen remodel with island seating' },
    { src: GALLERY_IMAGES.kitchenEagle.after, alt: 'Eagle kitchen remodel with foothills window light' },
  ],
  'bathroom-remodeling': [
    { src: GALLERY_IMAGES.bathroom.after, alt: 'Primary bathroom remodel with walk-in shower' },
    { src: GALLERY_IMAGES.hallBathBoise.after, alt: 'Boise hall bath converted to a walk-in shower' },
    { src: GALLERY_IMAGES.bathroomNampa.after, alt: 'Nampa primary bath remodel with double vanity' },
  ],
  'home-additions': [
    { src: GALLERY_IMAGES.addition.after, alt: 'Master suite addition exterior after completion' },
    { src: GALLERY_IMAGES.additionEagle.after, alt: 'Eagle rear addition with matching roof line' },
    { src: GALLERY_IMAGES.additionMeridian.after, alt: 'Meridian sunroom bump-out addition' },
  ],
  'whole-home-remodeling': [
    { src: GALLERY_IMAGES.wholeHome.after, alt: 'Open-concept living and kitchen after a whole-home remodel' },
    { src: '/images/gallery/featured-eagle-exterior.webp', alt: 'Eagle foothills ranch exterior after a whole-home refresh' },
    { src: '/images/gallery/featured-eagle-kitchen.webp', alt: 'Kitchen finishes coordinated with the whole-home remodel' },
  ],
  'contractor-selection': [
    { src: SITE_IMAGES.process, alt: 'Remodel plans and finish samples reviewed before construction' },
    { src: SITE_IMAGES.processInProgress, alt: 'Kitchen remodel in progress with cabinets installed' },
  ],
  'remodeling-process': [
    { src: SITE_IMAGES.processInProgress, alt: 'Kitchen remodel in progress with floor protection' },
    { src: SITE_IMAGES.process, alt: 'Design review with plans and material samples' },
    { src: GALLERY_IMAGES.wholeHome.after, alt: 'Finished open living area after coordinated construction' },
  ],
  'remodeling-roi': [
    { src: GALLERY_IMAGES.kitchen.after, alt: 'Updated kitchen finishes that support resale appeal' },
    { src: GALLERY_IMAGES.bathroom.after, alt: 'Updated primary bath finishes for everyday use and resale' },
  ],
  'outdoor-living': [
    { src: GALLERY_IMAGES.outdoor.after, alt: 'Covered patio outdoor living remodel' },
    { src: GALLERY_IMAGES.outdoorEagle.after, alt: 'Eagle covered patio with outdoor fireplace' },
    { src: '/images/gallery/featured-eagle-outdoor.webp', alt: 'Covered rear patio looking toward dry foothills' },
  ],
  'treasure-valley-locations': [
    { src: '/images/areas/boise.webp', alt: 'Boise neighborhood street with established homes' },
    { src: '/images/areas/eagle.webp', alt: 'Eagle residential street near the foothills' },
    { src: '/images/gallery/featured-eagle-exterior.webp', alt: 'Treasure Valley ranch exterior after remodeling' },
  ],
};

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
const INLINE_HUB_ALTS: Record<string, string> = {
  "remodeling-costs": "Representative living room renovation concept",
  "kitchen-remodeling": "Representative remodeled kitchen with coordinated cabinetry and counters",
  "bathroom-remodeling": "Representative remodeled bathroom design",
  "home-additions": "Representative room addition design",
  "whole-home-remodeling": "Representative open-plan living area and kitchen",
  "contractor-selection": "Remodeling plans, paint colors and finish samples arranged for a design discussion",
  "remodeling-process": "Existing living room before a design refresh",
  "remodeling-roi": "Representative kitchen with updated cabinetry",
  "outdoor-living": "Existing backyard illustrating an outdoor planning starting point",
  "treasure-valley-locations": "Representative Boise-area home exterior"
};

export function getArticleInlineFigures(
  slug: string,
  sectionCount: number,
  hubSlug?: string,
): ArticleInlineFigurePlacement[] {
  if (sectionCount < 4) return [];

  const entry = BLOG_IMAGE_REGISTRY[slug];
  const primarySrc = entry?.hero ?? DEFAULT_BLOG_IMAGE;
  const used = new Set<string>([primarySrc]);
  const figures: ArticleInlineFigurePlacement[] = [];

  const pushFigure = (afterSectionIndex: number, src: string, alt: string) => {
    if (used.has(src)) return;
    used.add(src);
    figures.push({ afterSectionIndex, src, alt });
  };

  if (hubSlug) {
    const hubHero = getHubHeroImage(hubSlug);
    if (sectionCount >= 5) {
      pushFigure(
        Math.max(1, Math.floor(sectionCount / 3) - 1),
        hubHero,
        Object.values(BLOG_IMAGE_REGISTRY).find((image) => image.hero === hubHero)?.alt
          ?? INLINE_HUB_ALTS[hubSlug] ?? `${hubSlug.replace(/-/g, ' ')} imagery`,
      );
    }

    const gallery = HUB_INLINE_GALLERY[hubSlug] ?? [];
    const slots = sectionCount >= 8 ? [2, 4, 6] : sectionCount >= 6 ? [2, 4] : [Math.floor(sectionCount / 2)];
    for (let i = 0; i < slots.length; i++) {
      const candidate = gallery[i % Math.max(gallery.length, 1)];
      if (!candidate) break;
      const afterSectionIndex = Math.min(slots[i], sectionCount - 1);
      pushFigure(afterSectionIndex, candidate.src, candidate.alt);
    }
  }

  return figures;
}
