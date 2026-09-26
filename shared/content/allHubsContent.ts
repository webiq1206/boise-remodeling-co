/**
 * Generated hub content for hubs 2–10 (hub 1 + legacy in other files).
 */
import { buildClusterPost, buildPillarGuide, buildLocationGuide } from './contentFactory';
import type { BlogPostData } from '../blogContent';
import type { GuidePageData } from '../guideContent';
import { KITCHEN_GUIDE_CONTENT, KITCHEN_GUIDE_FAQS } from './guides/kitchen-guide-content';
import { BATHROOM_GUIDE_CONTENT, BATHROOM_GUIDE_FAQS } from './guides/bathroom-guide-content';
import { ADDITION_GUIDE_CONTENT, ADDITION_GUIDE_FAQS } from './guides/addition-guide-content';
import { WHOLE_HOME_GUIDE_CONTENT, WHOLE_HOME_GUIDE_FAQS } from './guides/whole-home-guide-content';
import { CONTRACTOR_GUIDE_CONTENT, CONTRACTOR_GUIDE_FAQS } from './guides/contractor-guide-content';
import { PROCESS_GUIDE_CONTENT, PROCESS_GUIDE_FAQS } from './guides/process-guide-content';
import { ROI_GUIDE_CONTENT, ROI_GUIDE_FAQS } from './guides/roi-guide-content';
import { OUTDOOR_GUIDE_CONTENT, OUTDOOR_GUIDE_FAQS } from './guides/outdoor-guide-content';

const k = '/services/kitchen-remodel';
const kb = '/services/kitchen-remodel/boise';
const b = '/services/bathroom-remodel';
const bb = '/services/bathroom-remodel/boise';
const w = '/services/whole-home-remodel';
const wb = '/services/whole-home-remodel/boise';
const a = '/services/room-addition';
const ab = '/services/room-addition/boise';
const adu = '/services/adu';

// -  - Hub 2 Kitchen -  - 
export const KITCHEN_PILLAR = buildPillarGuide({
  slug: 'boise-kitchen-remodeling-guide',
  title: 'Boise Kitchen Remodeling Guide',
  seoTitle: 'Boise Kitchen Remodeling Guide | Treasure Valley',
  metaDescription:
    'Definitive kitchen remodeling guide for Boise and the Treasure Valley: layouts, timelines, cabinets, ROI, and design-build planning.',
  excerpt: 'Plan a kitchen remodel in Boise, Meridian, or Eagle with layouts, timelines, materials, and local permit context.',
  hubSlug: 'kitchen-remodeling',
  tags: ['kitchen', 'boise', 'design'],
  quickAnswer:
    'Treasure Valley kitchen remodels typically run 8–16 weeks of construction after design and permits, with budgets often from $45,000 to $120,000+ for full gut renovations with layout changes.',
  takeaways: [
    'Lock layout and MEP before finish selections.',
    'Cabinet lead times can drive the calendar - order at design lock.',
    'Open concept work may require structural beams and Ada County review.',
    'Appliances are usually client-supplied; plan rough-in early.',
  ],
  linkedClusterSlugs: [
    'kitchen-remodel-timeline-boise',
    'kitchen-layout-ideas-boise-homes',
    'kitchen-cabinet-trends',
    'quartz-vs-quartzite-kitchen',
    'kitchen-remodel-roi',
    'open-concept-kitchen-remodeling',
    'kitchen-island-design-guide',
    'walk-in-pantry-design-guide',
  ],
  linkedServices: ['kitchen-remodel'],
  content: KITCHEN_GUIDE_CONTENT,
  faqs: KITCHEN_GUIDE_FAQS,
});

const kitchenClusters = [
  ['kitchen-remodel-timeline-boise', 'Kitchen Remodel Timeline Boise', 'Typical kitchen remodel phases in Boise from design through final inspection.'],
  ['kitchen-layout-ideas-boise-homes', 'Kitchen Layout Ideas for Boise Homes', 'Layouts for ranches, split-levels, and open-concept conversions in the Treasure Valley.'],
  ['kitchen-cabinet-trends', 'Kitchen Cabinet Trends', 'Cabinet styles and storage trends popular in Meridian, Eagle, and Boise remodels.'],
  ['quartz-vs-quartzite-kitchen', 'Quartz vs Quartzite for Kitchen Countertops', 'Compare durability, maintenance, and cost for Idaho kitchens.'],
  ['kitchen-remodel-roi', 'Kitchen Remodel ROI in Boise', 'When kitchen updates return value in Treasure Valley resale markets.'],
  ['open-concept-kitchen-remodeling', 'Open Concept Kitchen Remodeling', 'Removing walls between kitchen and living space - structure, permits, and cost.'],
  ['kitchen-island-design-guide', 'Kitchen Island Design Guide', 'Sizing islands for Boise ranches and newer Meridian floor plans.'],
  ['walk-in-pantry-design-guide', 'Walk-In Pantry Design Guide', 'Pantry layouts, shelving, and traffic flow for Idaho homes.'],
] as const;

