/**
 * Multi-room featured project sets. Every room/exterior in a set must read as
 * the same property (materials, windows, landscape, lighting).
 */

import { FEATURED_EAGLE_IMAGES } from "./siteImages";

export interface FeaturedProjectRoom {
  key: string;
  label: string;
  src: string;
  alt: string;
}

export interface FeaturedProjectSet {
  id: string;
  city: string;
  title: string;
  description: string;
  rooms: FeaturedProjectRoom[];
}

/** Eagle foothills whole-home remodel: cohesive exterior + interior set. */
export const FEATURED_EAGLE_WHOLE_HOME: FeaturedProjectSet = {
  id: "eagle-whole-home",
  city: "eagle",
  title: "Eagle Foothills Whole-Home Refresh",
  description:
    "One Treasure Valley ranch carried from curb to kitchen, great room, primary bath, and covered patio with matching finishes and black-framed windows.",
  rooms: [
    {
      key: "exterior",
      label: "Exterior",
      src: FEATURED_EAGLE_IMAGES.exterior,
      alt: "Modern craftsman ranch exterior in the Eagle foothills with taupe siding and black-framed windows",
    },
    {
      key: "great-room",
      label: "Great room",
      src: FEATURED_EAGLE_IMAGES.greatRoom,
      alt: "Open great room with fireplace, white oak floors, and a sight line into the remodeled kitchen",
    },
    {
      key: "kitchen",
      label: "Kitchen",
      src: FEATURED_EAGLE_IMAGES.kitchen,
      alt: "White shaker kitchen with quartz island and foothills view through black-framed windows",
    },
    {
      key: "bath",
      label: "Primary bath",
      src: FEATURED_EAGLE_IMAGES.bath,
      alt: "Primary bath with white oak vanity, glass shower, and matte black fixtures",
    },
    {
      key: "outdoor",
      label: "Outdoor living",
      src: FEATURED_EAGLE_IMAGES.outdoor,
      alt: "Covered rear patio looking back at the same ranch with dry foothills beyond the fence",
    },
  ],
};

export const FEATURED_PROJECT_SETS: FeaturedProjectSet[] = [FEATURED_EAGLE_WHOLE_HOME];

export function getFeaturedProjectSet(id: string): FeaturedProjectSet | undefined {
  return FEATURED_PROJECT_SETS.find((set) => set.id === id);
}

export function getFeaturedProjectForService(
  serviceSlug: string,
): FeaturedProjectSet | undefined {
  if (serviceSlug === "whole-home-remodel") return FEATURED_EAGLE_WHOLE_HOME;
  return undefined;
}
