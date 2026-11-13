/**
 * Generates shared/blogImageRegistry.ts with unique hero paths for every blog post and guide.
 * Run: node scripts/generate-blog-image-registry.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Current reviewed source paths are retained, including legacy article mappings.
// Scene alt text describes the image; localized article topics remain in topicTags.
const ENTRIES = {
  "kitchen-remodel-cost-boise": {
    hero: "/images/blog/kitchen-remodel-cost-boise.webp",
    alt: "Kitchen with white cabinetry, a wood island and a stainless steel refrigerator",
    topicTags: ["kitchen","cost","boise"],
    source: "blog",
  },
  "bathroom-remodel-cost-boise": {
    hero: "/images/blog/bathroom-remodel-cost-boise.webp",
    alt: "Bathroom with a glass shower, wood vanity, light counter and window shade",
    topicTags: ["bathroom","cost","boise"],
    source: "blog",
  },
  "whole-home-remodel-cost-boise": {
    hero: "/images/blog/whole-home-remodel-cost-boise.webp",
    alt: "Living and dining room with wood floors, a plaster fireplace and oak shelves",
    topicTags: ["whole-home","cost","boise"],
    source: "blog",
  },
  "home-addition-cost-boise": {
    hero: "/images/blog/home-addition-cost-boise.webp",
    alt: "House exterior with pale lap siding, a gabled roof and a lawn",
    topicTags: ["addition","cost","boise"],
    source: "blog",
  },
  "luxury-remodel-cost-boise": {
    hero: "/images/blog/luxury-remodel-cost-boise.webp",
    alt: "Kitchen with walnut cabinetry, a stone waterfall island and tall black-framed windows",
    topicTags: ["luxury","cost","eagle"],
    source: "blog",
  },
  "remodel-cost-per-square-foot-boise": {
    hero: "/images/blog/remodel-cost-per-square-foot-boise.webp",
    alt: "Open living and dining room with wood floors, broad windows and a stone fireplace",
    topicTags: ["cost","whole-home","boise"],
    source: "blog",
  },
  "what-impacts-remodeling-costs-boise": {
    hero: "/images/blog/what-impacts-remodeling-costs-boise.webp",
    alt: "Kitchen with sage-green cabinets, a wood island and white pendant lights",
    topicTags: ["cost","planning","process"],
    source: "blog",
  },
  "how-to-budget-remodel-boise": {
    hero: "/images/blog/how-to-budget-remodel-boise.webp",
    alt: "Kitchen with sage-green cabinets, wood counters and a wide doorway",
    topicTags: ["cost","budget","planning"],
    source: "blog",
  },
  "kitchen-remodel-timeline-boise": {
    hero: "/images/blog/kitchen-remodel-timeline-boise.webp",
    alt: "Kitchen with white cabinetry, a dark island, pendant lights and wood flooring",
    topicTags: ["kitchen","timeline","boise"],
    source: "blog",
  },
  "kitchen-layout-ideas-boise-homes": {
    hero: "/images/blog/kitchen-layout-ideas-boise-homes.webp",
    alt: "Open kitchen with a central island, counter seating and a pantry doorway",
    topicTags: ["kitchen","layout","boise"],
    source: "blog",
  },
  "kitchen-cabinet-trends": {
    hero: "/images/city-service/kitchen-remodel__kuna.webp",
    alt: "White kitchen with a gray-green island, pendant lights and a broad window",
    topicTags: ["kitchen","cabinets","kuna"],
    source: "city-service",
  },
  "quartz-vs-quartzite-kitchen": {
    hero: "/images/city-service/kitchen-remodel__star.webp",
    alt: "White kitchen with a gray-green island, pendant lights and a broad window",
    topicTags: ["kitchen","countertops","star"],
    source: "city-service",
  },
  "kitchen-remodel-roi": {
    hero: "/images/blog/kitchen-remodel-roi.webp",
    alt: "White kitchen with tiled backsplash, a broad window and stainless steel appliances",
    topicTags: ["kitchen","roi","boise"],
    source: "blog",
  },
  "open-concept-kitchen-remodeling": {
    hero: "/images/blog/open-concept-kitchen-remodeling.webp",
    alt: "Open kitchen with a large wood island, white cabinetry and a view into a living area",
    topicTags: ["kitchen","open-concept","boise"],
    source: "blog",
  },
  "kitchen-island-design-guide": {
    hero: "/images/blog/kitchen-island-design-guide.webp",
    alt: "White kitchen island with a waterfall counter, three wood stools and white pendant lights",
    topicTags: ["kitchen","island","boise"],
    source: "blog",
  },
  "kitchen-cabinet-trends-boise": {
    hero: "/images/blog/kitchen-cabinet-trends-boise.webp",
    alt: "Kitchen with sage-green cabinetry, wood open shelving and a pale stone counter",
    topicTags: ["kitchen","cabinets","boise"],
    source: "blog",
  },
  "quartz-vs-quartzite-countertops": {
    hero: "/images/blog/quartz-vs-quartzite-countertops.webp",
    alt: "Kitchen with dark cabinets and a boldly veined stone island and backsplash",
    topicTags: ["kitchen","countertops","boise"],
    source: "blog",
  },
  "small-kitchen-remodel-ideas-boise": {
    hero: "/images/blog/small-kitchen-remodel-ideas-boise.webp",
    alt: "Galley kitchen with white cabinets, wood counters and open shelving",
    topicTags: ["kitchen","small","boise"],
    source: "blog",
  },
  "walk-in-pantry-design-guide": {
    hero: "/images/city-service/kitchen-remodel__caldwell.webp",
    alt: "White kitchen with a gray-green island, pendant lights and a broad window",
    topicTags: ["kitchen","pantry","caldwell"],
    source: "city-service",
  },
  "walk-in-shower-guide": {
    hero: "/images/blog/walk-in-shower-guide.webp",
    alt: "Walk-in shower with glass panels, large wall tiles and a built-in niche and bench",
    topicTags: ["bathroom","shower","boise"],
    source: "blog",
  },
  "curbless-shower-guide": {
    hero: "/images/blog/curbless-shower-guide.webp",
    alt: "Curbless tiled shower with a linear drain, glass enclosure and grab bar",
    topicTags: ["bathroom","shower","accessibility","boise"],
    source: "blog",
  },
  "luxury-bathroom-features": {
    hero: "/images/blog/luxury-bathroom-features.webp",
    alt: "Bathroom with a freestanding tub, glass shower, dark vanity and marble-look tile",
    topicTags: ["bathroom","luxury","boise"],
    source: "blog",
  },
  "how-long-does-a-bathroom-remodel-take": {
    hero: "/images/blog/how-long-does-a-bathroom-remodel-take.webp",
    alt: "Bathroom with a navy vanity, white counter and tiled shower-tub enclosure",
    topicTags: ["bathroom","timeline","boise"],
    source: "blog",
  },
  "small-bathroom-remodel-ideas": {
    hero: "/images/blog/small-bathroom-remodel-ideas.webp",
    alt: "Compact bathroom with a shower-tub enclosure, single vanity and light finishes",
    topicTags: ["bathroom","small","boise"],
    source: "blog",
  },
  "aging-in-place-bathroom-design": {
    hero: "/images/blog/aging-in-place-bathroom-design.webp",
    alt: "Bathroom with a tiled walk-in shower, wood bench and vanity beside a window",
    topicTags: ["bathroom","aging-in-place","boise"],
    source: "blog",
  },
  "bathroom-remodel-roi": {
    hero: "/images/blog/bathroom-remodel-roi.webp",
    alt: "Bathroom with a wood vanity, white counter and glass-enclosed tiled shower",
    topicTags: ["bathroom","roi","boise"],
    source: "blog",
  },
  "bathroom-layout-planning-guide": {
    hero: "/images/blog/bathroom-layout-planning-guide.webp",
    alt: "Bathroom with a freestanding tub, glass shower, white vanity and small floor tiles",
    topicTags: ["bathroom","layout","boise"],
    source: "blog",
  },
  "primary-suite-additions": {
    hero: "/images/blog/primary-suite-additions.webp",
    alt: "Bedroom with an oak platform bed and large windows facing a lawn and dry hills",
    topicTags: ["addition","primary-suite","boise"],
    source: "blog",
  },
  "adu-cost-boise": {
    hero: "/images/blog/adu-cost-boise.webp",
    alt: "Small detached backyard building with gray siding, a wood-clad entry and a stone path",
    topicTags: ["adu","addition","boise"],
    source: "blog",
  },
  "basement-finishing-boise": {
    hero: "/images/blog/basement-finishing-boise.webp",
    alt: "Lower-level family room with a sectional sofa, broad window and media wall",
    topicTags: ["addition","basement","boise"],
    source: "blog",
  },
  "bedroom-additions": {
    hero: "/images/blog/bedroom-additions.webp",
    alt: "Bedroom with large windows, a wood floor, a neutral rug and a white bed",
    topicTags: ["addition","bedroom","boise"],
    source: "blog",
  },
  "second-story-additions": {
    hero: "/images/blog/second-story-additions.webp",
    alt: "Two-story house with lap siding above a brick lower level and an attached garage",
    topicTags: ["addition","second-story","boise"],
    source: "blog",
  },
  "garage-conversions": {
    hero: "/images/blog/garage-conversions.webp",
    alt: "Bonus room with wood-look flooring, a sofa, desk and broad window",
    topicTags: ["addition","garage-conversion","boise"],
    source: "blog",
  },
  "adu-guide-boise": {
    hero: "/images/city-service/adu__boise.webp",
    alt: "Small cottage with lap siding and a separate entry beside a larger house",
    topicTags: ["adu","addition","boise"],
    source: "city-service",
  },
  "multigenerational-living-remodels": {
    hero: "/images/blog/multigenerational-living-remodels.webp",
    alt: "Sitting area beside a compact kitchenette with wood cabinets and light counters",
    topicTags: ["adu","addition","multigenerational","boise"],
    source: "blog",
  },
  "home-addition-timeline-guide": {
    hero: "/images/blog/home-addition-timeline-guide.webp",
    alt: "Wood-framed addition with roof trusses, exposed foundation and safety fencing",
    topicTags: ["addition","timeline","boise"],
    source: "blog",
  },
  "room-addition-guide-treasure-valley": {
    hero: "/images/gallery/gallery-addition-after.webp",
    alt: "Single-story house with grey lap siding, a sliding glass door and a new concrete patio",
    topicTags: ["addition","treasure-valley"],
    source: "gallery",
  },
  "remodeling-vs-moving": {
    hero: "/images/blog/remodeling-vs-moving.webp",
    alt: "Two-story house with green lap siding, an attached garage and a front lawn",
    topicTags: ["whole-home","planning","boise"],
    source: "blog",
  },
  "whole-home-remodel-timeline": {
    hero: "/images/blog/whole-home-rough-in.webp",
    alt: "Room with exposed wall studs, visible wiring, floor protection and a stepladder",
    topicTags: ["whole-home","timeline","boise"],
    source: "blog",
  },
  "living-through-a-remodel": {
    hero: "/images/blog/living-through-a-remodel.webp",
    alt: "Plastic dust barrier between exposed framing and a living area with covered furniture",
    topicTags: ["whole-home","living-in-place","boise"],
    source: "blog",
  },
  "remodel-planning-guide": {
    hero: "/images/city-service/whole-home-remodel__middleton.webp",
    alt: "Open living, dining and kitchen area with wood floors and large black-framed windows",
    topicTags: ["whole-home","planning","middleton"],
    source: "city-service",
  },
  "remodeling-mistakes-to-avoid": {
    hero: "/images/blog/remodeling-mistakes-to-avoid.webp",
    alt: "Living area with a sectional sofa, wood table and a view toward a dining space",
    topicTags: ["whole-home","planning","boise"],
    source: "blog",
  },
  "design-build-process-guide": {
    hero: "/images/blog/design-build-process-guide.webp",
    alt: "Open living room and kitchen with wood flooring and coordinated cabinetry",
    topicTags: ["whole-home","design-build"],
    source: "blog",
  },
  "whole-home-remodel-planning-checklist": {
    hero: "/images/blog/whole-home-remodel-planning-checklist.webp",
    alt: "Printed floor plan, tape measure, notebook and material samples on a wood table",
    topicTags: ["whole-home","planning","boise"],
    source: "blog",
  },
  "questions-to-ask-remodeling-contractor": {
    hero: "/images/blog/questions-to-ask-remodeling-contractor.webp",
    alt: "Entryway with a built-in wood bench, coat hooks and patterned tile flooring",
    topicTags: ["contractor","consultation"],
    source: "blog",
  },
  "remodeling-contractor-red-flags": {
    hero: "/images/blog/remodeling-contractor-red-flags.webp",
    alt: "Room with exposed framing, floor protection, a workbench and a portable work light",
    topicTags: ["contractor","quality"],
    source: "blog",
  },
  "design-build-vs-general-contractor": {
    hero: "/images/blog/design-build-vs-general-contractor.webp",
    alt: "Breakfast nook with a round wood table, built-in banquette and window",
    topicTags: ["contractor","design-build"],
    source: "blog",
  },
  "fixed-price-vs-cost-plus": {
    hero: "/images/blog/fixed-price-vs-cost-plus.webp",
    alt: "Pantry with blue cabinetry, glass-front cupboards and a stone counter",
    topicTags: ["contractor","pricing"],
    source: "blog",
  },
  "how-to-compare-remodeling-estimates": {
    hero: "/images/blog/how-to-compare-remodeling-estimates.webp",
    alt: "White kitchen with wood counters, open shelving and a pull-out pantry",
    topicTags: ["contractor","estimates"],
    source: "blog",
  },
  "why-remodeling-bids-vary": {
    hero: "/images/blog/why-remodeling-bids-vary.webp",
    alt: "Dining room with paneled walls, a coffered ceiling and a hanging light fixture",
    topicTags: ["contractor","pricing"],
    source: "blog",
  },
  "what-makes-great-remodeling-contractor": {
    hero: "/images/blog/kitchen-roi-remodeling.webp",
    alt: "Kitchen with wood cabinetry, a long white island and black counter stools",
    topicTags: ["contractor","craftsmanship"],
    source: "blog",
  },
  "consultation-process-remodeling": {
    hero: "/images/blog/consultation-process-remodeling.webp",
    alt: "Printed plans, finish samples, a laptop and mugs on a kitchen table",
    topicTags: ["process","consultation","boise"],
    source: "blog",
  },
  "how-to-choose-design-build-contractor": {
    hero: "/images/city-service/room-addition__kuna.webp",
    alt: "Single-story house with grey lap siding, a sliding glass door and a new concrete patio",
    topicTags: ["contractor","design-build","boise"],
    source: "city-service",
  },
  "remodeling-timeline-guide": {
    hero: "/images/city-service/room-addition__middleton.webp",
    alt: "Single-story house with grey lap siding, a sliding glass door and a new concrete patio",
    topicTags: ["process","timeline"],
    source: "city-service",
  },
  "boise-permit-guide": {
    hero: "/images/blog/boise-permit-guide.webp",
    alt: "Floor plans, rolled drawings, a pencil and a small wood house model on a table",
    topicTags: ["process","permits","boise"],
    source: "blog",
  },
  "preconstruction-guide": {
    hero: "/images/gallery/gallery-kitchen-before.webp",
    alt: "Kitchen with oak cabinets, laminate counters, white appliances and a window above the sink",
    topicTags: ["process","preconstruction"],
    source: "gallery",
  },
  "design-development-guide": {
    hero: "/images/gallery/gallery-bathroom-before.webp",
    alt: "Bathroom with a wood vanity, framed mirror and sliding shower enclosure",
    topicTags: ["process","design"],
    source: "gallery",
  },
  "material-selection-guide": {
    hero: "/images/blog/material-selection-guide.webp",
    alt: "Tile, countertop, wood flooring, cabinet-door and brass hardware samples",
    topicTags: ["process","materials","boise"],
    source: "blog",
  },
  "construction-phase-guide": {
    hero: "/images/city-service/room-addition__caldwell.webp",
    alt: "Single-story house with grey lap siding, a sliding glass door and a new concrete patio",
    topicTags: ["process","construction"],
    source: "city-service",
  },
  "punch-list-guide": {
    hero: "/images/blog/punch-list-guide.webp",
    alt: "Kitchen with pale wood cabinets, an island and a clipboard on the counter",
    topicTags: ["process","punch-list"],
    source: "blog",
  },
  "warranty-guide-remodeling": {
    hero: "/images/gallery/gallery-basement-after.webp",
    alt: "Finished basement room with a grey sectional sofa, plank flooring and a carpeted stair",
    topicTags: ["process","warranty"],
    source: "gallery",
  },
  "ada-vs-canyon-county-permit-timelines": {
    hero: "/images/blog/ada-vs-canyon-county-permit-timelines.webp",
    alt: "Rolled drawings, a tape measure and a clipboard on a table in front of a gray house",
    topicTags: ["process","permits","ada-county","canyon-county"],
    source: "blog",
  },
  "addition-roi-remodeling": {
    hero: "/images/city-service/room-addition__star.webp",
    alt: "Single-story house with grey lap siding, a sliding glass door and a new concrete patio",
    topicTags: ["roi","addition","star"],
    source: "city-service",
  },
  "outdoor-living-roi": {
    hero: "/images/blog/outdoor-living-roi.webp",
    alt: "Paved patio with a fire bowl, outdoor chairs and landscaped planting beds",
    topicTags: ["roi","outdoor"],
    source: "blog",
  },
  "exterior-remodeling-roi": {
    hero: "/images/blog/exterior-remodeling-roi.webp",
    alt: "House exterior with a glass-paneled garage door, pale siding and landscaped entry path",
    topicTags: ["exterior","roi","boise"],
    source: "blog",
  },
  "energy-efficiency-roi": {
    hero: "/images/blog/energy-efficiency-roi.webp",
    alt: "Exposed wall framing with insulation and wiring beside an attic with loose-fill insulation",
    topicTags: ["energy","roi","boise"],
    source: "blog",
  },
  "remodeling-before-selling": {
    hero: "/images/city-service/bathroom-remodel__star.webp",
    alt: "Bathroom with a white vanity, a brass-framed mirror and a glass walk-in shower with white tile",
    topicTags: ["roi","selling","bathroom"],
    source: "city-service",
  },
  "remodeling-long-term-living": {
    hero: "/images/city-service/adu__caldwell.webp",
    alt: "Small cottage with lap siding and a separate entry beside a larger house",
    topicTags: ["roi","long-term","caldwell"],
    source: "city-service",
  },
  "outdoor-kitchens-boise": {
    hero: "/images/blog/outdoor-kitchens-boise.webp",
    alt: "Outdoor kitchen with a built-in grill, a sink and a concrete counter under a wood patio roof",
    topicTags: ["outdoor","kitchen","boise"],
    source: "blog",
  },
  "covered-patios-boise": {
    hero: "/images/blog/covered-patios-boise.webp",
    alt: "Covered patio with a wood ceiling, ceiling fan, outdoor seating and a grill",
    topicTags: ["outdoor","patio","boise"],
    source: "blog",
  },
  "decks-vs-patios-boise": {
    hero: "/images/gallery/gallery-outdoor-before.webp",
    alt: "Backyard lawn beside a house with pale siding and a sliding glass door",
    topicTags: ["outdoor","deck","patio"],
    source: "gallery",
  },
  "outdoor-fireplaces-boise": {
    hero: "/images/blog/outdoor-fireplaces-boise.webp",
    alt: "Covered patio with a plain stucco fireplace, an outdoor sofa and two chairs",
    topicTags: ["outdoor","fireplace","boise"],
    source: "blog",
  },
  "outdoor-entertaining-spaces": {
    hero: "/images/city-service/adu__eagle.webp",
    alt: "Small cottage with lap siding and a separate entry beside a larger house",
    topicTags: ["outdoor","entertaining","eagle"],
    source: "city-service",
  },
  "luxury-outdoor-living": {
    hero: "/images/city-service/adu__nampa.webp",
    alt: "Small cottage with lap siding and a separate entry beside a larger house",
    topicTags: ["outdoor","luxury","nampa"],
    source: "city-service",
  },
  "backyard-transformations-boise": {
    hero: "/images/city-service/adu__kuna.webp",
    alt: "Small cottage with lap siding and a separate entry beside a larger house",
    topicTags: ["outdoor","backyard","kuna"],
    source: "city-service",
  },
  "boise-remodeling-cost-guide": {
    hero: "/images/gallery/gallery-whole-home-after.webp",
    alt: "Open living area and kitchen with wood floors, neutral furnishings and large windows",
    topicTags: ["cost","guide","pillar"],
    source: "gallery",
  },
  "treasure-valley-remodeling-guide": {
    hero: "/images/areas/boise.webp",
    alt: "Residential street with two-story houses, young trees and a grassy hillside beyond",
    topicTags: ["location","treasure-valley","guide"],
    source: "areas",
  },
  "boise-remodeling-guide": {
    hero: "/images/blog/boise-remodeling-guide.webp",
    alt: "Residential street with two-story houses, young trees and a grassy hillside beyond",
    topicTags: ["location","boise","guide"],
    source: "blog",
    copyFrom: "/images/areas/boise.webp",
  },
  "boise-kitchen-remodeling-guide": {
    hero: "/images/services/kitchen-remodel.webp",
    alt: "White kitchen with a gray-green island, pendant lights and a broad window",
    topicTags: ["kitchen","guide","pillar"],
    source: "services",
  },
  "boise-bathroom-remodeling-guide": {
    hero: "/images/services/bathroom-remodel.webp",
    alt: "Bathroom with a white vanity, a brass-framed mirror and a glass walk-in shower with white tile",
    topicTags: ["bathroom","guide","pillar"],
    source: "services",
  },
  "boise-home-addition-guide": {
    hero: "/images/services/room-addition.webp",
    alt: "Single-story house with grey lap siding, a sliding glass door and a new concrete patio",
    topicTags: ["addition","guide","pillar"],
    source: "services",
  },
  "boise-adu-guide": {
    hero: "/images/services/adu.webp",
    alt: "Small cottage with lap siding and a separate entry beside a larger house",
    topicTags: ["adu","guide","pillar"],
    source: "services",
  },
  "whole-home-remodeling-guide": {
    hero: "/images/services/whole-home-remodel.webp",
    alt: "Open living area and kitchen with wood floors, neutral furnishings and large windows",
    topicTags: ["whole-home","guide","pillar"],
    source: "services",
  },
  "choose-remodeling-contractor-boise": {
    hero: "/images/blog/choose-remodeling-contractor-boise.webp",
    alt: "Floor plans, paint chips, tile and flooring samples arranged on a table",
    topicTags: ["contractor","guide","pillar"],
    source: "blog",
    copyFrom: "/images/process-design-review.webp",
  },
  "boise-remodeling-process-guide": {
    hero: "/images/blog/boise-remodeling-process-guide.webp",
    alt: "Living room with carpet, a fireplace and broad windows",
    topicTags: ["process","guide","pillar"],
    source: "blog",
    copyFrom: "/images/gallery/gallery-whole-home-before.webp",
  },
  "best-remodeling-roi-boise": {
    hero: "/images/blog/best-remodeling-roi-boise.webp",
    alt: "White kitchen with an island, pendant lights and wood flooring",
    topicTags: ["roi","guide","pillar"],
    source: "blog",
    copyFrom: "/images/gallery/gallery-kitchen-after.webp",
  },
  "outdoor-living-remodeling-guide": {
    hero: "/images/gallery/gallery-outdoor-after.webp",
    alt: "Covered rear patio with a wood dining table, lawn and dry hills beyond",
    topicTags: ["outdoor","guide","pillar"],
    source: "gallery",
  },
  "meridian-remodeling-guide": {
    hero: "/images/areas/meridian.webp",
    alt: "Two-story white house with dark trim, an attached garage and a front lawn",
    topicTags: ["location","meridian","guide"],
    source: "areas",
  },
  "eagle-remodeling-guide": {
    hero: "/images/areas/eagle.webp",
    alt: "Single-story house with a dark metal roof, lit windows and gravel landscaping at dusk",
    topicTags: ["location","eagle","guide"],
    source: "areas",
  },
  "kuna-remodeling-guide": {
    hero: "/images/areas/kuna.webp",
    alt: "Single-story house with a dark metal roof, a wood-clad entry and mountains beyond",
    topicTags: ["location","kuna","guide"],
    source: "areas",
  },
  "star-remodeling-guide": {
    hero: "/images/areas/star.webp",
    alt: "Two-story house with dark siding and a covered patio beside a river",
    topicTags: ["location","star","guide"],
    source: "areas",
  },
  "middleton-remodeling-guide": {
    hero: "/images/areas/middleton.webp",
    alt: "Residential street of single-story houses with lawns, young trees and open fields beyond",
    topicTags: ["location","middleton","guide"],
    source: "areas",
  },
  "nampa-remodeling-guide": {
    hero: "/images/areas/nampa.webp",
    alt: "Single-story brick house with a broad lawn and mature trees",
    topicTags: ["location","nampa","guide"],
    source: "areas",
  },
  "caldwell-remodeling-guide": {
    hero: "/images/areas/caldwell.webp",
    alt: "Residential street of single-story houses with lawns and mature trees",
    topicTags: ["location","caldwell","guide"],
    source: "areas",
  },
  "north-end-remodeling-guide": {
    hero: "/images/blog/north-end-remodeling-guide.webp",
    alt: "Small white cottage with a steep gable roof, a wood front door and mature trees",
    topicTags: ["location","north-end","neighborhood","guide"],
    source: "blog",
  },
  "boise-bench-remodeling-guide": {
    hero: "/images/blog/boise-bench-remodeling-guide.webp",
    alt: "Single-story ranch house with a lawn, shrubs and mature trees",
    topicTags: ["location","bench","neighborhood","guide"],
    source: "blog",
  },
  "harris-ranch-remodeling-guide": {
    hero: "/images/blog/harris-ranch-remodeling-guide.webp",
    alt: "Row of two-story houses with lap siding along a street below dry hills",
    topicTags: ["location","harris-ranch","neighborhood","guide"],
    source: "blog",
  },
  "east-boise-remodeling-guide": {
    hero: "/images/blog/east-boise-remodeling-guide.webp",
    alt: "Single-story houses along a residential street with dry hills beyond",
    topicTags: ["location","east-boise","neighborhood","guide"],
    source: "blog",
  },
  "hidden-springs-remodeling-guide": {
    hero: "/images/blog/hidden-springs-remodeling-guide.webp",
    alt: "White and gray two-story houses with front porches below green hills",
    topicTags: ["location","hidden-springs","neighborhood","guide"],
    source: "blog",
  },
  "eagle-foothills-remodeling-guide": {
    hero: "/images/blog/eagle-foothills-remodeling-guide.webp",
    alt: "Single-story house with a dark metal roof, lit windows and gravel landscaping at dusk",
    topicTags: ["location","eagle-foothills","neighborhood","guide"],
    source: "blog",
    copyFrom: "/images/areas/eagle.webp",
  },
};

const HUB_HEROES = {
  "remodeling-costs": "/images/gallery/gallery-whole-home-after.webp",
  "kitchen-remodeling": "/images/services/kitchen-remodel.webp",
  "bathroom-remodeling": "/images/services/bathroom-remodel.webp",
  "home-additions": "/images/services/room-addition.webp",
  "whole-home-remodeling": "/images/services/whole-home-remodel.webp",
  "contractor-selection": "/images/blog/choose-remodeling-contractor-boise.webp",
  "remodeling-process": "/images/blog/boise-remodeling-process-guide.webp",
  "remodeling-roi": "/images/blog/best-remodeling-roi-boise.webp",
  "outdoor-living": "/images/gallery/gallery-outdoor-before.webp",
  "treasure-valley-locations": "/images/areas/boise.webp"
};

// Derive blog slugs from entries before the guides section (first guide key)
const GUIDE_START = "boise-remodeling-cost-guide";
const blogSlugsFromEntries = Object.keys(ENTRIES).slice(0, Object.keys(ENTRIES).indexOf(GUIDE_START));
if (blogSlugsFromEntries.length !== 75) {
  console.error(`Expected 75 retained article mappings before guides, got ${blogSlugsFromEntries.length}`);
  process.exit(1);
}
const BLOG_POST_SLUGS = new Set(blogSlugsFromEntries);

function effectiveImage(entry) {
  return entry.copyFrom ?? entry.hero;
}

// Validate blog post effective-image uniqueness (visual source paths)
const blogEffectivePaths = new Map();
for (const slug of BLOG_POST_SLUGS) {
  const entry = ENTRIES[slug];
  const eff = effectiveImage(entry);
  if (blogEffectivePaths.has(eff)) {
    console.error(
      `Duplicate effective image for blog posts: ${eff} used by ${blogEffectivePaths.get(eff)} and ${slug}`,
    );
    process.exit(1);
  }
  blogEffectivePaths.set(eff, slug);
}

// Validate uniqueness
const heroPaths = new Map();
for (const [slug, entry] of Object.entries(ENTRIES)) {
  if (heroPaths.has(entry.hero)) {
    console.error(`Duplicate hero: ${entry.hero} used by ${heroPaths.get(entry.hero)} and ${slug}`);
    process.exit(1);
  }
  heroPaths.set(entry.hero, slug);
}

// Validate count
const expectedBlog = 75;
const expectedGuides = 25;
const blogSlugs = Object.keys(ENTRIES).filter((s) => !s.includes("-guide") || ENTRIES[s].topicTags.includes("guide") === false);
// Just check total
if (Object.keys(ENTRIES).length !== expectedBlog + expectedGuides) {
  console.error(`Expected ${expectedBlog + expectedGuides} entries, got ${Object.keys(ENTRIES).length}`);
  process.exit(1);
}

// Generate TS file
const registryBody = Object.entries(ENTRIES)
  .map(([slug, e]) => {
    const thumb = e.thumbnail ? `\n    thumbnail: '${e.thumbnail}',` : "";
    return `  '${slug}': {
    hero: '${e.hero}',${thumb}
    alt: '${e.alt.replace(/'/g, "\\'")}',
    topicTags: ${JSON.stringify(e.topicTags)},
    source: '${e.source}',
  },`;
  })
  .join("\n");

const hubBody = Object.entries(HUB_HEROES)
  .map(([hub, hero]) => `  '${hub}': '${hero}',`)
  .join("\n");

const ts = `/**
 * Per-slug blog and guide imagery - single source of truth.
 * Generated by scripts/generate-blog-image-registry.mjs - do not hand-edit entries.
 * Re-run the generator after changing slug mappings, then npm run images:blog.
 */

