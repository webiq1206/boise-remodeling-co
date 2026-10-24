/**
 * Generates shared/blogImageRegistry.ts with unique hero paths for every blog post and guide.
 * Run: node scripts/generate-blog-image-registry.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const cs = (service, city) => `/images/city-service/${service}__${city}.png`;
const gal = (name) => `/images/gallery/gallery-${name}.png`;
const area = (city) => `/images/areas/${city}.png`;
const svc = (name) => `/images/services/${name}.png`;
const blog = (slug) => `/images/blog/${slug}.png`;

/** slug -> { hero, alt, topicTags, source, copyFrom? } */
const ENTRIES = {
  // -  - Remodeling costs (8 blog) -  - 
  "kitchen-remodel-cost-boise": {
    hero: cs("kitchen-remodel", "boise"),
    alt: "Completed kitchen remodel in a Boise home with warm cabinetry and quartz counters",
    topicTags: ["kitchen", "cost", "boise"],
    source: "city-service",
  },
  "bathroom-remodel-cost-boise": {
    hero: cs("bathroom-remodel", "boise"),
    alt: "Refreshed guest bathroom in a Boise ranch with modern tile and vanity",
    topicTags: ["bathroom", "cost", "boise"],
    source: "city-service",
  },
  "whole-home-remodel-cost-boise": {
    hero: cs("whole-home-remodel", "boise"),
    alt: "Whole-home remodel interior with open living space in Boise",
    topicTags: ["whole-home", "cost", "boise"],
    source: "city-service",
  },
  "home-addition-cost-boise": {
    hero: cs("room-addition", "boise"),
    alt: "Room addition seamlessly tied into an existing Boise home exterior",
    topicTags: ["addition", "cost", "boise"],
    source: "city-service",
  },
  "luxury-remodel-cost-boise": {
    hero: cs("kitchen-remodel", "eagle"),
    alt: "Luxury kitchen remodel with premium finishes in an Eagle executive home",
    topicTags: ["luxury", "cost", "eagle"],
    source: "city-service",
  },
  "remodel-cost-per-square-foot-boise": {
    hero: cs("whole-home-remodel", "meridian"),
    alt: "Whole-home renovation showing finished living areas in a Meridian home",
    topicTags: ["cost", "whole-home", "meridian"],
    source: "city-service",
  },
  "what-impacts-remodeling-costs-boise": {
    hero: "/images/process-design-review.png",
    alt: "Design-build team reviewing remodel plans and selections with Treasure Valley homeowners",
    topicTags: ["cost", "planning", "process"],
    source: "services",
  },
  "how-to-budget-remodel-boise": {
    hero: "/images/hero-remodel-interior.png",
    alt: "Warm remodeled interior illustrating thoughtful budgeting for a Boise renovation",
    topicTags: ["cost", "budget", "planning"],
    source: "services",
  },

  // -  - Kitchen (8) -  - 
  "kitchen-remodel-timeline-boise": {
    hero: cs("kitchen-remodel", "meridian"),
    alt: "Kitchen remodel in progress with cabinetry installed in a Meridian home",
    topicTags: ["kitchen", "timeline", "meridian"],
    source: "city-service",
  },
  "kitchen-layout-ideas-boise-homes": {
    hero: cs("kitchen-remodel", "nampa"),
    alt: "Efficient kitchen layout with clear work triangle in a Nampa home",
    topicTags: ["kitchen", "layout", "nampa"],
    source: "city-service",
  },
  "kitchen-cabinet-trends": {
    hero: cs("kitchen-remodel", "kuna"),
    alt: "Modern kitchen cabinetry with warm wood tones in a Kuna home",
    topicTags: ["kitchen", "cabinets", "kuna"],
    source: "city-service",
  },
  "quartz-vs-quartzite-kitchen": {
    hero: cs("kitchen-remodel", "star"),
    alt: "Kitchen countertop detail showing quartz surfaces in a Star-area home",
    topicTags: ["kitchen", "countertops", "star"],
    source: "city-service",
  },
  "kitchen-remodel-roi": {
    hero: gal("kitchen-after"),
    alt: "Finished kitchen remodel showcasing updated cabinets, counters, and lighting",
    topicTags: ["kitchen", "roi"],
    source: "gallery",
  },
  "open-concept-kitchen-remodeling": {
    hero: blog("open-concept-kitchen-remodeling"),
    alt: "Open-concept kitchen connected to living space after wall removal in Boise",
    topicTags: ["kitchen", "open-concept"],
    source: "blog",
  },
  "kitchen-island-design-guide": {
    hero: cs("kitchen-remodel", "middleton"),
    alt: "Large kitchen island with seating in a Middleton home remodel",
    topicTags: ["kitchen", "island", "middleton"],
    source: "city-service",
  },
  "walk-in-pantry-design-guide": {
    hero: cs("kitchen-remodel", "caldwell"),
    alt: "Walk-in pantry with custom shelving in a Caldwell kitchen remodel",
    topicTags: ["kitchen", "pantry", "caldwell"],
    source: "city-service",
  },

  // -  - Bathroom (7) -  - 
  "walk-in-shower-guide": {
    hero: blog("walk-in-shower-guide"),
    alt: "Walk-in shower with glass enclosure and tile surround in a Treasure Valley bath",
    topicTags: ["bathroom", "shower"],
    source: "blog",
  },
  "curbless-shower-guide": {
    hero: blog("curbless-shower-guide"),
    alt: "Curbless shower with linear drain and accessible entry in a master bathroom",
    topicTags: ["bathroom", "shower", "accessibility"],
    source: "blog",
  },
  "luxury-bathroom-features": {
    hero: cs("bathroom-remodel", "eagle"),
    alt: "Luxury master bathroom with premium tile and fixtures in Eagle",
    topicTags: ["bathroom", "luxury", "eagle"],
    source: "city-service",
  },
  "small-bathroom-remodel-ideas": {
    hero: cs("bathroom-remodel", "meridian"),
    alt: "Compact bathroom remodel maximizing storage and light in Meridian",
    topicTags: ["bathroom", "small", "meridian"],
    source: "city-service",
  },
  "aging-in-place-bathroom-design": {
    hero: cs("bathroom-remodel", "nampa"),
    alt: "Accessible bathroom design with grab bars and curbless shower in Nampa",
    topicTags: ["bathroom", "aging-in-place", "nampa"],
    source: "city-service",
  },
  "bathroom-remodel-roi": {
    hero: gal("bathroom-after"),
    alt: "Updated bathroom with modern vanity and tile after a Treasure Valley remodel",
    topicTags: ["bathroom", "roi"],
    source: "gallery",
  },
  "bathroom-layout-planning-guide": {
    hero: cs("bathroom-remodel", "kuna"),
    alt: "Bathroom layout with optimized vanity and shower placement in Kuna",
    topicTags: ["bathroom", "layout", "kuna"],
    source: "city-service",
  },

  // -  - Additions (8) -  - 
  "primary-suite-additions": {
    hero: cs("room-addition", "eagle"),
    alt: "Primary suite addition with bedroom and bath tied to an Eagle home",
    topicTags: ["addition", "primary-suite", "eagle"],
    source: "city-service",
  },
  "bedroom-additions": {
    hero: cs("room-addition", "meridian"),
    alt: "Bedroom addition with matching roofline on a Meridian home",
    topicTags: ["addition", "bedroom", "meridian"],
    source: "city-service",
  },
  "second-story-additions": {
    hero: blog("second-story-additions"),
    alt: "Second-story addition under construction with framing on a Treasure Valley home",
    topicTags: ["addition", "second-story"],
    source: "blog",
  },
  "garage-conversions": {
    hero: blog("garage-conversions"),
    alt: "Converted garage living space with new windows and finished interior",
    topicTags: ["addition", "garage-conversion"],
    source: "blog",
  },
  "adu-guide-boise": {
    hero: cs("adu", "boise"),
    alt: "Accessory dwelling unit completed in a Boise backyard with separate entry",
    topicTags: ["adu", "addition", "boise"],
    source: "city-service",
  },
  "multigenerational-living-remodels": {
    hero: cs("adu", "meridian"),
    alt: "ADU or in-law suite supporting multigenerational living in Meridian",
    topicTags: ["adu", "addition", "multigenerational", "meridian"],
    source: "city-service",
  },
  "home-addition-timeline-guide": {
    hero: cs("room-addition", "nampa"),
    alt: "Room addition project showing exterior progress in Nampa",
    topicTags: ["addition", "timeline", "nampa"],
    source: "city-service",
  },
  "room-addition-guide-treasure-valley": {
    hero: gal("addition-after"),
    alt: "Completed room addition blending with original Treasure Valley home architecture",
    topicTags: ["addition", "treasure-valley"],
    source: "gallery",
  },

  // -  - Whole home (7) -  - 
  "remodeling-vs-moving": {
    hero: cs("whole-home-remodel", "kuna"),
    alt: "Fully remodeled living area helping homeowners stay in their Kuna neighborhood",
    topicTags: ["whole-home", "planning", "kuna"],
    source: "city-service",
  },
  "whole-home-remodel-timeline": {
    hero: "/images/blog/whole-home-rough-in.webp",
    alt: "Interior stripped to the studs with new wiring and floor protection during a whole-home renovation",
    topicTags: ["whole-home", "timeline", "boise"],
    source: "blog",
  },
  "living-through-a-remodel": {
    hero: gal("whole-home-before"),
    alt: "Home interior during whole-home remodel with protected pathways and dust control",
    topicTags: ["whole-home", "living-in-place"],
    source: "gallery",
  },
  "remodel-planning-guide": {
    hero: cs("whole-home-remodel", "middleton"),
    alt: "Remodel planning session in a Middleton home with design selections underway",
    topicTags: ["whole-home", "planning", "middleton"],
    source: "city-service",
  },
  "remodeling-mistakes-to-avoid": {
    hero: cs("whole-home-remodel", "caldwell"),
    alt: "Quality whole-home finish work illustrating proper planning in Caldwell",
    topicTags: ["whole-home", "planning", "caldwell"],
    source: "city-service",
  },
  "design-build-process-guide": {
    hero: blog("design-build-process-guide"),
    alt: "Completed whole-home remodel showcasing cohesive design-build results",
    topicTags: ["whole-home", "design-build"],
    source: "blog",
  },
  "whole-home-remodel-planning-checklist": {
    hero: cs("whole-home-remodel", "eagle"),
    alt: "Eagle whole-home renovation with updated kitchen and living spaces",
    topicTags: ["whole-home", "checklist", "eagle"],
    source: "city-service",
  },

  // -  - Contractor selection (9) -  - 
  "questions-to-ask-remodeling-contractor": {
    hero: blog("questions-to-ask-remodeling-contractor"),
    alt: "Homeowner meeting with remodeling contractor reviewing project scope in Boise",
    topicTags: ["contractor", "consultation"],
    source: "blog",
  },
  "remodeling-contractor-red-flags": {
    hero: blog("remodeling-contractor-red-flags"),
    alt: "Professional remodel craftsmanship detail showing quality tile and trim work",
    topicTags: ["contractor", "quality"],
    source: "blog",
  },
  "design-build-vs-general-contractor": {
    hero: blog("design-build-vs-general-contractor"),
    alt: "Design-build team collaborating on plans in a Treasure Valley home",
    topicTags: ["contractor", "design-build"],
    source: "blog",
  },
  "fixed-price-vs-cost-plus": {
    hero: gal("basement-before"),
    alt: "Remodel scope documents and pricing notes laid out for a fixed-price versus cost-plus comparison",
    topicTags: ["contractor", "pricing"],
    source: "gallery",
  },
  "how-to-compare-remodeling-estimates": {
    hero: blog("how-to-compare-remodeling-estimates"),
    alt: "Side-by-side remodel scope comparison for kitchen and bath projects",
    topicTags: ["contractor", "estimates"],
    source: "blog",
  },
  "why-remodeling-bids-vary": {
    hero: cs("bathroom-remodel", "middleton"),
    alt: "Finished bathroom remodel illustrating scope differences in contractor bids",
    topicTags: ["contractor", "pricing"],
    source: "city-service",
  },
  "what-makes-great-remodeling-contractor": {
    hero: svc("adu"),
    alt: "Precision craftsmanship on a custom ADU build demonstrating expert Treasure Valley work",
    topicTags: ["contractor", "craftsmanship"],
    source: "services",
  },
  "consultation-process-remodeling": {
    hero: cs("adu", "star"),
    alt: "In-home remodeling consultation with homeowners at a Star-area property",
    topicTags: ["contractor", "consultation"],
    source: "city-service",
  },
  "how-to-choose-design-build-contractor": {
    hero: cs("room-addition", "kuna"),
    alt: "Design-build remodeling team walking a room addition job site with Treasure Valley homeowners",
    topicTags: ["contractor", "design-build", "boise"],
    source: "city-service",
  },

  // -  - Remodeling process (9) -  - 
  "remodeling-timeline-guide": {
    hero: cs("room-addition", "middleton"),
    alt: "Remodel project timeline phases from design through construction completion in Middleton",
    topicTags: ["process", "timeline"],
    source: "city-service",
  },
  "boise-permit-guide": {
    hero: blog("boise-permit-guide"),
    alt: "Residential remodel plans prepared for Ada County permit submission",
    topicTags: ["process", "permits", "boise"],
    source: "blog",
  },
  "preconstruction-guide": {
    hero: gal("kitchen-before"),
    alt: "Preconstruction planning with material samples and floor plans before demo begins",
    topicTags: ["process", "preconstruction"],
    source: "gallery",
  },
  "design-development-guide": {
    hero: gal("bathroom-before"),
    alt: "Design development selections for bathroom tile, fixtures, and finishes",
    topicTags: ["process", "design"],
    source: "gallery",
  },
  "material-selection-guide": {
    hero: blog("material-selection-guide"),
    alt: "Remodel material selections including tile, counters, and hardware samples",
    topicTags: ["process", "materials"],
    source: "blog",
  },
  "construction-phase-guide": {
    hero: cs("room-addition", "caldwell"),
    alt: "Active construction phase with framing and mechanical rough-in on a Caldwell room addition",
    topicTags: ["process", "construction"],
    source: "city-service",
  },
  "punch-list-guide": {
    hero: blog("punch-list-guide"),
    alt: "Final walkthrough punch list review in a nearly completed remodel",
    topicTags: ["process", "punch-list"],
    source: "blog",
  },
  "warranty-guide-remodeling": {
    hero: gal("basement-after"),
    alt: "Completed basement finish detail showing warranty-worthy craftsmanship",
    topicTags: ["process", "warranty"],
    source: "gallery",
  },
  "ada-vs-canyon-county-permit-timelines": {
    hero: blog("ada-vs-canyon-county-permit-timelines"),
    alt: "Treasure Valley home remodel subject to Ada or Canyon County permit review",
    topicTags: ["process", "permits", "ada-county", "canyon-county"],
    source: "blog",
  },

  // -  - ROI -  - 
  // kitchen-roi-remodeling / bathroom-roi-remodeling consolidated (301) into
  // kitchen-remodel-roi / bathroom-remodel-roi.
  "addition-roi-remodeling": {
    hero: cs("room-addition", "star"),
    alt: "Room addition increasing livable square footage and home value in Star",
    topicTags: ["roi", "addition", "star"],
    source: "city-service",
  },
  "outdoor-living-roi": {
    hero: blog("outdoor-living-roi"),
    alt: "Outdoor living space with patio and landscaping boosting curb appeal",
    topicTags: ["roi", "outdoor"],
    source: "blog",
  },
  "exterior-remodeling-roi": {
    hero: cs("adu", "middleton"),
    alt: "Updated Middleton home exterior improving curb appeal and resale value",
    topicTags: ["roi", "exterior", "middleton"],
    source: "city-service",
  },
  "energy-efficiency-roi": {
    hero: cs("whole-home-remodel", "nampa"),
    alt: "Whole-home upgrade with efficient windows and insulation in Nampa",
    topicTags: ["roi", "energy-efficiency", "nampa"],
    source: "city-service",
  },
  "remodeling-before-selling": {
    hero: cs("bathroom-remodel", "star"),
    alt: "Updated bathroom and finishes staged before listing a Treasure Valley home for sale",
    topicTags: ["roi", "selling", "bathroom"],
    source: "city-service",
  },
  "remodeling-long-term-living": {
    hero: cs("adu", "caldwell"),
    alt: "ADU and whole-home updates tailored for long-term multigenerational living in Caldwell",
    topicTags: ["roi", "long-term", "caldwell"],
    source: "city-service",
  },

  // -  - Outdoor (7) -  - 
  "outdoor-kitchens-boise": {
    hero: blog("outdoor-kitchens-boise"),
    alt: "Outdoor kitchen with built-in grill and counter space in a Boise backyard",
    topicTags: ["outdoor", "kitchen", "boise"],
    source: "blog",
  },
  "covered-patios-boise": {
    hero: blog("covered-patios-boise"),
    alt: "Covered patio with ceiling fans and comfortable seating in the Treasure Valley",
    topicTags: ["outdoor", "patio", "boise"],
    source: "blog",
  },
  "decks-vs-patios-boise": {
    hero: gal("outdoor-before"),
    alt: "Backyard deck and patio options for Boise outdoor living",
    topicTags: ["outdoor", "deck", "patio"],
    source: "gallery",
  },
  "outdoor-fireplaces-boise": {
    hero: blog("outdoor-fireplaces-boise"),
    alt: "Outdoor fireplace on a covered patio for year-round Treasure Valley entertaining",
    topicTags: ["outdoor", "fireplace", "boise"],
    source: "blog",
  },
  "outdoor-entertaining-spaces": {
    hero: cs("adu", "eagle"),
    alt: "Outdoor entertaining area adjacent to an Eagle home with seating and shade",
    topicTags: ["outdoor", "entertaining", "eagle"],
    source: "city-service",
  },
  "luxury-outdoor-living": {
    hero: cs("adu", "nampa"),
    alt: "Luxury outdoor living space with premium finishes in the Treasure Valley",
    topicTags: ["outdoor", "luxury", "nampa"],
    source: "city-service",
  },
  "backyard-transformations-boise": {
    hero: cs("adu", "kuna"),
    alt: "Transformed backyard with hardscape and plantings in Kuna",
    topicTags: ["outdoor", "backyard", "kuna"],
    source: "city-service",
  },

  // -  - Guides (23) -  - 
  "boise-remodeling-cost-guide": {
    hero: gal("whole-home-after"),
    alt: "Treasure Valley remodel cost planning guide featuring whole-home renovation context",
    topicTags: ["cost", "guide", "pillar"],
    source: "gallery",
  },
  "treasure-valley-remodeling-guide": {
    hero: area("boise"),
    alt: "Treasure Valley neighborhoods and homes served by Boise Remodeling Co",
    topicTags: ["location", "treasure-valley", "guide"],
    source: "areas",
  },
  "boise-remodeling-guide": {
    hero: blog("boise-remodeling-guide"),
    alt: "Boise homes and neighborhoods for remodeling projects across the North End and Bench",
    topicTags: ["location", "boise", "guide"],
    source: "blog",
    copyFrom: area("boise"),
  },
  "boise-kitchen-remodeling-guide": {
    hero: svc("kitchen-remodel"),
    alt: "Complete Boise kitchen remodeling guide with layouts, materials, and timelines",
    topicTags: ["kitchen", "guide", "pillar"],
    source: "services",
  },
  "boise-bathroom-remodeling-guide": {
    hero: svc("bathroom-remodel"),
    alt: "Boise bathroom remodeling guide covering showers, layouts, and aging-in-place",
    topicTags: ["bathroom", "guide", "pillar"],
    source: "services",
  },
  "boise-home-addition-guide": {
    hero: svc("room-addition"),
    alt: "Boise home addition guide for second stories, suites, and ADUs",
    topicTags: ["addition", "guide", "pillar"],
    source: "services",
  },
  "whole-home-remodeling-guide": {
    hero: svc("whole-home-remodel"),
    alt: "Whole home remodeling guide for Treasure Valley homeowners",
    topicTags: ["whole-home", "guide", "pillar"],
    source: "services",
  },
  "choose-remodeling-contractor-boise": {
    hero: blog("choose-remodeling-contractor-boise"),
    alt: "Choosing a trusted remodeling contractor in Boise and the Treasure Valley",
    topicTags: ["contractor", "guide", "pillar"],
    source: "blog",
    copyFrom: "/images/process-design-review.png",
  },
  "boise-remodeling-process-guide": {
    hero: blog("boise-remodeling-process-guide"),
    alt: "Boise remodeling process from consultation through warranty walkthrough",
    topicTags: ["process", "guide", "pillar"],
    source: "blog",
    copyFrom: gal("whole-home-before"),
  },
  "best-remodeling-roi-boise": {
    hero: blog("best-remodeling-roi-boise"),
    alt: "Best remodeling projects for ROI in Boise homes",
    topicTags: ["roi", "guide", "pillar"],
    source: "blog",
    copyFrom: gal("kitchen-after"),
  },
  "outdoor-living-remodeling-guide": {
    hero: gal("outdoor-after"),
    alt: "Outdoor living remodeling guide for patios, kitchens, and backyards in Boise",
    topicTags: ["outdoor", "guide", "pillar"],
    source: "gallery",
  },
  "meridian-remodeling-guide": {
    hero: area("meridian"),
    alt: "Meridian subdivision homes and remodeling context in Ada County",
    topicTags: ["location", "meridian", "guide"],
    source: "areas",
  },
  "eagle-remodeling-guide": {
    hero: area("eagle"),
    alt: "Eagle executive homes and remodeling opportunities in the Foothills",
    topicTags: ["location", "eagle", "guide"],
    source: "areas",
  },
  "kuna-remodeling-guide": {
    hero: area("kuna"),
    alt: "Kuna family homes and newer construction suited for remodeling",
    topicTags: ["location", "kuna", "guide"],
    source: "areas",
  },
  "star-remodeling-guide": {
    hero: area("star"),
    alt: "Star-area homes and rural-suburban remodeling in Ada County",
    topicTags: ["location", "star", "guide"],
    source: "areas",
  },
  "middleton-remodeling-guide": {
    hero: area("middleton"),
    alt: "Middleton homes in Canyon County with remodeling and permit context",
    topicTags: ["location", "middleton", "guide"],
    source: "areas",
  },
  "nampa-remodeling-guide": {
    hero: area("nampa"),
    alt: "Nampa homes and Canyon County remodeling considerations",
    topicTags: ["location", "nampa", "guide"],
    source: "areas",
  },
  "caldwell-remodeling-guide": {
    hero: area("caldwell"),
    alt: "Caldwell homes and Canyon County remodeling context near downtown and the College of Idaho",
    topicTags: ["location", "caldwell", "guide"],
    source: "areas",
  },
  "north-end-remodeling-guide": {
    hero: blog("north-end-remodeling-guide"),
    alt: "Historic North End craftsman bungalows and period-appropriate remodels in Boise",
    topicTags: ["location", "north-end", "neighborhood", "guide"],
    source: "blog",
    copyFrom: area("boise"),
  },
  "boise-bench-remodeling-guide": {
    hero: blog("boise-bench-remodeling-guide"),
    alt: "Mid-century ranch homes on the Boise Bench suited for kitchen and bath updates",
    topicTags: ["location", "bench", "neighborhood", "guide"],
    source: "blog",
    copyFrom: cs("whole-home-remodel", "boise"),
  },
  "harris-ranch-remodeling-guide": {
    hero: blog("harris-ranch-remodeling-guide"),
    alt: "Harris Ranch planned community homes in Southeast Boise",
    topicTags: ["location", "harris-ranch", "neighborhood", "guide"],
    source: "blog",
    copyFrom: cs("kitchen-remodel", "boise"),
  },
  "east-boise-remodeling-guide": {
    hero: blog("east-boise-remodeling-guide"),
    alt: "East Boise neighborhoods with varied housing stock for remodeling",
    topicTags: ["location", "east-boise", "neighborhood", "guide"],
    source: "blog",
    copyFrom: cs("bathroom-remodel", "boise"),
  },
  "hidden-springs-remodeling-guide": {
    hero: blog("hidden-springs-remodeling-guide"),
    alt: "Hidden Springs community homes in the Boise foothills",
    topicTags: ["location", "hidden-springs", "neighborhood", "guide"],
    source: "blog",
    copyFrom: cs("whole-home-remodel", "boise"),
  },
  "eagle-foothills-remodeling-guide": {
    hero: blog("eagle-foothills-remodeling-guide"),
    alt: "Eagle Foothills custom homes with mountain views and premium remodel potential",
    topicTags: ["location", "eagle-foothills", "neighborhood", "guide"],
    source: "blog",
    copyFrom: area("eagle"),
  },
};