export const KITCHEN_CLUSTER_POSTS: BlogPostData[] = kitchenClusters.map(([slug, title, excerpt]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${excerpt} Serving Boise, Meridian, Eagle, Nampa, and the Treasure Valley.`,
    excerpt,
    hubSlug: 'kitchen-remodeling',
    tags: ['kitchen', 'boise'],
    quickAnswer: excerpt,
    takeaways: [excerpt, 'Work with a local design-build team for permits and trade coordination.', 'Compare planning ranges before final selections.'],
    serviceUrl: k,
    cityServiceUrl: kb,
  }),
);

// -  - Hub 3 Bathroom -  - 
export const BATHROOM_PILLAR = buildPillarGuide({
  slug: 'boise-bathroom-remodeling-guide',
  title: 'Boise Bathroom Remodeling Guide',
  seoTitle: 'Boise Bathroom Remodeling Guide',
  metaDescription:
    'Master bath and guest bath remodeling in Boise: showers, layouts, aging-in-place, ROI, permits, and realistic Treasure Valley cost ranges.',
  excerpt: 'Complete bathroom remodeling guide for Treasure Valley homeowners.',
  hubSlug: 'bathroom-remodeling',
  tags: ['bathroom', 'boise'],
  quickAnswer:
    'Guest bath remodels often plan $18,000–$45,000; master baths with curbless showers and layout changes commonly reach $35,000–$85,000+ in Ada and Canyon County.',
  takeaways: [
    'Waterproofing and slope matter for walk-in and curbless showers.',
    'Ventilation and heat should be planned with layout.',
    'Aging-in-place features can be designed without institutional aesthetics.',
  ],
  linkedClusterSlugs: [
    'walk-in-shower-guide',
    'curbless-shower-guide',
    'luxury-bathroom-features',
    'small-bathroom-remodel-ideas',
    'aging-in-place-bathroom-design',
    'bathroom-remodel-roi',
    'bathroom-layout-planning-guide',
  ],
  linkedServices: ['bathroom-remodel'],
  content: BATHROOM_GUIDE_CONTENT,
  faqs: BATHROOM_GUIDE_FAQS,
});

const bathSlugs = [
  ['walk-in-shower-guide', 'Walk-In Shower Guide'],
  ['curbless-shower-guide', 'Curbless Shower Guide'],
  ['luxury-bathroom-features', 'Luxury Bathroom Features'],
  ['small-bathroom-remodel-ideas', 'Small Bathroom Remodel Ideas'],
  ['aging-in-place-bathroom-design', 'Aging-in-Place Bathroom Design'],
  ['bathroom-remodel-roi', 'Bathroom Remodel ROI'],
  ['bathroom-layout-planning-guide', 'Bathroom Layout Planning Guide'],
] as const;

export const BATHROOM_CLUSTER_POSTS: BlogPostData[] = bathSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Design-build bathroom remodeling for Boise, Meridian, Eagle & the Treasure Valley. Free in-home consultation.`,
    excerpt: `Expert ${title.toLowerCase()} advice for Idaho homeowners.`,
    hubSlug: 'bathroom-remodeling',
    tags: ['bathroom'],
    quickAnswer: `Local design-build guidance for ${title.toLowerCase()} in the Treasure Valley.`,
    takeaways: ['Plan waterproofing and permits early.', 'Match finishes to the rest of your home.'],
    serviceUrl: b,
    cityServiceUrl: bb,
  }),
);

// -  - Hub 4 Additions -  - 
export const ADDITION_PILLAR = buildPillarGuide({
  slug: 'boise-home-addition-guide',
  title: 'Boise Home Addition Guide',
  seoTitle: 'Boise Home Addition Guide',
  metaDescription: 'Room additions, second stories, ADUs, and garage conversions in Boise and the Treasure Valley: feasibility, permits, cost, and design-build planning.',
  excerpt: 'Plan additions that match your home and pass Ada or Canyon County review.',
  hubSlug: 'home-additions',
  tags: ['addition', 'adu'],
  quickAnswer:
    'Room additions in the Treasure Valley often plan $80,000–$250,000+ including foundation, structure, MEP, and finish - second stories and ADUs can run higher.',
  takeaways: [
    'Feasibility starts with setbacks, soil, and HOA rules.',
    'Roof and exterior tie-ins should be resolved in design.',
    'ADUs require utility, fire, and zoning diligence.',
  ],
  linkedClusterSlugs: [
    'primary-suite-additions',
    'bedroom-additions',
    'second-story-additions',
    'garage-conversions',
    'adu-guide-boise',
    'multigenerational-living-remodels',
    'home-addition-timeline-guide',
    'room-addition-guide-treasure-valley',
  ],
  linkedServices: ['room-addition', 'adu'],
  content: ADDITION_GUIDE_CONTENT,
  faqs: ADDITION_GUIDE_FAQS,
});

