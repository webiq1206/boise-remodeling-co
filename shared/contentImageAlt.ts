/**
 * Descriptive alt text for content photographs. No ratings, rankings, or
 * unverified outcomes. Brand marks are not described here; those SVGs use an
 * empty alt and aria-hidden.
 */

const SERVICE_ALT: Record<string, string> = {
  'kitchen-remodel':
    'White shaker kitchen with a sage green island, white quartz counters and a black-framed window',
  'bathroom-remodel': 'Bathroom with a white vanity, a brass-framed mirror and a glass walk-in shower with white tile',
  'whole-home-remodel':
    'Open living and dining room with wood floors and a view into a white and sage green kitchen',
  'room-addition': 'Single-story house with grey lap siding, a sliding glass door and a new concrete patio',
  adu: 'Small backyard building with grey lap siding, black-framed windows and a gravel path',
  'basement-remodel': 'Finished basement room with a grey sectional sofa, plank flooring and a carpeted stair',
  'outdoor-living': 'Covered patio with square black posts, a wood ceiling and a wood dining table',
  'aging-in-place': 'Bathroom with a curbless tile shower, a fold-down bench, grab bars and an open vanity',
};

const AREA_ALT: Record<string, string> = {
  boise: 'Residential street with two-story houses, young trees, and a grassy hillside beyond',
  meridian: 'Two-story white house with dark trim, an attached garage, and a front lawn',
  eagle: 'Single-story house with a dark metal roof, lit windows, and gravel landscaping at dusk',
  nampa: 'Residential street with two-story houses, driveways, and lawns',
  kuna: 'Single-story house with a dark metal roof, a wood-clad entry, and mountains beyond',
  star: 'Two-story house with dark siding and a covered patio beside a river',
  middleton: 'Residential street with houses, lawns, and a sidewalk',
  caldwell: 'Residential street with houses, lawns, and trees',
};

