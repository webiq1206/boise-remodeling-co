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
    { src: SITE_IMAGES.value, alt: 'Kitchen cabinetry, unfinished cabinet boxes and tools on a workbench' },
    { src: GALLERY_IMAGES.kitchen.after, alt: 'White kitchen with a gray-green island, pendant lights and a broad window' },
  ],
  'kitchen-remodeling': [
    { src: GALLERY_IMAGES.kitchen.after, alt: 'White kitchen with a gray-green island, pendant lights and a broad window' },
    { src: GALLERY_IMAGES.kitchenMeridian.after, alt: 'White kitchen with a gray-green island, pendant lights and a broad window' },
    { src: GALLERY_IMAGES.kitchenEagle.after, alt: 'Kitchen with wood cabinetry, a white counter and large windows' },
  ],
  'bathroom-remodeling': [
    { src: GALLERY_IMAGES.bathroom.after, alt: 'Bathroom with a white vanity, black-framed mirrors and a glass shower' },
    { src: GALLERY_IMAGES.hallBathBoise.after, alt: 'Bathroom with a long white vanity and a black-framed glass walk-in shower' },
    { src: GALLERY_IMAGES.bathroomNampa.after, alt: 'Bathroom with a white double vanity, black-framed mirrors and a glass walk-in shower' },
  ],
  'home-additions': [
    { src: GALLERY_IMAGES.addition.after, alt: 'Single-story house with pale siding, a wide glass door and a paved patio' },
    { src: GALLERY_IMAGES.additionEagle.after, alt: 'Single-story house with lap siding, brick trim and a paved rear patio' },
    { src: GALLERY_IMAGES.additionMeridian.after, alt: 'Single-story house with lap siding, brick trim and a paved rear patio' },
  ],
  'whole-home-remodeling': [
    { src: GALLERY_IMAGES.wholeHome.after, alt: 'Open living area and kitchen with wood floors, neutral furnishings and large windows' },
    { src: '/images/gallery/featured-eagle-exterior.webp', alt: 'Single-story ranch house with lap siding, brick trim and an attached garage' },
    { src: '/images/gallery/featured-eagle-kitchen.webp', alt: 'White kitchen with a gray-green island, pendant lights and a broad window' },
  ],
  'contractor-selection': [
    { src: SITE_IMAGES.process, alt: 'Printed floor plan, tape measure and notebook on a kitchen island' },
    { src: SITE_IMAGES.processInProgress, alt: 'Kitchen with open cabinet boxes, a workbench and a spirit level' },
  ],
  'remodeling-process': [
    { src: SITE_IMAGES.processInProgress, alt: 'Kitchen with open cabinet boxes, a workbench and a spirit level' },
    { src: SITE_IMAGES.process, alt: 'Printed floor plan, tape measure and notebook on a kitchen island' },
    { src: GALLERY_IMAGES.wholeHome.after, alt: 'Open living area and kitchen with wood floors, neutral furnishings and large windows' },
  ],
  'remodeling-roi': [
    { src: GALLERY_IMAGES.kitchen.after, alt: 'White kitchen with a gray-green island, pendant lights and a broad window' },
    { src: GALLERY_IMAGES.bathroom.after, alt: 'Bathroom with a white vanity, black-framed mirrors and a glass shower' },
  ],
  'outdoor-living': [
    { src: GALLERY_IMAGES.outdoor.after, alt: 'Covered rear patio with a wood dining table, lawn and dry hills beyond' },
    { src: GALLERY_IMAGES.outdoorEagle.after, alt: 'Covered patio with a wood dining table, broad lawn and dry hills beyond' },
    { src: '/images/gallery/featured-eagle-outdoor.webp', alt: 'Single-story ranch house with a front lawn, mature trees and dry hills beyond' },
  ],
  'treasure-valley-locations': [
    { src: '/images/areas/boise.webp', alt: 'Residential street with two-story houses, young trees and a grassy hillside beyond' },
    { src: '/images/areas/eagle.webp', alt: 'Single-story house with a dark metal roof, lit windows and gravel landscaping at dusk' },
    { src: '/images/gallery/featured-eagle-exterior.webp', alt: 'Single-story ranch house with lap siding, brick trim and an attached garage' },
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
  return BLOG_IMAGE_REGISTRY[slug]?.alt ?? 'Kitchen and living-area finishes';
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
  "remodeling-costs": "Open living area and kitchen with wood floors, neutral furnishings and large windows",
  "kitchen-remodeling": "White kitchen with a gray-green island, pendant lights and a broad window",
  "bathroom-remodeling": "Bathroom with a white vanity, black-framed mirrors and a glass shower",
  "home-additions": "Single-story house with pale siding, a wide glass door and a paved patio",
  "whole-home-remodeling": "Open living area and kitchen with wood floors, neutral furnishings and large windows",
  "contractor-selection": "Floor plans, paint chips, tile and flooring samples arranged on a table",
  "remodeling-process": "Living room with carpet, a fireplace and broad windows",
  "remodeling-roi": "White kitchen with an island, pendant lights and wood flooring",
  "outdoor-living": "Backyard lawn beside a house with pale siding and a sliding glass door",
  "treasure-valley-locations": "Residential street with two-story houses, young trees and a grassy hillside beyond"
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