const additionSlugs = [
  ['primary-suite-additions', 'Primary Suite Additions'],
  ['bedroom-additions', 'Bedroom Additions'],
  ['second-story-additions', 'Second Story Additions'],
  ['garage-conversions', 'Garage Conversions'],
  ['adu-guide-boise', 'ADU Guide Boise'],
  ['multigenerational-living-remodels', 'Multigenerational Living Remodels'],
  ['home-addition-timeline-guide', 'Home Addition Timeline Guide'],
] as const;

/** ADU-adjacent clusters force-link the ADU pillar (local-seo-audit/06-internal-linking-plan.md Gap 4). */
const ADU_PILLAR_LINK = { url: '/guides/boise-adu-guide', anchor: 'Boise ADU Guide' };
const ADDITION_EXTRA_LINKS: Record<string, Array<{ url: string; anchor?: string }>> = {
  'adu-guide-boise': [ADU_PILLAR_LINK, { url: '/services/adu/boise', anchor: 'ADU builder in Boise' }],
  'garage-conversions': [ADU_PILLAR_LINK, { url: adu, anchor: 'ADU and guest house construction' }],
  'multigenerational-living-remodels': [ADU_PILLAR_LINK],
  'primary-suite-additions': [{ url: ab, anchor: 'Room additions in Boise' }],
};

export const ADDITION_CLUSTER_POSTS: BlogPostData[] = additionSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Design-build additions for Boise, Meridian, Eagle, Kuna & the Treasure Valley. Permits handled. Free consultation.`,
    excerpt: `Planning ${title.toLowerCase()} with local permits and design-build coordination.`,
    hubSlug: 'home-additions',
    tags: ['addition'],
    quickAnswer: `${title} in Idaho requires early feasibility, structural planning, and realistic permit schedules.`,
    takeaways: ['Match architecture to protect resale.', 'Budget contingency for site and structure.'],
    serviceUrl: a,
    cityServiceUrl: ab,
    extraRelatedLinks: ADDITION_EXTRA_LINKS[slug],
  }),
);

// -  - Hub 5 Whole home -  - 
export const WHOLE_HOME_PILLAR = buildPillarGuide({
  slug: 'whole-home-remodeling-guide',
  title: 'Whole Home Remodeling Guide',
  seoTitle: 'Whole Home Remodeling Guide Boise',
  metaDescription: 'Whole-home renovations in Idaho: phasing, remodeling vs moving, living through construction, budgeting, and design-build coordination.',
  excerpt: 'Coordinate whole-home remodels as one program - not disconnected mini-projects.',
  hubSlug: 'whole-home-remodeling',
  tags: ['whole-home'],
  quickAnswer:
    'Whole-home remodels in the Treasure Valley often span $180,000–$425,000+ with timelines from several months to a year depending on phasing and permits.',
  takeaways: [
    'Sequence structural and MEP before finishes.',
    'Hold contingency for concealed conditions.',
    'Compare remodeling vs moving with total cost of ownership.',
  ],
  linkedClusterSlugs: [
    'remodeling-vs-moving',
    'whole-home-remodel-timeline',
    'living-through-a-remodel',
    'remodel-planning-guide',
    'remodeling-mistakes-to-avoid',
    'design-build-process-guide',
    'whole-home-remodel-planning-checklist',
  ],
  linkedServices: ['whole-home-remodel'],
  content: WHOLE_HOME_GUIDE_CONTENT,
  faqs: WHOLE_HOME_GUIDE_FAQS,
});

const wholeSlugs = [
  ['remodeling-vs-moving', 'Remodeling vs Moving'],
  ['whole-home-remodel-timeline', 'Whole Home Remodel Timeline'],
  ['living-through-a-remodel', 'Living Through a Remodel'],
  ['remodel-planning-guide', 'Remodel Planning Guide'],
  ['remodeling-mistakes-to-avoid', 'Remodeling Mistakes to Avoid'],
  ['design-build-process-guide', 'Design-Build Process Guide'],
] as const;

const wholeHomeAnswers:Record<string,string>={
  'remodeling-vs-moving':'Remodeling can address layout, condition and comfort while keeping your location; moving can solve needs your current property cannot accommodate. Compare a complete remodeling scope and temporary housing costs with the costs of buying, selling and moving. Consider daily routines, future space needs and how long you expect to stay, not just an assumed resale return.',
  'whole-home-remodel-timeline':'A whole-home remodeling schedule includes scope development, design and selections, permits where required, procurement, construction and closeout. Separate those phases when comparing timelines. Structural changes, occupied rooms and long-lead materials can affect sequencing. Ask for a schedule with decision deadlines and dependencies, then confirm how changes and concealed conditions will be handled.',
  'living-through-a-remodel':'Living at home during a remodel depends on safe access, working bathrooms, cooking arrangements and the ability to separate occupants from work areas. Noise, dust and temporary utility interruptions may make some phases impractical. Agree on room closures, work hours, pet safety, cleanup and any temporary accommodation before construction begins.',
  'remodel-planning-guide':'Plan a remodel by defining the problems you want to solve, the work included and the limits of your budget. Record measurements, priorities and owner-supplied items before comparing proposals. Confirm design, permit and construction responsibilities, then set selection deadlines and a written change process. Leave room in the schedule and budget for verified concealed conditions.',
  'remodeling-mistakes-to-avoid':'Common remodeling mistakes include comparing different scopes as if they were equivalent, ordering finishes before checking dimensions, and leaving responsibilities unwritten. Confirm what each quote includes, which decisions affect the schedule and how changes are approved. Discuss access, protection and temporary loss of rooms before work starts, especially if you plan to remain at home.',
  'design-build-process-guide':'Design-build keeps design decisions and construction planning with one accountable team. Start with project fit, scope and preliminary budget; confirm the agreement before detailed design and selections. Drawings, permit requirements, procurement and construction should follow a documented sequence. Ask who approves changes and how updated costs and schedules are communicated before work proceeds.',
};
export const WHOLE_HOME_CLUSTER_POSTS: BlogPostData[] = wholeSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Whole-home design-build remodeling for Boise & the Treasure Valley: phasing, budgeting & one accountable team.`,
    excerpt: `${title}: practical Idaho advice from a design-build remodeler.`,
    hubSlug: 'whole-home-remodeling',
    tags: ['whole-home'],
    quickAnswer: wholeHomeAnswers[slug],
    takeaways: ['Plan one master scope.', 'Use written milestones and selections schedule.'],
    serviceUrl: w,
    cityServiceUrl: wb,
  }),
);

