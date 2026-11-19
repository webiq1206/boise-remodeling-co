/**
 * Visual identity of the site's image files.
 *
 * Some files under public/images are the same render saved under different
 * names (the service hero, several gallery "after" images and the Bench ranch
 * kitchen are one picture). City-service heroes were given their own
 * photographs on 19 November 2026 and are no longer copies of the service
 * hero. Comparing paths therefore cannot tell whether two sections show
 * the same picture. Each group below is one picture; any file not listed is
 * its own picture.
 *
 * Groups come from a perceptual (difference) hash of every file, distance 6
 * or less out of 64 bits, plus hand merges where a crop of the same room
 * hashed further apart (the Bench ranch bath is a crop of the bathroom service
 * photograph). The aging-in-place bath is its own photograph and its own group.
 * tests/landing-image-adjacency.test.ts recomputes the hashes, so a newly
 * added copy fails the test until it is listed here.
 */
export const VISUAL_DUPLICATE_GROUPS: readonly (readonly string[])[] = [
  ["/images/about-oak-kitchen.webp", "/images/consult-lifestyle.webp", "/images/gallery/featured-eagle-kitchen.webp", "/images/gallery/gallery-kitchen-after.webp", "/images/gallery/gallery-kitchen-meridian-after.webp", "/images/gallery/kitchen-refresh-design-after.webp", "/images/hero-remodel-interior.webp", "/images/projects/boise-bench-ranch/kitchen-after.webp", "/images/service-scenes/kitchen.webp", "/images/services/kitchen-remodel.webp"],
  ["/images/about/perkins-family-full.webp", "/images/about/perkins-family-meridian-idaho-1x1.webp", "/images/about/perkins-family-meridian-idaho.webp"],
  ["/images/areas/boise.webp", "/images/blog/boise-remodeling-guide.webp"],
  ["/images/areas/eagle.webp", "/images/blog/eagle-foothills-remodeling-guide.webp"],
  ["/images/city-service/adu__boise.webp", "/images/gallery/gallery-adu-boise-after.webp", "/images/services/adu.webp"],
  ["/images/city-service/bathroom-remodel__middleton.webp", "/images/gallery/featured-eagle-bath.webp", "/images/gallery/gallery-aging-meridian-after.webp", "/images/gallery/gallery-bathroom-after.webp", "/images/gallery/gallery-bathroom-nampa-after.webp", "/images/gallery/gallery-hall-bath-boise-after.webp", "/images/projects/boise-bench-ranch/bath-after.webp", "/images/service-scenes/bathroom.webp", "/images/services/bathroom-remodel.webp"],
  ["/images/city-service/room-addition__boise.webp", "/images/gallery/gallery-addition-after.webp", "/images/gallery/gallery-addition-eagle-after.webp", "/images/gallery/gallery-addition-meridian-after.webp", "/images/services/room-addition.webp"],
  ["/images/city-service/whole-home-remodel__boise.webp", "/images/gallery/featured-eagle-great-room.webp", "/images/gallery/gallery-whole-home-after.webp", "/images/gallery/gallery-whole-home-meridian-after.webp", "/images/hero-great-room.webp", "/images/projects/boise-bench-ranch/living-after.webp", "/images/services/whole-home-remodel.webp", "/images/statement-great-room.webp"],
  ["/images/gallery/featured-eagle-exterior.webp", "/images/gallery/featured-eagle-outdoor.webp", "/images/gallery/gallery-whole-home-before.webp", "/images/projects/boise-bench-ranch/exterior-after.webp", "/images/projects/boise-bench-ranch/exterior-before.webp"],
  ["/images/gallery/gallery-aging-boise-after.webp", "/images/services/aging-in-place.webp"],
  ["/images/gallery/gallery-basement-after.webp", "/images/gallery/gallery-basement-meridian-after.webp", "/images/gallery/gallery-basement-nampa-after.webp", "/images/services/basement-remodel.webp"],
  ["/images/gallery/gallery-outdoor-after.webp", "/images/gallery/gallery-outdoor-eagle-after.webp", "/images/gallery/gallery-outdoor-meridian-after.webp", "/images/services/outdoor-living.webp"],
  ["/images/kitchen-in-progress.webp", "/images/value-craftsmanship-materials.webp"],
  ["/images/leadership-team.webp", "/images/process-design-review.webp"],
];

const IDENTITY = new Map<string, string>();
for (const group of VISUAL_DUPLICATE_GROUPS) {
  for (const src of group) IDENTITY.set(src, group[0]);
}

/** A key that is equal for two paths exactly when they show the same picture. */
export function imageIdentity(src: string): string {
  const path = src.split("?")[0];
  return IDENTITY.get(path) ?? path;
}

export function isSameImage(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return imageIdentity(a) === imageIdentity(b);
}