const PATH_ALT: Record<string, string> = {
  // City page heroes: each city shows its own photograph (owner, 19 November 2026), so each has its own description.
  '/images/city-service/kitchen-remodel__boise.webp':
    'White kitchen with an oak island, three wood stools and two black pendant lights',
  '/images/city-service/kitchen-remodel__meridian.webp':
    'White kitchen with an oak island, a plaster range hood and two black pendant lights',
  '/images/city-service/kitchen-remodel__eagle.webp':
    'Kitchen with oak cabinets, a dark island with four wood stools and black pendant lights',
  '/images/city-service/kitchen-remodel__nampa.webp':
    'White kitchen with an oak island, two wood stools and a window over the sink',
  '/images/city-service/kitchen-remodel__kuna.webp':
    'Open white kitchen with an oak island and three stools beside a living area',
  '/images/city-service/kitchen-remodel__star.webp':
    'White kitchen with an oak island of drawers and black-framed windows facing dry hills',
  '/images/city-service/kitchen-remodel__middleton.webp':
    'White kitchen with a dark island, three stools and stainless steel appliances',
  '/images/city-service/kitchen-remodel__caldwell.webp':
    'Cream kitchen with an oak island of drawers and two black pendant lights',
  '/images/city-service/bathroom-remodel__boise.webp':
    'Bathroom with an oak double vanity, two round mirrors and a glass walk-in shower',
  '/images/city-service/bathroom-remodel__meridian.webp':
    'Bathroom with a floating oak vanity, two black-framed mirrors and a glass walk-in shower',
  '/images/city-service/bathroom-remodel__eagle.webp':
    'Bathroom with a freestanding tub under a large window facing the foothills',
  '/images/city-service/bathroom-remodel__nampa.webp':
    'Freestanding soaking tub with a brass floor-mounted filler beside a stone-look tile wall',
  '/images/city-service/bathroom-remodel__kuna.webp':
    'Bathroom with a long oak vanity, two black-framed mirrors and a freestanding tub',
  '/images/city-service/bathroom-remodel__star.webp':
    'Bathroom with a floating walnut vanity, a white counter and a glass shower',
  '/images/city-service/bathroom-remodel__caldwell.webp':
    'Bathroom with an oak vanity, a black-framed mirror and a tub with a glass panel',
  '/images/city-service/whole-home-remodel__meridian.webp':
    'Living room with a grey sofa, a plaster fireplace and two black-framed windows',
  '/images/city-service/whole-home-remodel__eagle.webp':
    'Living room with a linear fireplace, a light sofa and two tall windows facing the foothills',
  '/images/city-service/whole-home-remodel__nampa.webp':
    'Open great room with a sofa, a linear fireplace, oak cabinets and large black-framed windows',
  '/images/city-service/whole-home-remodel__kuna.webp':
    'Living room with a linear fireplace, two light armchairs and tall windows to a fenced yard',
  '/images/city-service/whole-home-remodel__star.webp':
    'Dining room with a wood table, a black dome pendant and floor-to-ceiling windows facing the foothills',
  '/images/city-service/whole-home-remodel__middleton.webp':
    'Empty great room with wood floors, a linear fireplace and tall black-framed windows',
  '/images/city-service/whole-home-remodel__caldwell.webp':
    'Great room with a sectional sofa, a linear fireplace and a wall of sliding glass doors facing the hills',
  '/images/city-service/room-addition__meridian.webp':
    'Bright room addition with wood floors, a light sofa and three black-framed windows facing a lawn',
  '/images/city-service/room-addition__eagle.webp':
    'Sunroom addition with black-framed glass walls, two armchairs and a view of the foothills',
  '/images/city-service/room-addition__nampa.webp':
    'Single-story addition with dark siding, sliding glass doors and a small patio',
  '/images/city-service/room-addition__kuna.webp':
    'Room addition under construction with exposed framing beside a house with grey siding',
  '/images/city-service/room-addition__star.webp':
    'Bedroom addition with a low platform bed, wood floors and a doorway to a bathroom',
  '/images/city-service/room-addition__middleton.webp':
    'Attached garage addition with dark siding and a concrete driveway below dry hills',
  '/images/city-service/room-addition__caldwell.webp':
    'Second-story addition being framed above a single-story house',
  '/images/city-service/adu__meridian.webp':
    'White backyard cottage with a dark metal roof, a wood entry and a cedar fence',
  '/images/city-service/adu__eagle.webp':
    'Small dark-sided cottage with a metal roof, a wood door and a stone path through dry grasses',
  '/images/city-service/adu__nampa.webp':
    'Backyard studio with grey vertical siding, a wood-clad entry and a stepping-stone path',
  '/images/city-service/adu__kuna.webp':
    'Small stucco cottage with a dark metal roof beside a cedar fence',
  '/images/city-service/adu__star.webp':
    'Detached backyard unit with dark vertical siding and a wood-clad entry',
  '/images/city-service/adu__middleton.webp':
    'Attached unit with dark lap siding, a covered entry and concrete steps',
  '/images/city-service/adu__caldwell.webp':
    'Garage converted to living space with a large black-framed window wall',
  '/images/services/kitchen-remodel.webp': SERVICE_ALT['kitchen-remodel'],
  '/images/services/bathroom-remodel.webp': SERVICE_ALT['bathroom-remodel'],
  '/images/services/whole-home-remodel.webp': SERVICE_ALT['whole-home-remodel'],
  '/images/services/room-addition.webp': SERVICE_ALT['room-addition'],
  '/images/services/adu.webp': SERVICE_ALT.adu,
  '/images/services/basement-remodel.webp': SERVICE_ALT['basement-remodel'],
  '/images/services/outdoor-living.webp': SERVICE_ALT['outdoor-living'],
  '/images/services/aging-in-place.webp': SERVICE_ALT['aging-in-place'],
  '/images/kitchen-in-progress.webp': 'Kitchen during a remodel, with open cabinets and work underway',
  '/images/statement-great-room.webp': 'Open living and dining room with wood floors and a view into a white and sage green kitchen',
  '/images/hero-great-room.webp': 'Open living and dining room with wood floors and a view into a white and sage green kitchen',
  '/images/value-craftsmanship-materials.webp': 'Kitchen during a remodel, with open cabinets and work underway',
  '/images/consult-lifestyle.webp': 'White shaker kitchen with a sage green island, white quartz counters and a black-framed window',
  '/images/budget-kitchen-detail.webp': 'Sage green kitchen island with a white quartz counter',
  '/images/process-design-review.webp': 'Remodel plans and finish samples on a kitchen island',
  '/images/hero-remodel-interior.webp': 'White shaker kitchen with a sage green island, white quartz counters and a black-framed window',
  '/images/about-oak-kitchen.webp':
    'White shaker kitchen with a sage green island, white quartz counters and a black-framed window',
  '/images/blog/whole-home-rough-in.webp':
    'Interior stripped to the studs with new wiring and floor protection during a whole-home renovation',
  // Existing images used as alternates on the landing template (shared/landingImages.ts).
  '/images/blog/kitchen-layout-ideas-boise-homes.webp':
    'Kitchen with an oak island, three black stools and a window over the sink',
  '/images/gallery/gallery-kitchen-eagle-after.webp':
    'Kitchen with white shaker cabinets, a charcoal island with three stools and a black-framed window over the sink',
  '/images/blog/kitchen-island-design-guide.webp':
    'White kitchen island with a waterfall counter, three wood stools and white pendant lights',
  '/images/blog/small-kitchen-remodel-ideas-boise.webp':
    'Kitchen with charcoal base cabinets, oak upper cabinets and a white peninsula',
  '/images/blog/walk-in-shower-guide.webp':
    'Tiled shower bench with a stone top, a wall niche and a brass handheld shower',
  '/images/blog/bathroom-layout-planning-guide.webp':
    'Bathroom with a freestanding tub, a glass shower and a long oak vanity',
  '/images/blog/bathroom-remodel-roi.webp':
    'Bathroom with a wood vanity, a white counter, a black-framed mirror and a glass shower',
  '/images/blog/luxury-bathroom-features.webp':
    'Bathroom with a freestanding tub under a large window facing the foothills',
  '/images/blog/whole-home-remodel-cost-boise.webp':
    'Living and dining room with wood floors, a plaster fireplace and oak shelves',
  '/images/blog/design-build-process-guide.webp':
    'Living room with a linear fireplace, two light armchairs and tall windows to a fenced yard',
  '/images/blog/open-concept-kitchen-remodeling.webp':
    'Open kitchen with a wood island, white upper cabinets and a sliding barn door',
  '/images/blog/home-addition-timeline-guide.webp':
    'Wood framing for a home addition going up against the side of a house',
  '/images/blog/primary-suite-additions.webp':
    'Bedroom with an oak platform bed and large windows facing a lawn and dry hills',
  '/images/blog/home-addition-cost-boise.webp':
    'Single-story house with tan siding and a side addition on a green lawn',
  '/images/blog/bedroom-additions.webp':
    'Single-story addition framed with roof trusses and wrapped in white house wrap behind a gray house',
  '/images/blog/adu-cost-boise.webp':
    'Small detached backyard building with gray siding and a wood-clad entry beside a main house',
  '/images/blog/multigenerational-living-remodels.webp':
    'Kitchenette with white flat-panel cabinets, a sink and an under-counter refrigerator beside a wide opening to an empty room with a window',
  '/images/blog/garage-conversions.webp':
    'Converted garage room with wood floors, a large window and a desk',
  '/images/gallery/gallery-basement-meridian-before.webp':
    'Unfinished basement with a concrete floor, exposed joists and a wood stair',
  '/images/blog/basement-finishing-boise.webp':
    'Finished basement room with gray plank flooring, white walls and an egress window, with no furniture',
  '/images/blog/covered-patios-boise.webp':
    'Covered patio with a wood ceiling, black posts, a dining table and a built-in grill',
  '/images/blog/outdoor-living-roi.webp':
    'Covered patio with a wood ceiling and sliding glass doors behind a single-story house',
  '/images/blog/outdoor-kitchens-boise.webp':
    'Outdoor kitchen with a built-in grill, a sink and a concrete counter under a wood patio roof',
  '/images/blog/outdoor-fireplaces-boise.webp':
    'Covered patio with a plain stucco fireplace, an outdoor sofa and two chairs',
  '/images/blog/curbless-shower-guide.webp':
    'Curbless shower with a flush tile floor, a linear drain, a fold-down bench and grab bars',
  '/images/blog/aging-in-place-bathroom-design.webp':
    'Bathroom with a curbless shower, a fold-down seat, a grab bar and an open vanity',
  '/images/blog/material-selection-guide.webp':
    'Finish samples: quartz, wood flooring, cabinet door, tile and brass hardware',
  '/images/blog/consultation-process-remodeling.webp':
    'Clipboard with a project checklist, a tape measure and a level on a kitchen island',
};