// -  - Hub 6 Contractor -  - 
export const CONTRACTOR_PILLAR = buildPillarGuide({
  slug: 'choose-remodeling-contractor-boise',
  title: 'How to Choose a Remodeling Contractor in Boise',
  seoTitle: 'Choose a Remodeling Contractor Boise',
  metaDescription:
    'Vet remodeling contractors in Boise: design-build vs general contractor, bids, red flags, consultations, and written scope before you sign.',
  excerpt: 'Choose a Treasure Valley remodeling partner with aligned scope - not just the lowest bid.',
  hubSlug: 'contractor-selection',
  tags: ['contractor', 'design-build'],
  quickAnswer:
    'Choose a Boise remodeling contractor with written scope, local permit experience, clear communication, verified insurance, and a single point of contact during construction.',
  takeaways: [
    'Compare bids only when scope and allowances match.',
    'Design-build reduces handoff risk between designer and builder.',
    'Red flags include vague contracts and large upfront cash demands.',
  ],
  linkedClusterSlugs: [
    'questions-to-ask-remodeling-contractor',
    'remodeling-contractor-red-flags',
    'design-build-vs-general-contractor',
    'fixed-price-vs-cost-plus',
    'how-to-compare-remodeling-estimates',
    'why-remodeling-bids-vary',
    'what-makes-great-remodeling-contractor',
    'consultation-process-remodeling',
    'how-to-choose-design-build-contractor',
  ],
  linkedServices: ['kitchen-remodel', 'bathroom-remodel', 'whole-home-remodel'],
  content: CONTRACTOR_GUIDE_CONTENT,
  faqs: CONTRACTOR_GUIDE_FAQS,
});

const contractorSlugs = [
  ['questions-to-ask-remodeling-contractor', 'Questions to Ask a Remodeling Contractor'],
  ['remodeling-contractor-red-flags', 'Remodeling Contractor Red Flags'],
  ['design-build-vs-general-contractor', 'Design-Build vs General Contractor'],
  ['fixed-price-vs-cost-plus', 'Fixed Price vs Cost Plus'],
  ['how-to-compare-remodeling-estimates', 'How to Compare Remodeling Estimates'],
  ['why-remodeling-bids-vary', 'Why Remodeling Bids Vary So Much'],
  ['what-makes-great-remodeling-contractor', 'What Makes a Great Remodeling Contractor'],
  ['consultation-process-remodeling', 'What to Expect During the Consultation Process'],
] as const;

