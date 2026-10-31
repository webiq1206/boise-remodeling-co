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
  // Existing images used as alternates on the landing template (shared/landingImages.ts).
  '/images/blog/kitchen-layout-ideas-boise-homes.webp':
    'Open kitchen with a long island, woven counter stools and white cabinets beside a dining area',
  '/images/gallery/gallery-kitchen-eagle-after.webp':
    'Kitchen with wood cabinets, a stone island and a wide window looking out to the foothills',
  '/images/blog/kitchen-island-design-guide.webp':
    'White kitchen island with a waterfall counter, woven pendant lights and upholstered stools',
  '/images/blog/small-kitchen-remodel-ideas-boise.webp':
    'Compact white kitchen with butcher-block counters, open shelving and a pull-out pantry',
  '/images/blog/walk-in-shower-guide.webp':
    'Walk-in shower with frameless glass, stone-look tile, a built-in bench and a wall niche',
  '/images/blog/bathroom-layout-planning-guide.webp':
    'Bathroom with a white vanity, a tiled shower with glass walls and a freestanding tub',
  '/images/blog/bathroom-remodel-roi.webp':
    'Bathroom with a wood vanity, a white counter, a black-framed mirror and a glass shower',
  '/images/blog/luxury-bathroom-features.webp':
    'Primary bathroom with a freestanding tub, a glass shower and a dark double vanity',
  '/images/blog/whole-home-remodel-cost-boise.webp':
    'Living and dining room with a stone fireplace, built-in shelves and wood floors',
  '/images/blog/design-build-process-guide.webp':
    'Open living room with a sectional sofa, a ceiling fan and a kitchen beyond',
  '/images/blog/open-concept-kitchen-remodeling.webp':
    'Open kitchen with a wood island, white upper cabinets and a sliding barn door',
  '/images/blog/home-addition-timeline-guide.webp':
    'Wood framing for a home addition going up against the side of a house',
  '/images/blog/primary-suite-additions.webp':
    'Bedroom with a vaulted beamed ceiling, tall windows and a seating area',
  '/images/blog/home-addition-cost-boise.webp':
    'Single-story house with tan siding and a side addition on a green lawn',
  '/images/blog/bedroom-additions.webp':
    'Bright bedroom with large windows, a wood dresser and a woven rug',
  '/images/blog/adu-cost-boise.webp':
    'Small detached cottage with a covered front porch beside a main house',
  '/images/blog/multigenerational-living-remodels.webp':
    'Living area with a kitchenette, a sofa and a doorway to a bedroom',
  '/images/blog/garage-conversions.webp':
    'Converted garage room with wood floors, a large window and a desk',
  '/images/gallery/gallery-basement-meridian-before.webp':
    'Unfinished basement with a concrete floor, exposed joists and a wood stair',
  '/images/blog/basement-finishing-boise.webp':
    'Finished basement family room with a sectional sofa, a media wall and recessed lights',
  '/images/blog/covered-patios-boise.webp':
    'Covered patio with a wood ceiling, a ceiling fan, outdoor seating and a grill',
  '/images/blog/outdoor-living-roi.webp':
    'Paver patio with a fire pit, outdoor chairs and planted beds behind a house',
  '/images/blog/outdoor-kitchens-boise.webp':
    'Covered outdoor kitchen with a stone counter, a built-in grill and evening lights',
  '/images/blog/outdoor-fireplaces-boise.webp':
    'Covered patio with a stone fireplace and outdoor sofas at dusk',
  '/images/blog/curbless-shower-guide.webp':
    'Curbless shower with a flush tile floor, a linear drain, a fold-down bench and grab bars',
  '/images/blog/aging-in-place-bathroom-design.webp':
    'Accessible bathroom with a walk-in shower, grab bars, a fold-down seat and a wide vanity',
  '/images/blog/material-selection-guide.webp':
    'Finish samples: quartz, wood flooring, cabinet door, tile and brass hardware',
  '/images/blog/consultation-process-remodeling.webp':
    'Remodel plans, finish samples and a laptop on a dining table during a planning meeting',
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