export type BlogImageSource = 'blog' | 'gallery' | 'city-service' | 'areas' | 'services';

export interface BlogImageEntry {
  hero: string;
  thumbnail?: string;
  alt: string;
  topicTags: string[];
  source: BlogImageSource;
}

export const BLOG_IMAGE_REGISTRY: Record<string, BlogImageEntry> = {
${registryBody}
};

export const HUB_HERO_IMAGES: Record<string, string> = {
${hubBody}
};

/** Slugs that need files copied to public/images/blog/ (see scripts/setup-blog-images.mjs) */
export const BLOG_ASSET_COPY_MAP: Record<string, string> = {
${Object.entries(ENTRIES)
  .filter(([, e]) => e.copyFrom)
  .map(([slug, e]) => `  '${slug}': '${e.copyFrom}',`)
  .join("\n")}
};
`;

const outputPath = path.join(root, "shared", "blogImageRegistry.ts");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(outputPath, "utf8") !== ts) {
    console.error("blogImageRegistry.ts differs from its authoring generator");
    process.exit(1);
  }
  console.log(`Verified blogImageRegistry.ts parity with ${Object.keys(ENTRIES).length} entries`);
} else {
  fs.writeFileSync(outputPath, ts);
  console.log(`Wrote blogImageRegistry.ts with ${Object.keys(ENTRIES).length} entries`);
}