export const CONTRACTOR_CLUSTER_POSTS: BlogPostData[] = contractorSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Design-build contractor-selection guidance for Boise & the Treasure Valley homeowners. Free consultation.`,
    excerpt: title,
    hubSlug: 'contractor-selection',
    tags: ['contractor'],
    quickAnswer: `${title}: educate yourself before signing a remodeling contract in Idaho.`,
    takeaways: ['Get everything in writing.', 'Verify local references and permit track record.'],
    serviceUrl: w,
    cityServiceUrl: wb,
  }),
);

// -  - Hub 7 Process -  - 
export const PROCESS_PILLAR = buildPillarGuide({
  slug: 'boise-remodeling-process-guide',
  title: 'Boise Remodeling Process Guide',
  seoTitle: 'Boise Remodeling Process Guide',
  metaDescription:
    'End-to-end remodeling process in Idaho: preconstruction, design, permits, construction, punch list, and warranty - what to expect at each phase.',
  excerpt: 'Understand every phase of a Treasure Valley design-build remodel before you start.',
  hubSlug: 'remodeling-process',
  tags: ['process', 'permits'],
  quickAnswer:
    'A typical Boise remodel moves from consultation and scope, through design and permits, into construction and punch list - with one team accountable at each phase.',
  takeaways: [
    'Permits belong in the master schedule - not afterthoughts.',
    'Selections should be locked before demo when possible.',
    'Punch list and warranty should be defined in contract.',
  ],
  linkedClusterSlugs: [
    'remodeling-timeline-guide',
    'boise-permit-guide',
    'preconstruction-guide',
    'design-development-guide',
    'material-selection-guide',
    'construction-phase-guide',
    'punch-list-guide',
    'warranty-guide-remodeling',
    'ada-vs-canyon-county-permit-timelines',
  ],
  linkedServices: ['whole-home-remodel', 'kitchen-remodel', 'bathroom-remodel'],
  content: PROCESS_GUIDE_CONTENT,
  faqs: PROCESS_GUIDE_FAQS,
});

const processSlugs = [
  ['remodeling-timeline-guide', 'Remodeling Timeline Guide'],
  ['boise-permit-guide', 'Boise Permit Guide'],
  ['preconstruction-guide', 'Preconstruction Guide'],
  ['design-development-guide', 'Design Development Guide'],
  ['material-selection-guide', 'Material Selection Guide'],
  ['construction-phase-guide', 'Construction Phase Guide'],
  ['punch-list-guide', 'Punch List Guide'],
  ['warranty-guide-remodeling', 'Warranty Guide'],
] as const;

export const PROCESS_CLUSTER_POSTS: BlogPostData[] = processSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Design-build remodeling process guidance for Ada and Canyon County homeowners. Free in-home consultation.`,
    excerpt: title,
    hubSlug: 'remodeling-process',
    tags: ['process', 'permits'],
    quickAnswer: `${title} for Treasure Valley homeowners working with design-build teams.`,
    takeaways: ['Build time for permits.', 'Document selections and changes.'],
    serviceUrl: w,
    cityServiceUrl: wb,
  }),
);

// -  - Hub 8 ROI -  - 
export const ROI_PILLAR = buildPillarGuide({
  slug: 'best-remodeling-roi-boise',
  title: 'Best Remodeling Projects for ROI in Boise',
  seoTitle: 'Best Remodeling ROI Boise',
  metaDescription: 'Which remodels return the most value in Boise, Meridian & Eagle resale markets? Compare kitchen, bath, addition, and energy ROI before you remodel.',
  excerpt: 'ROI-focused remodeling guidance for Treasure Valley homeowners.',
  hubSlug: 'remodeling-roi',
  tags: ['roi', 'value'],
  quickAnswer:
    'Kitchen and bath updates often deliver strong lifestyle value; ROI depends on neighborhood comps - avoid over-improving beyond your street in Boise or Meridian.',
  takeaways: [
    'Match spend to neighborhood sale prices.',
    'Energy upgrades can improve comfort and operating cost.',
    'Outdoor and exterior work varies by buyer expectations.',
  ],
  linkedClusterSlugs: [
    'kitchen-remodel-roi',
    'bathroom-remodel-roi',
    'addition-roi-remodeling',
    'outdoor-living-roi',
    'exterior-remodeling-roi',
    'energy-efficiency-roi',
    'remodeling-before-selling',
    'remodeling-long-term-living',
  ],
  linkedServices: ['kitchen-remodel', 'bathroom-remodel', 'room-addition'],
  content: ROI_GUIDE_CONTENT,
  faqs: ROI_GUIDE_FAQS,
});

const roiSlugs = [
  // kitchen-roi-remodeling and bathroom-roi-remodeling consolidated (301) into
  // kitchen-remodel-roi / bathroom-remodel-roi to remove ROI cannibalization (§D).
  ['addition-roi-remodeling', 'Addition ROI'],
  ['outdoor-living-roi', 'Outdoor Living ROI'],
  ['exterior-remodeling-roi', 'Exterior Remodeling ROI'],
  ['energy-efficiency-roi', 'Energy Efficiency ROI'],
  ['remodeling-before-selling', 'Remodeling Before Selling'],
  ['remodeling-long-term-living', 'Remodeling for Long-Term Living'],
] as const;

export const ROI_CLUSTER_POSTS: BlogPostData[] = roiSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: `${title} | Boise`,
    metaDescription: `${title}. Resale value insight for Boise, Meridian & Eagle homeowners. Plan ROI before you remodel. Free consultation.`,
    excerpt: `${title} considerations for Idaho homeowners.`,
    hubSlug: 'remodeling-roi',
    tags: ['roi'],
    quickAnswer: `${title} depends on local comps, finish level, and how long you will stay in the home.`,
    takeaways: ['Research neighborhood sales.', 'Prioritize projects you will enjoy if ROI is modest.'],
    serviceUrl: k,
    cityServiceUrl: kb,
  }),
);

