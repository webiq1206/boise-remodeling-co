import { GALLERY_IMAGES, SITE_IMAGES } from "./siteImages";

export interface ServiceBackgroundConfig {
  [key: string]: string;
}

const DEFAULT_BACKGROUND = SITE_IMAGES.hero;

export const SERVICE_BACKGROUNDS: ServiceBackgroundConfig = {
  "kitchen-remodel": "/images/services/kitchen-remodel.webp",
  "bathroom-remodel": "/images/services/bathroom-remodel.webp",
  "whole-home-remodel": "/images/services/whole-home-remodel.webp",
  "room-addition": "/images/services/room-addition.webp",
  adu: "/images/services/adu.webp",
  "basement-remodel": "/images/services/basement-remodel.webp",
  "outdoor-living": "/images/services/outdoor-living.webp",
  "aging-in-place": "/images/services/aging-in-place.webp",
};

export const DEFAULT_SERVICE_BACKGROUND = DEFAULT_BACKGROUND;

export function getServiceBackground(serviceSlug: string): string {
  return SERVICE_BACKGROUNDS[serviceSlug] || DEFAULT_SERVICE_BACKGROUND;
}

/**
 * A set of distinct images for a landing page: a hero, a full-bleed breather
 * band, and the split process panel. Consumers fall back to `hero` for any
 * slot that has no dedicated photo.
 */
export interface LandingImageSet {
  hero: string;
  breather: string;
  process: string;
}

/**
 * Three distinct images per service so the hero, breather band, and process
 * panel each show a different relevant photo (finished room, detail, in-progress).
 */
const SERVICE_IMAGE_SETS: Record<string, LandingImageSet> = {
  "kitchen-remodel": {
    hero: "/images/services/kitchen-remodel.webp",
    breather: GALLERY_IMAGES.kitchen.after,
    process: SITE_IMAGES.processInProgress,
  },
  "bathroom-remodel": {
    hero: "/images/services/bathroom-remodel.webp",
    breather: GALLERY_IMAGES.bathroom.after,
    process: GALLERY_IMAGES.bathroom.before,
  },
  "whole-home-remodel": {
    hero: "/images/services/whole-home-remodel.webp",
    breather: GALLERY_IMAGES.wholeHome.after,
    process: GALLERY_IMAGES.wholeHome.before,
  },
  "room-addition": {
    hero: "/images/services/room-addition.webp",
    breather: GALLERY_IMAGES.addition.after,
    process: GALLERY_IMAGES.addition.before,
  },
  adu: {
    hero: "/images/services/adu.webp",
    breather: GALLERY_IMAGES.aduBoise.after,
    process: SITE_IMAGES.process,
  },
  "basement-remodel": {
    hero: "/images/services/basement-remodel.webp",
    breather: GALLERY_IMAGES.basement.before,
    process: GALLERY_IMAGES.basement.after,
  },
  "outdoor-living": {
    hero: "/images/services/outdoor-living.webp",
    breather: GALLERY_IMAGES.outdoor.before,
    process: GALLERY_IMAGES.outdoor.after,
  },
  "aging-in-place": {
    hero: "/images/services/aging-in-place.webp",
    breather: GALLERY_IMAGES.bathroom.before,
    process: "/images/services/aging-in-place.webp",
  },
};

export function getServiceImageSet(serviceSlug: string): LandingImageSet {
  return (
    SERVICE_IMAGE_SETS[serviceSlug] ?? {
      hero: DEFAULT_SERVICE_BACKGROUND,
      breather: DEFAULT_SERVICE_BACKGROUND,
      process: SITE_IMAGES.process,
    }
  );
}
