/**
 * Marketing image paths. These point at project photography in
 * `public/images/`. Replace with your own photos using the same filenames
 * (or update the paths here) - .jpg or .webp also work.
 */

export const SITE_IMAGES = {
  /** Homepage hero - great room with kitchen visible; distinct from whole-home after. */
  hero: "/images/hero-great-room.webp",
  /** Design-build / plan review split panels. */
  process: "/images/process-design-review.webp",
  /**
   * "Where your money goes" value band. Craftsmanship and quality materials
   * mid-install (custom cabinetry, quartz, staged white-oak flooring) - shows
   * the budget landing in the home, not overhead. Distinct from `process` so
   * the band no longer reuses the About page's plan-review photo.
   */
  value: "/images/value-craftsmanship-materials.webp",
  /** Kitchen remodel in progress - process sections. */
  processInProgress: "/images/kitchen-in-progress.webp",
  /** Full-bleed brand statement band. */
  statementBand: "/images/statement-great-room.webp",
  /** About/contact split panels and about hero. */
  leadership: "/images/leadership-team.webp",
  /** Consultation section background (homepage). */
  consultBg: "/images/consult-lifestyle.webp",
  /** Budget section subtle texture - island detail crop. */
  budgetDetail: "/images/budget-kitchen-detail.webp",
} as const;

export const GALLERY_IMAGES = {
  kitchen: {
    before: "/images/gallery/gallery-kitchen-before.webp",
    after: "/images/gallery/gallery-kitchen-after.webp",
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
