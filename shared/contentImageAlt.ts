/**
 * Descriptive alt text for content photographs. No ratings, rankings, or
 * unverified outcomes. Brand marks are not described here; those SVGs use an
 * empty alt and aria-hidden.
 */

const SERVICE_ALT: Record<string, string> = {
  'kitchen-remodel':
    'Kitchen with a wood island, black metal lights, and light wood floors opening to a living room',
  'bathroom-remodel': 'Bathroom with a glass walk-in shower, wood vanity, and white tile',
  'whole-home-remodel':
    'Open living room with wood beams, a stone fireplace, and a view into the kitchen',
  'room-addition': 'Single-story house exterior with a covered porch and a green lawn',
  adu: 'Small backyard building with wood siding, a covered porch, and a gravel path',
  'basement-remodel': 'Finished basement room with light wood floors, a wall of windows, and a ceiling fan',
  'outdoor-living': 'Covered patio with a wood dining table, stone fireplace, and string lights',
  'aging-in-place': 'Bathroom with a wood-look tile shower, a built-in bench, and a wood vanity',
};

const AREA_ALT: Record<string, string> = {
  boise: 'Tree-lined residential street with sidewalks and front yards',
  meridian: 'Wide residential street with sidewalks, lawns, and young trees',
  eagle: 'Suburban street with single-story houses, front lawns, and trees',
  nampa: 'Residential street with two-story houses, driveways, and lawns',
  kuna: 'Residential street with houses, front lawns, and trees',
  star: 'Wide residential street with houses, lawns, and trees',
  middleton: 'Residential street with houses, lawns, and a sidewalk',
  caldwell: 'Residential street with houses, lawns, and trees',
};

const PATH_ALT: Record<string, string> = {
  '/images/services/kitchen-remodel.webp': SERVICE_ALT['kitchen-remodel'],
  '/images/services/bathroom-remodel.webp': SERVICE_ALT['bathroom-remodel'],
  '/images/services/whole-home-remodel.webp': SERVICE_ALT['whole-home-remodel'],
  '/images/services/room-addition.webp': SERVICE_ALT['room-addition'],
  '/images/services/adu.webp': SERVICE_ALT.adu,
  '/images/services/basement-remodel.webp': SERVICE_ALT['basement-remodel'],
  '/images/services/outdoor-living.webp': SERVICE_ALT['outdoor-living'],
  '/images/services/aging-in-place.webp': SERVICE_ALT['aging-in-place'],
  '/images/kitchen-in-progress.webp': 'Kitchen during a remodel, with open cabinets and work underway',
  '/images/process-design-review.webp': 'Remodel plans and finish samples on a kitchen counter',
  '/images/hero-remodel-interior.webp': 'Open kitchen and living space with warm wood and stone',
  '/images/about-oak-kitchen.webp':
    'Warm open kitchen with white oak cabinets, a large island and black-framed windows',
  '/images/blog/whole-home-rough-in.webp':
    'Interior stripped to the studs with new wiring and floor protection during a whole-home renovation',
};

export function contentImageAlt(src: string | undefined, fallback = 'Photograph of a home interior'): string {
  if (!src) return fallback;
  const path = src.split('?')[0];
  if (PATH_ALT[path]) return PATH_ALT[path];
  const cityService = path.match(/\/city-service\/([^_/]+)__/);
  if (cityService && SERVICE_ALT[cityService[1]]) return SERVICE_ALT[cityService[1]];
  const area = path.match(/\/areas\/([^./]+)\.webp$/);
  if (area) return AREA_ALT[area[1]] ?? 'Residential neighborhood street with houses and trees';
  const service = path.match(/\/services\/([^./]+)\.webp$/);
  if (service && SERVICE_ALT[service[1]]) return SERVICE_ALT[service[1]];
  return fallback;
}