// -  - Hub 9 Outdoor -  - 
export const OUTDOOR_PILLAR = buildPillarGuide({
  slug: 'outdoor-living-remodeling-guide',
  title: 'Outdoor Living Remodeling Guide',
  seoTitle: 'Outdoor Living Remodeling Guide Boise',
  metaDescription:
    'Outdoor kitchens, covered patios, decks vs patios, fireplaces, and backyard entertaining built for Idaho’s dry climate and freeze-thaw seasons.',
  excerpt: 'Extend living space outdoors across the Treasure Valley.',
  hubSlug: 'outdoor-living',
  tags: ['outdoor', 'patio'],
  quickAnswer:
    'Outdoor living projects should account for Idaho sun, freeze-thaw on hardscape, and integration with indoor kitchen and entertaining flow - often planned with whole-home or kitchen remodel teams.',
  takeaways: [
    'Schedule concrete and masonry in weather windows.',
    'Plan utilities for outdoor kitchens early.',
    'Covered structures may need permits in Ada or Canyon County.',
  ],
  linkedClusterSlugs: [
    'outdoor-kitchens-boise',
    'covered-patios-boise',
    'decks-vs-patios-boise',
    'outdoor-fireplaces-boise',
    'outdoor-entertaining-spaces',
    'luxury-outdoor-living',
    'backyard-transformations-boise',
  ],
  linkedServices: ['whole-home-remodel'],
  content: OUTDOOR_GUIDE_CONTENT,
  faqs: OUTDOOR_GUIDE_FAQS,
});

const outdoorSlugs = [
  ['outdoor-kitchens-boise', 'Outdoor Kitchens'],
  ['covered-patios-boise', 'Covered Patios'],
  ['decks-vs-patios-boise', 'Decks vs Patios'],
  ['outdoor-fireplaces-boise', 'Outdoor Fireplaces'],
  ['outdoor-entertaining-spaces', 'Outdoor Entertaining Spaces'],
  ['luxury-outdoor-living', 'Luxury Outdoor Living'],
  ['backyard-transformations-boise', 'Backyard Transformations'],
] as const;

export const OUTDOOR_CLUSTER_POSTS: BlogPostData[] = outdoorSlugs.map(([slug, title]) =>
  buildClusterPost({
    slug,
    title,
    seoTitle: title,
    metaDescription: `${title}. Design-build outdoor living for Boise-area homes, built for Idaho seasons and freeze-thaw. Free consultation.`,
    excerpt: `${title} in the Treasure Valley climate.`,
    hubSlug: 'outdoor-living',
    tags: ['outdoor'],
    quickAnswer: `${title} should be designed for Idaho seasons and coordinated with drainage and utilities.`,
    takeaways: ['Plan shade and heat.', 'Integrate with indoor remodel scope when possible.'],
    serviceUrl: w,
    cityServiceUrl: wb,
  }),
);

