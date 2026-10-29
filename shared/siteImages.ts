/**
 * Marketing image paths. These point at representative design imagery in
 * `public/images/`. Replace with your own photos using the same filenames
 * (or update the paths here) - .jpg or .webp also work.
 */

export const SITE_IMAGES = {
  /**
   * Homepage / contact hero. Quality-pass retarget: Boise Bench ranch kitchen
   * after (white shaker, sage island, hickory) for Phase 10 continuity.
   */
  hero: "/images/hero-remodel-interior.webp",
  /** Design-build plan review - materials on counter, no people (quality-pass). */
  process: "/images/process-design-review.webp",
  /**
   * Value band - kitchen mid-remodel craftsmanship on the Bench ranch set.
   */
  value: "/images/value-craftsmanship-materials.webp",
  /** Kitchen remodel in progress - same Bench ranch kitchen mid-job. */
  processInProgress: "/images/kitchen-in-progress.webp",
  /** Full-bleed brand statement band - Bench ranch living after. */
  statementBand: "/images/statement-great-room.webp",
  /** About / contact visit panel - Bench ranch kitchen after. */
  aboutKitchen: "/images/about-oak-kitchen.webp",
  /** Consultation section background - Bench ranch kitchen after. */
  consultBg: "/images/consult-lifestyle.webp",
  /** Budget section subtle texture - island detail crop. */
  budgetDetail: "/images/budget-kitchen-detail.webp",
} as const;

/**
 * Cohesive Eagle foothills whole-home featured set (exterior + rooms).
 * Keep materials/windows consistent when regenerating any frame.
 */
export const FEATURED_EAGLE_IMAGES = {
  exterior: "/images/projects/boise-bench-ranch/exterior-after.webp",
  greatRoom: "/images/projects/boise-bench-ranch/living-after.webp",
  kitchen: "/images/projects/boise-bench-ranch/kitchen-after.webp",
  bath: "/images/projects/boise-bench-ranch/bath-after.webp",
  outdoor: "/images/projects/boise-bench-ranch/exterior-before.webp",
} as const;

export const FEATURED_BOISE_BENCH_IMAGES = FEATURED_EAGLE_IMAGES;

export const GALLERY_IMAGES = {
  kitchen: {
    before: "/images/gallery/gallery-kitchen-before.webp",
    after: "/images/gallery/kitchen-refresh-design-after.webp",
  },
  bathroom: {
    before: "/images/gallery/gallery-bathroom-before.webp",
    after: "/images/gallery/gallery-bathroom-after.webp",
  },
  wholeHome: {
    before: "/images/gallery/gallery-whole-home-before.webp",
    after: "/images/gallery/gallery-whole-home-after.webp",
  },
  addition: {
    before: "/images/gallery/gallery-addition-before.webp",
    after: "/images/gallery/gallery-addition-after.webp",
  },
  basement: {
    before: "/images/gallery/gallery-basement-before.webp",
    after: "/images/gallery/gallery-basement-after.webp",
  },
  outdoor: {
    before: "/images/gallery/gallery-outdoor-before.webp",
    after: "/images/gallery/gallery-outdoor-after.webp",
  },
  aduBoise: {
    before: "/images/gallery/gallery-adu-boise-before.webp",
    after: "/images/gallery/gallery-adu-boise-after.webp",
  },
  agingBoise: {
    before: "/images/gallery/gallery-aging-boise-before.webp",
    after: "/images/gallery/gallery-aging-boise-after.webp",
  },
  kitchenMeridian: {
    before: "/images/gallery/gallery-kitchen-meridian-before.webp",
    after: "/images/gallery/gallery-kitchen-meridian-after.webp",
  },
  kitchenEagle: {
    before: "/images/gallery/gallery-kitchen-eagle-before.webp",
    after: "/images/gallery/gallery-kitchen-eagle-after.webp",
  },
  hallBathBoise: {
    before: "/images/gallery/gallery-hall-bath-boise-before.webp",
    after: "/images/gallery/gallery-hall-bath-boise-after.webp",
  },
  bathroomNampa: {
    before: "/images/gallery/gallery-bathroom-nampa-before.webp",
    after: "/images/gallery/gallery-bathroom-nampa-after.webp",
  },
  wholeHomeMeridian: {
    before: "/images/gallery/gallery-whole-home-meridian-before.webp",
    after: "/images/gallery/gallery-whole-home-meridian-after.webp",
  },
  additionEagle: {
    before: "/images/gallery/gallery-addition-eagle-before.webp",
    after: "/images/gallery/gallery-addition-eagle-after.webp",
  },
  additionMeridian: {
    before: "/images/gallery/gallery-addition-meridian-before.webp",
    after: "/images/gallery/gallery-addition-meridian-after.webp",
  },
  basementMeridian: {
    before: "/images/gallery/gallery-basement-meridian-before.webp",
    after: "/images/gallery/gallery-basement-meridian-after.webp",
  },
  basementNampa: {
    before: "/images/gallery/gallery-basement-nampa-before.webp",
    after: "/images/gallery/gallery-basement-nampa-after.webp",
  },
  outdoorEagle: {
    before: "/images/gallery/gallery-outdoor-eagle-before.webp",
    after: "/images/gallery/gallery-outdoor-eagle-after.webp",
  },
  outdoorMeridian: {
    before: "/images/gallery/gallery-outdoor-meridian-before.webp",
    after: "/images/gallery/gallery-outdoor-meridian-after.webp",
  },
  agingMeridian: {
    before: "/images/gallery/gallery-aging-meridian-before.webp",
    after: "/images/gallery/gallery-aging-meridian-after.webp",
  },
} as const;
