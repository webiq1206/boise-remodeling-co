/**
 * Multi-room featured project sets. Every room/exterior in a set must read as
 * the same property (materials, windows, landscape, lighting).
 *
 * Phase 10: Boise Remodeling Co uses one 1972 Boise Bench ranch across shots.
 * Captions describe materials and work, not invented client project records (D9).
 */

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

const BENCH = "/images/projects/boise-bench-ranch";

/** Boise Bench ranch remodel set: one house, exterior and rooms. */
export const FEATURED_BOISE_BENCH_RANCH: FeaturedProjectSet = {
  id: "boise-bench-ranch",
  city: "boise",
  title: "Boise Bench ranch remodel concept",
  description:
    "Concept design for a 1972 Bench ranch: sage-grey lap siding over brick, black-framed windows, white shaker kitchen with a sage island, and a primary bath with subway tile. Not a completed customer project.",
  rooms: [
    {
      key: "exterior",
      label: "Exterior",
      src: `${BENCH}/exterior-after.webp`,
      alt: "1972 Boise Bench ranch with sage-grey lap siding, brick wainscot, and black-framed windows",
    },
    {
      key: "kitchen",
      label: "Kitchen",
      src: `${BENCH}/kitchen-after.webp`,
      alt: "White shaker kitchen with sage island, white quartz, brass hardware, and hickory floor",
    },
    {
      key: "bath",
      label: "Primary bath",
      src: `${BENCH}/bath-after.webp`,
      alt: "Primary bath with white shaker vanity, brass fixtures, and subway-tile shower",
    },
    {
      key: "living",
      label: "Living and dining",
      src: `${BENCH}/living-after.webp`,
      alt: "Open living and dining with hickory floor and black-framed windows to the front yard",
    },
    {
      key: "exterior-before",
      label: "Exterior before",
      src: `${BENCH}/exterior-before.webp`,
      alt: "Same Bench ranch before remodel with faded tan siding and brown aluminium windows",
    },
  ],
};

/** @deprecated Prefer FEATURED_BOISE_BENCH_RANCH; kept as alias for older imports. */
export const FEATURED_EAGLE_WHOLE_HOME = FEATURED_BOISE_BENCH_RANCH;

export const FEATURED_PROJECT_SETS: FeaturedProjectSet[] = [FEATURED_BOISE_BENCH_RANCH];

export function getFeaturedProjectSet(id: string): FeaturedProjectSet | undefined {
  return FEATURED_PROJECT_SETS.find((set) => set.id === id);
}

export function getFeaturedProjectForService(
  serviceSlug: string,
): FeaturedProjectSet | undefined {
  if (serviceSlug === "whole-home-remodel" || serviceSlug === "kitchen-remodel" || serviceSlug === "bathroom-remodel") {
    return FEATURED_BOISE_BENCH_RANCH;
  }
  return undefined;
}