import { localAlt, subjectForService, type LocalAltContext } from './localAlt';

const CITY_BY_SLUG: Record<string, string> = {
  boise: 'Boise', meridian: 'Meridian', eagle: 'Eagle', nampa: 'Nampa', kuna: 'Kuna', star: 'Star', middleton: 'Middleton', caldwell: 'Caldwell',
};

/** What the file itself is about, read from its path, for callers that give no page context. */
function contextFromPath(path: string): LocalAltContext {
  const cityService = path.match(/\/city-service\/([^_/]+)__([^./]+)\.webp$/);
  if (cityService) return { subject: subjectForService(cityService[1]), city: CITY_BY_SLUG[cityService[2]] };
  const area = path.match(/\/areas\/([^./]+)\.webp$/);
  if (area) return { city: CITY_BY_SLUG[area[1]] };
  const service = path.match(/\/services\/([^./]+)\.webp$/);
  if (service) return { subject: subjectForService(service[1]) };
  return {};
}

/** What the picture shows, with no local wording. */
export function imageDescription(src: string | undefined, fallback = 'Photograph of a home interior'): string {
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

/**
 * The alt for a content photograph: the work and the place, then what the
 * picture shows. Pass the page's own subject and city; without them the file's
 * path supplies what it can and Boise is the place.
 */
export function contentImageAlt(src: string | undefined, fallback = 'Photograph of a home interior', context?: LocalAltContext): string {
  const fromPath = src ? contextFromPath(src.split('?')[0]) : {};
  return localAlt(imageDescription(src, fallback), { subject: context?.subject ?? fromPath.subject, city: context?.city ?? fromPath.city });
}