// -  - Hub 10 Location guides -  - 
export const LOCATION_GUIDES: GuidePageData[] = [
  buildLocationGuide({
    slug: 'meridian-remodeling-guide',
    title: 'Meridian Remodeling Guide',
    cityName: 'Meridian',
    citySlug: 'meridian',
    county: 'ada',
    housingNote:
      'Meridian’s 1990s–2010s subdivisions often feature builder-grade kitchens and baths ideal for open-layout and primary-suite upgrades.',
    guideType: 'location',
    seoTitle: 'Meridian Remodeling Guide',
    metaDescription: 'Remodeling in Meridian, Idaho: Ada County permits, builder-grade subdivision upgrades, and design-build kitchen, bath, and whole-home services.',
    excerpt: 'Remodeling guide for Meridian homeowners.',
    quickAnswer: 'Meridian remodels follow Ada County permits with strong demand for kitchen, bath, and whole-home updates in established subdivisions.',
    takeaways: ['Ada County plan review applies.', 'Open kitchen conversions are common.'],
  }),
  buildLocationGuide({
    slug: 'eagle-remodeling-guide',
    title: 'Eagle Remodeling Guide',
    cityName: 'Eagle',
    citySlug: 'eagle',
    county: 'ada',
    housingNote:
      'Eagle homes often include larger footprints, three-car garages, and HOA design standards - plan architectural review time.',
    guideType: 'location',
    seoTitle: 'Eagle Remodeling Guide',
    metaDescription: 'Remodeling in Eagle, Idaho including the Foothills and Hidden Springs: HOA design review, premium finishes, additions, and master-suite expansions.',
    excerpt: 'Eagle remodeling with HOA and premium finish context.',
    quickAnswer: 'Eagle remodeling frequently includes HOA review, premium finishes, and additions or master-suite expansions.',
    takeaways: ['HOA design review is common.', 'Match roof and exterior materials carefully.'],
  }),
  buildLocationGuide({
    slug: 'kuna-remodeling-guide',
    title: 'Kuna Remodeling Guide',
    cityName: 'Kuna',
    citySlug: 'kuna',
    county: 'ada',
    housingNote: 'Kuna offers newer construction and growing inventory - great for kitchen refreshes and ADU feasibility studies.',
    guideType: 'location',
    seoTitle: 'Kuna Remodeling Guide',
    metaDescription: 'Remodeling in Kuna, Idaho: Ada County permits, newer construction, ADU feasibility, and family-friendly kitchen and bath upgrades from a local team.',
    excerpt: 'Kuna remodeling services and planning tips.',
    quickAnswer: 'Kuna remodels use Ada County processes with growing demand for family-friendly kitchen and bath upgrades.',
    takeaways: ['Feasibility for additions and ADUs varies by lot.', 'Plan for trade lead times.'],
  }),
  buildLocationGuide({
    slug: 'star-remodeling-guide',
    title: 'Star Remodeling Guide',
    cityName: 'Star',
    citySlug: 'star',
    county: 'ada',
    housingNote: 'Star combines small-town feel with commuter access to Boise - remodels often focus on kitchens and outdoor connection.',
    guideType: 'location',
    seoTitle: 'Star Remodeling Guide',
    metaDescription: 'Remodeling in Star, Idaho: Ada County permitting plus kitchen, bath, addition, and outdoor-living upgrades for this growing Treasure Valley town.',
    excerpt: 'Star Idaho remodeling guide.',
    quickAnswer: 'Star homeowners remodel kitchens, baths, and additions with Ada County permitting like surrounding communities.',
    takeaways: ['Smaller homes need smart storage.', 'Coordinate outdoor and indoor scopes.'],
  }),
  buildLocationGuide({
    slug: 'middleton-remodeling-guide',
    title: 'Middleton Remodeling Guide',
    cityName: 'Middleton',
    citySlug: 'middleton',
    county: 'canyon',
    housingNote: 'Middleton sits in Canyon County - permit portals and review cadence differ from Ada County Boise projects.',
    guideType: 'location',
    seoTitle: 'Middleton Remodeling Guide',
    metaDescription: 'Remodeling in Middleton, Idaho: Canyon County permits, local housing context, and design-build kitchen, bath, whole-home, and addition services.',
    excerpt: 'Middleton remodeling in Canyon County.',
    quickAnswer: 'Middleton remodels route through Canyon County with similar scope options: kitchen, bath, whole-home, and additions.',
    takeaways: ['Canyon County permits apply.', 'Budget extra time for cross-county trade coordination.'],
  }),
  buildLocationGuide({
    slug: 'nampa-remodeling-guide',
    title: 'Nampa Remodeling Guide',
    cityName: 'Nampa',
    citySlug: 'nampa',
    county: 'canyon',
    housingNote:
      'Nampa’s diverse housing stock - from older bungalows to newer builds - requires tailored electrical and layout strategies in Canyon County.',
    guideType: 'location',
    seoTitle: 'Nampa Remodeling Guide',
    metaDescription: 'Remodeling in Nampa, Idaho: Canyon County permits, diverse housing stock, and design-build kitchen, bathroom, whole-home, and addition services.',
    excerpt: 'Nampa remodeling guide for Canyon County homeowners.',
    quickAnswer: 'Nampa remodeling uses Canyon County permitting with strong kitchen, bathroom, and whole-home demand.',
    takeaways: ['Canyon County review paths differ from Ada.', 'Compare bids with aligned scope.'],
  }),
  buildLocationGuide({
    slug: 'caldwell-remodeling-guide',
    title: 'Caldwell Remodeling Guide',
    cityName: 'Caldwell',
    citySlug: 'caldwell',
    county: 'canyon',
    housingNote:
      'Caldwell blends historic homes near the College of Idaho and Cleveland Blvd with newer Ustick and Wilson construction - housing era drives electrical, layout, and window scope in Canyon County.',
    guideType: 'location',
    seoTitle: 'Caldwell Remodeling Guide',
    metaDescription: 'Remodeling in Caldwell, Idaho: Canyon County permits, historic and new-build housing context, and design-build kitchen, bath, whole-home, and addition services.',
    excerpt: 'Caldwell remodeling guide for Canyon County homeowners.',
    quickAnswer: 'Caldwell remodels route through Canyon County with strong kitchen, bath, and whole-home demand across historic and newer neighborhoods.',
    takeaways: ['Canyon County permits apply.', 'Housing era drives electrical and layout scope.'],
  }),
  buildLocationGuide({
    slug: 'north-end-remodeling-guide',
    title: 'North End Remodeling Guide',
    cityName: 'Boise North End',
    citySlug: 'boise',
    county: 'ada',
    housingNote:
      'North End bungalows and historic character require sensitive kitchen/bath layouts, electrical upgrades, and scale-appropriate additions.',
    guideType: 'neighborhood',
    seoTitle: 'North End Remodeling Guide',
    metaDescription: "Remodeling in Boise's North End: sensitive kitchen and bath layouts, electrical upgrades, and scale-appropriate additions for historic bungalows.",
    excerpt: 'North End remodeling with older-home considerations.',
    quickAnswer: 'North End remodels balance historic character with modern kitchen and bath function - often with electrical and structural upgrades.',
    takeaways: ['Respect scale and street rhythm.', 'Plan for older wiring and plumbing.'],
  }),
  buildLocationGuide({
    slug: 'boise-bench-remodeling-guide',
    title: 'Boise Bench Remodeling Guide',
    cityName: 'Boise Bench',
    citySlug: 'boise',
    county: 'ada',
    housingNote: 'Bench ranches from mid-century eras are prime candidates for open kitchens, window upgrades, and primary bath modernizations.',
    guideType: 'neighborhood',
    seoTitle: 'Boise Bench Remodeling Guide',
    metaDescription: 'Remodeling on the Boise Bench: opening up mid-century ranch kitchens, modernizing primary baths, and upgrading windows and insulation.',
    excerpt: 'Bench neighborhood remodeling guide.',
    quickAnswer: 'Boise Bench remodels often open galley kitchens to living spaces and upgrade baths within ranch footprints.',
    takeaways: ['Check structure before removing walls.', 'Improve insulation when walls are open.'],
  }),
  buildLocationGuide({
    slug: 'harris-ranch-remodeling-guide',
    title: 'Harris Ranch Remodeling Guide',
    cityName: 'Harris Ranch',
    citySlug: 'boise',
    county: 'ada',
    housingNote: 'Harris Ranch features newer construction where kitchen islands, mudrooms, and outdoor living upgrades are popular.',
    guideType: 'neighborhood',
    seoTitle: 'Harris Ranch Remodeling Guide',
    metaDescription: 'Remodeling in Harris Ranch, Boise: upgrading builder-grade finishes, adding kitchen islands and mudrooms, and expanding HOA-aware outdoor living.',
    excerpt: 'Harris Ranch remodeling guide.',
    quickAnswer: 'Harris Ranch remodels often upgrade builder-grade finishes and expand entertaining spaces with HOA-aware exterior choices.',
    takeaways: ['HOA may review exterior changes.', 'Plan long-lead materials early.'],
  }),
  buildLocationGuide({
    slug: 'east-boise-remodeling-guide',
    title: 'East Boise Remodeling Guide',
    cityName: 'East Boise',
    citySlug: 'boise',
    county: 'ada',
    housingNote: 'East Boise includes a mix of established homes and infill - feasibility varies block by block for additions.',
    guideType: 'neighborhood',
    seoTitle: 'East Boise Remodeling Guide',
    metaDescription: 'Remodeling in East Boise: kitchen and bath upgrades through full additions for established homes and infill lots - confirm setbacks and zoning early.',
    excerpt: 'East Boise remodeling neighborhoods guide.',
    quickAnswer: 'East Boise remodeling spans kitchen and bath upgrades to additions - confirm setbacks and zoning early.',
    takeaways: ['Verify lot constraints before design.', 'Use design-build for complex scopes.'],
  }),
  buildLocationGuide({
    slug: 'hidden-springs-remodeling-guide',
    title: 'Hidden Springs Remodeling Guide',
    cityName: 'Hidden Springs',
    citySlug: 'eagle',
    county: 'ada',
    housingNote: 'Hidden Springs emphasizes architectural harmony - exterior and addition projects need careful design review.',
    guideType: 'neighborhood',
    seoTitle: 'Hidden Springs Remodeling Guide',
    metaDescription: "Remodeling in Hidden Springs, Eagle: HOA design coordination, premium finishes, and additions that respect this master-planned community's standards.",
    excerpt: 'Hidden Springs remodeling with HOA context.',
    quickAnswer: 'Hidden Springs remodels require HOA coordination and premium finish coordination common to master-planned communities.',
    takeaways: ['Start HOA review early.', 'Match community design standards.'],
  }),
  buildLocationGuide({
    slug: 'eagle-foothills-remodeling-guide',
    title: 'Eagle Foothills Remodeling Guide',
    cityName: 'Eagle Foothills',
    citySlug: 'eagle',
    county: 'ada',
    housingNote:
      'Foothills properties may involve slopes, views, and custom homes - structural and site costs can exceed valley-floor averages.',
    guideType: 'neighborhood',
    seoTitle: 'Eagle Foothills Remodeling Guide',
    metaDescription: 'Remodeling in the Eagle Foothills: luxury finishes, hillside sites with views, structural planning, and longer design-development timelines.',
    excerpt: 'Eagle Foothills luxury and structural remodeling context.',
    quickAnswer: 'Eagle Foothills remodeling often includes luxury finishes, complex sites, and longer design development timelines.',
    takeaways: ['Budget for site and structure.', 'Plan for weather and access constraints.'],
  }),
];

export const ALL_HUB_PILLARS: GuidePageData[] = [
  KITCHEN_PILLAR,
  BATHROOM_PILLAR,
  ADDITION_PILLAR,
  WHOLE_HOME_PILLAR,
  CONTRACTOR_PILLAR,
  PROCESS_PILLAR,
  ROI_PILLAR,
  OUTDOOR_PILLAR,
];

export const ALL_HUB_CLUSTER_POSTS: BlogPostData[] = [
  ...KITCHEN_CLUSTER_POSTS,
  ...BATHROOM_CLUSTER_POSTS,
  ...ADDITION_CLUSTER_POSTS,
  ...WHOLE_HOME_CLUSTER_POSTS,
  ...CONTRACTOR_CLUSTER_POSTS,
  ...PROCESS_CLUSTER_POSTS,
  ...ROI_CLUSTER_POSTS,
  ...OUTDOOR_CLUSTER_POSTS,
];