const HUB_HEROES = {
  "remodeling-costs": gal("whole-home-after"),
  "kitchen-remodeling": svc("kitchen-remodel"),
  "bathroom-remodeling": svc("bathroom-remodel"),
  "home-additions": svc("room-addition"),
  "whole-home-remodeling": svc("whole-home-remodel"),
  "contractor-selection": blog("choose-remodeling-contractor-boise"),
  "remodeling-process": blog("boise-remodeling-process-guide"),
  "remodeling-roi": blog("best-remodeling-roi-boise"),
  "outdoor-living": gal("outdoor-before"),
  "treasure-valley-locations": area("boise"),
};

// Derive blog slugs from entries before the guides section (first guide key)
const GUIDE_START = "boise-remodeling-cost-guide";
const blogSlugsFromEntries = Object.keys(ENTRIES).slice(0, Object.keys(ENTRIES).indexOf(GUIDE_START));
if (blogSlugsFromEntries.length !== 71) {
  console.error(`Expected 71 blog slugs before guides, got ${blogSlugsFromEntries.length}`);
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
const expectedBlog = 71;
const expectedGuides = 24;
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

fs.writeFileSync(path.join(root, "shared", "blogImageRegistry.ts"), ts);
console.log(`Wrote blogImageRegistry.ts with ${Object.keys(ENTRIES).length} entries`);
