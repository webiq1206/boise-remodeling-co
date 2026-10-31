/**
 * Picks the decorative images on the service, city-service and area landing
 * template so that no picture appears twice on one page, and above all never
 * in two neighbouring sections.
 *
 * Why this exists: the city-service pages showed the same kitchen render as a
 * full-bleed band and again, directly below, as the process photo. The two
 * files had different names, so a path comparison could not see it. Identity
 * here is visual (see shared/imageIdentity.ts).
 *
 * The hero, the before/after slider and the Bench ranch room strip are fixed.
 * A "Remodeling possibilities" card keeps its own image unless that picture is
 * already on the page (two near-identical bathroom renders sat side by side on
 * /areas/meridian); then it takes an unused existing image of the same subject.
 * The decorative slots (breather band, process photo, in-guide illustrations)
 * take their preferred image when that picture is not already on the page,
 * otherwise the next unused existing image for the subject. A decorative slot
 * with nothing unused left is omitted rather than repeated.
 */

import { imageIdentity } from "./imageIdentity";

/**
 * Existing images that fit each service's subject, checked by eye against the
 * service renders so that none of them is a copy of one. In-progress and
 * detail shots come first because the process panel picks from the top.
 */
export const SUBJECT_ALTERNATES: Record<string, readonly string[]> = {
  "kitchen-remodel": [
    "/images/kitchen-in-progress.webp",
    "/images/blog/kitchen-layout-ideas-boise-homes.webp",
    "/images/gallery/gallery-kitchen-eagle-after.webp",
    "/images/blog/kitchen-island-design-guide.webp",
    "/images/blog/small-kitchen-remodel-ideas-boise.webp",
  ],
  "bathroom-remodel": [
    "/images/blog/walk-in-shower-guide.webp",
    "/images/blog/bathroom-layout-planning-guide.webp",
    "/images/blog/bathroom-remodel-roi.webp",
    "/images/blog/luxury-bathroom-features.webp",
  ],
  "whole-home-remodel": [
    "/images/blog/whole-home-rough-in.webp",
    "/images/blog/whole-home-remodel-cost-boise.webp",
    "/images/blog/design-build-process-guide.webp",
    "/images/blog/open-concept-kitchen-remodeling.webp",
  ],
  "room-addition": [
    "/images/blog/home-addition-timeline-guide.webp",
    "/images/blog/primary-suite-additions.webp",
    "/images/blog/home-addition-cost-boise.webp",
    "/images/blog/bedroom-additions.webp",
  ],
  adu: [
    "/images/blog/adu-cost-boise.webp",
    "/images/blog/multigenerational-living-remodels.webp",
    "/images/blog/garage-conversions.webp",
  ],
  "basement-remodel": [
    "/images/gallery/gallery-basement-meridian-before.webp",
    "/images/blog/basement-finishing-boise.webp",
  ],
  "outdoor-living": [
    "/images/blog/covered-patios-boise.webp",
    "/images/blog/outdoor-living-roi.webp",
    "/images/blog/outdoor-kitchens-boise.webp",
    "/images/blog/outdoor-fireplaces-boise.webp",
  ],
  "aging-in-place": [
    "/images/blog/curbless-shower-guide.webp",
    "/images/blog/aging-in-place-bathroom-design.webp",
    "/images/blog/walk-in-shower-guide.webp",
  ],
  general: [
    "/images/process-design-review.webp",
    "/images/blog/material-selection-guide.webp",
    "/images/blog/consultation-process-remodeling.webp",
    "/images/blog/design-build-process-guide.webp",
  ],
};

export interface LandingImageInput {
  hero?: string;
  /** Preferred breather band image. */
  breather?: string;
  /** Preferred process panel image. */
  process?: string;
  /** Fixed images rendered between the breather band and the process panel. */
  showcase?: readonly string[];
  /** Project cards rendered after the long-form guide, with each card's subject. */
  proof?: readonly { src: string; subject?: string }[];
  /** How many in-guide illustration slots the long-form section has. */
  sectionSlots: number;
  /** Service slug (or "general") whose alternates may fill a slot. */
  subject?: string;
}

export interface LandingImageSlots {
  breather?: string;
  process?: string;
  sectionBreathers: (string | undefined)[];
  /** Image for each proof card, in the order given. */
  proof: string[];
}

/** Gallery serviceType values that are not service slugs. */
const GALLERY_SUBJECT: Record<string, string> = { "basement-finish": "basement-remodel" };

export function gallerySubject(serviceType: string): string {
  return GALLERY_SUBJECT[serviceType] ?? serviceType;
}

export function resolveLandingImages(input: LandingImageInput): LandingImageSlots {
  const used = new Set<string>();
  const mark = (src: string | undefined) => {
    if (src) used.add(imageIdentity(src));
  };
  mark(input.hero);
  input.showcase?.forEach(mark);

  const alternatesFor = (subject: string | undefined) => [
    ...(subject ? SUBJECT_ALTERNATES[subject] ?? [] : []),
    ...SUBJECT_ALTERNATES.general,
  ];
  const isFree = (src: string) => !used.has(imageIdentity(src));

  // Proof cards are content: each keeps its own picture when it is new to the
  // page, and only a repeat is swapped (never dropped).
  const proof = (input.proof ?? []).map((card) => {
    const chosen = isFree(card.src)
      ? card.src
      : (SUBJECT_ALTERNATES[card.subject ?? ""] ?? []).find(isFree) ?? card.src;
    mark(chosen);
    return chosen;
  });

  const alternates = alternatesFor(input.subject);
  const pick = (preferred: string | undefined): string | undefined => {
    for (const candidate of [preferred, ...alternates]) {
      if (candidate && !used.has(imageIdentity(candidate))) {
        mark(candidate);
        return candidate;
      }
    }
    return undefined;
  };

  const breather = pick(input.breather);
  const process = pick(input.process);
  const sectionBreathers = Array.from({ length: input.sectionSlots }, () => pick(undefined));
  return { breather, process, sectionBreathers, proof };
}

/** Indices of the long-form sections that carry an illustration above them. */
export function sectionBreatherIndices(sectionCount: number): number[] {
  if (sectionCount < 3) return [];
  const out: number[] = [];
  for (let i = 1; i < sectionCount; i += 2) out.push(i);
  return out;
}

/** Blog topic hubs mapped to the subject whose existing images fit them. */
export const HUB_SUBJECT: Record<string, string> = {
  "kitchen-remodeling": "kitchen-remodel",
  "bathroom-remodeling": "bathroom-remodel",
  "home-additions": "room-addition",
  "whole-home-remodeling": "whole-home-remodel",
  "outdoor-living": "outdoor-living",
};

/**
 * A page hero that is not a copy of any image in the section right below it
 * (an index hero over a card grid). Keeps `preferred` when it is distinct,
 * otherwise the first existing image for the subject that no card uses.
 */
export function distinctHeroImage(
  preferred: string,
  belowImages: readonly string[],
  subject?: string,
  firstChoices: readonly string[] = [],
): string {
  const taken = new Set(belowImages.map(imageIdentity));
  const candidates = [
    preferred,
    ...firstChoices,
    ...(subject ? SUBJECT_ALTERNATES[subject] ?? [] : []),
    ...SUBJECT_ALTERNATES.general,
  ];
  return candidates.find((src) => !taken.has(imageIdentity(src))) ?? preferred;
}
