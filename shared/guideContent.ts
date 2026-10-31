import {
  BOISE_REMODELING_COST_GUIDE_HTML,
  BOISE_REMODELING_COST_QUICK_ANSWER,
  BOISE_REMODELING_COST_TAKEAWAYS,
} from './content/wave1/boiseRemodelingCostGuide';
import {
  TREASURE_VALLEY_GUIDE_HTML,
  BOISE_GUIDE_HTML,
  TV_QUICK_ANSWER,
  BOISE_QUICK_ANSWER,
  TV_TAKEAWAYS,
  BOISE_TAKEAWAYS,
} from './content/wave1/locationGuides';
import { ALL_HUB_PILLARS, LOCATION_GUIDES } from './content/allHubsContent';
import { expandPillar } from './content/contentFactory';
import {
  BOISE_ADU_GUIDE_FAQS,
  BOISE_ADU_GUIDE_HTML,
  BOISE_ADU_GUIDE_QUICK_ANSWER,
  BOISE_ADU_GUIDE_TAKEAWAYS,
} from './content/boiseAduGuide';

export type GuideType = 'hub-pillar' | 'location' | 'neighborhood' | 'master';

export interface GuidePageData {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  author: string;
  hubSlug: string;
  guideType: GuideType;
  tags: string[];
  publishedAt: string;
  /** Last substantive revision date (ISO). Feeds Article dateModified. */
  updatedAt?: string;
  heroImage?: string;
  quickAnswer?: string;
  keyTakeaways?: string[];
  faqs: Array<{ question: string; answer: string }>;
  linkedClusterSlugs?: string[];
  linkedServices?: string[];
  linkedCities?: string[];
  relatedLinks?: Array<{ url: string; anchor?: string }>;
  primaryKeyword?: string;
}

const costPillarFaqs = [
  {
    question: 'How much does a typical home remodel cost in Boise?',
    answer:
      'Most homeowners should plan room-level budgets: kitchens often $37,000–$110,000+, master baths $35,000–$85,000+, and whole-home programs $180,000–$425,000+ depending on scope and finishes.',
  },
  {
    question: 'Are remodeling costs higher in Eagle than in Meridian?',
    answer:
      'Finish level and structural complexity drive price more than zip code alone. Eagle projects often include premium materials and HOA design review time, which can increase overall investment.',
  },
  {
    question: 'Do you include permits in remodeling quotes?',
    answer:
      'Yes. Boise Remodeling Co includes permits in design-build scope for Ada and Canyon County projects and coordinates submissions on your behalf.',
  },
  {
    question: 'Why do remodeling bids vary so much?',
    answer:
      'Bids differ when scope, allowances, permit fees, and finish levels are not aligned. A lower bid may exclude demolition haul-off, design, or engineering.',
  },
  {
    question: 'Should I budget contingency for a remodel?',
    answer:
      'Hold 10–15% contingency for concealed conditions - especially in pre-1990 Boise and Bench homes where framing, plumbing, or wiring surprises are common.',
  },
  {
    question: 'Are appliances included in kitchen remodel cost?',
    answer:
      'Appliances are typically client-supplied. We guide selection and coordinate rough-in but do not purchase or install appliances.',
  },
  {
    question: 'How long does a kitchen remodel take in the Treasure Valley?',
    answer:
      'Many full kitchen remodels run 8–16 weeks of construction after design and permits. Cabinet lead times can add weeks before demo.',
  },
  {
    question: 'What permits are needed for a bathroom remodel in Boise?',
    answer:
      'Cosmetic updates may need minimal permits. Layout changes, plumbing relocations, and structural work require Ada County or city plan review with inspections.',
  },
  {
    question: 'Is cost per square foot accurate for remodeling?',
    answer:
      'Cost per square foot is a planning shorthand for whole-home or addition work. Individual rooms like kitchens should be budgeted on room scope, not whole-house SF alone.',
  },
  {
    question: 'How does design-build affect total cost?',
    answer:
      'Design-build consolidates design, estimating, and construction under one contract, reducing change orders and gaps common when design and build are separate.',
  },
  {
    question: 'What is the cheapest remodel with the best ROI?',
    answer:
      'Focused bath and kitchen updates often deliver strong lifestyle and resale value when aligned with neighborhood comps - avoid over-improving beyond the street.',
  },
  {
    question: 'Can I remodel in phases to spread cost?',
    answer:
      'Yes. Phasing can spread cash flow but may add mobilization cost. A master plan helps keep finishes cohesive across phases.',
  },
  {
    question: 'Do Canyon County remodels cost less than Ada County?',
    answer:
      'Labor and materials are similar; differences are usually permit processes, travel, and project scope - not a simple county discount.',
  },
  {
    question: 'How do I get a realistic remodeling number for my home?',
    answer:
      'Start with our online estimator for a planning range, then schedule an in-home consultation for a written scope tied to your layout and selections.',
  },
  {
    question: 'Does Boise Remodeling Co publish starting-at prices?',
    answer:
      'We publish planning ranges by project type for education, not bait pricing. Firm numbers require seeing your home and defining scope.',
  },
];

export const GUIDE_PAGES: GuidePageData[] = [
  {
    slug: 'boise-remodeling-cost-guide',
    title: 'Boise Remodeling Cost Guide (2026 Planning Ranges)',
    seoTitle: 'Boise Remodeling Cost Guide | Treasure Valley',
    metaDescription:
      'Definitive 2026 remodeling cost guide for Boise & the Treasure Valley: kitchens, baths, whole-home, additions, $/SF, budgeting, permits, and timelines.',
    excerpt:
      'The complete planning guide for remodeling costs in Boise, Meridian, Eagle, Nampa, and the Treasure Valley - with ranges, tables, and local permit context.',
    content: expandPillar(BOISE_REMODELING_COST_GUIDE_HTML, 'boise-remodeling-cost-guide', 'remodeling-costs'),
    author: 'Boise Remodeling Co',
    hubSlug: 'remodeling-costs',
    guideType: 'hub-pillar',
    tags: ['cost', 'budget', 'boise', 'treasure valley'],
    publishedAt: '2026-05-01',
    quickAnswer: BOISE_REMODELING_COST_QUICK_ANSWER,
    keyTakeaways: BOISE_REMODELING_COST_TAKEAWAYS,
    faqs: costPillarFaqs,
    linkedClusterSlugs: [
      'kitchen-remodel-cost-boise',
      'bathroom-remodel-cost-boise',
      'whole-home-remodel-cost-boise',
      'home-addition-cost-boise',
      'luxury-remodel-cost-boise',
      'remodel-cost-per-square-foot-boise',
      'what-impacts-remodeling-costs-boise',
      'how-to-budget-remodel-boise',
    ],
    linkedServices: ['kitchen-remodel', 'bathroom-remodel', 'whole-home-remodel', 'room-addition'],
    linkedCities: ['boise', 'meridian', 'eagle', 'nampa'],
    relatedLinks: [
      { url: '/guides/treasure-valley-remodeling-guide' },
      { url: '/guides/boise-remodeling-guide' },
      { url: '/blog/category/remodeling-costs' },
      { url: '/areas' },
      { url: '/#calculator' },
      // The cost guide is the site's highest-authority content asset; route
      // that authority to the money pages with cost-flavored anchors
      // (local-seo-audit/06-internal-linking-plan.md Gap 2).
      { url: '/services/kitchen-remodel/boise', anchor: 'Kitchen remodeling costs in Boise' },
      { url: '/services/bathroom-remodel', anchor: 'Bathroom remodel pricing' },
      { url: '/services/whole-home-remodel', anchor: 'Whole-home remodel investment' },
      { url: '/services/room-addition', anchor: 'Room addition costs' },
      { url: '/services/adu', anchor: 'ADU construction costs' },
    ],
    primaryKeyword: 'boise remodeling cost',
  },
  {
    slug: 'treasure-valley-remodeling-guide',
    title: 'Treasure Valley Remodeling Guide',
    seoTitle: 'Treasure Valley Remodeling Guide | Idaho',
    metaDescription:
      'Master guide to remodeling in the Treasure Valley: Boise, Meridian, Eagle, Kuna, Star, Middleton, Nampa, Caldwell - permits, housing stock, costs, and services.',
    excerpt:
      'Your starting point for remodeling anywhere in the Treasure Valley - city guides, permits, and links to local services.',
    content: TREASURE_VALLEY_GUIDE_HTML,
    author: 'Boise Remodeling Co',
    hubSlug: 'treasure-valley-locations',
    guideType: 'master',
    tags: ['treasure valley', 'locations', 'idaho'],
    publishedAt: '2026-05-01',
    quickAnswer: TV_QUICK_ANSWER,
    keyTakeaways: TV_TAKEAWAYS,
    faqs: [
      {
        question: 'What cities does Boise Remodeling Co serve?',
        answer:
          'We serve Boise, Meridian, Eagle, Kuna, Star, Middleton, Nampa, and Caldwell throughout Ada and Canyon Counties.',
      },
      {
        question: 'Where are remodeling permits processed?',
        answer:
          'Most Boise-area projects use Ada County processes; Nampa, Middleton, and Caldwell are in Canyon County with separate portals and timelines.',
      },
      {
        question: 'What remodeling services do you offer?',
        answer:
          'Kitchen remodels, bathroom remodels, whole-home renovations, room additions, and ADU/guest house design-build.',
      },
      {
        question: 'How do I find remodeling costs for my city?',
        answer: 'Start with our Boise Remodeling Cost Guide and city-specific service pages linked from this hub.',
      },
      {
        question: 'Do you work in Eagle and Hidden Springs?',
        answer: 'Yes - we plan HOA review time for architectural approvals in many Eagle neighborhoods.',
      },
      {
        question: 'Is Meridian in Ada County?',
        answer: 'Yes. Meridian is in Ada County for most residential permit paths we coordinate.',
      },
      {
        question: 'What is design-build remodeling?',
        answer: 'One contract covers design, permits, and construction with a single accountable team.',
      },
      {
        question: 'How do I compare remodeling contractors?',
        answer: 'Use written scope, local permit experience, and aligned allowances - not price alone.',
      },
      {
        question: 'Can I remodel before selling?',
        answer: 'Target updates that match neighborhood comps; avoid over-improving for the street.',
      },
      {
        question: 'What about ADUs in Boise?',
        answer: 'ADUs are permitted under local rules; feasibility depends on lot, utilities, and zoning.',
      },
      {
        question: 'How long do valley remodels take?',
        answer: 'Kitchens often 2–4 months total; additions and whole-home programs can run much longer.',
      },
      {
        question: 'Do you offer free estimates?',
        answer: 'We offer in-home consultations and planning ranges; firm pricing follows defined scope.',
      },
      {
        question: 'What neighborhoods do you know best?',
        answer: 'North End, Boise Bench, Harris Ranch, Eagle, Meridian subdivisions, and growing Kuna/Star communities.',
      },
      {
        question: 'Are materials included in quotes?',
        answer: 'Our contracts specify material allowances and selections; appliances are often client-supplied for kitchens.',
      },
      {
        question: 'How do I start a project?',
        answer: 'Contact us or use the online estimator, then schedule an in-home visit.',
      },
    ],
    relatedLinks: [
      { url: '/guides/boise-remodeling-guide' },
      { url: '/guides/boise-remodeling-cost-guide' },
      { url: '/areas' },
    ],
    primaryKeyword: 'treasure valley remodeling',
  },
  {
    slug: 'boise-remodeling-guide',
    title: 'Boise Remodeling Guide',
    seoTitle: 'Boise Remodeling Guide | Neighborhoods & Services',
    metaDescription:
      'Remodeling in Boise: North End, Bench, Harris Ranch, costs, permits, and design-build services for kitchens, baths, whole-home, and additions.',
    excerpt:
      'Local guide to remodeling in Boise - neighborhood housing types, costs, and city-specific service links.',
    content: BOISE_GUIDE_HTML,
    author: 'Boise Remodeling Co',
    hubSlug: 'treasure-valley-locations',
    guideType: 'location',
    tags: ['boise', 'north end', 'bench'],
    publishedAt: '2026-05-01',
    quickAnswer: BOISE_QUICK_ANSWER,
    keyTakeaways: BOISE_TAKEAWAYS,
    faqs: [
      {
        question: 'Do you remodel homes in the North End?',
        answer:
          'Yes. We regularly work in the North End and Boise Bench with layouts suited to older footprints and electrical upgrades.',
      },
      {
        question: 'How much does a kitchen remodel cost in Boise?',
        answer:
          'Most full kitchen remodels plan between roughly $37,000 and $110,000+ depending on layout and cabinetry - see our cost guide for detail.',
      },
      {
        question: 'What Boise neighborhoods do you serve?',
        answer: 'North End, Bench, Harris Ranch, East Boise, and surrounding Ada County communities.',
      },
      {
        question: 'Does Boise use Ada County permits?',
        answer: 'Most residential remodel permits route through Ada County or city building departments depending on address.',
      },
      {
        question: 'Can you open up a ranch kitchen on the Bench?',
        answer: 'Yes - when structure allows, we design open kitchen/family layouts with proper beams and permits.',
      },
      {
        question: 'Do you build primary suite additions in Boise?',
        answer: 'Yes - room additions and second stories are scoped through our addition design-build team.',
      },
      {
        question: 'How do I budget a Boise remodel?',
        answer: 'Use our cost guide and room-specific articles, then schedule a consultation for written scope.',
      },
      {
        question: 'Do you coordinate design and construction?',
        answer: 'Yes - we are a design-build remodeler with in-house permitting support.',
      },
    ],
    linkedCities: ['boise'],
    relatedLinks: [
      { url: '/guides/treasure-valley-remodeling-guide' },
      { url: '/areas/boise' },
      { url: '/services/kitchen-remodel/boise' },
    ],
    primaryKeyword: 'boise remodeling',
  },
  {
    slug: 'boise-adu-guide',
    title: 'Boise ADU Guide: Rules, Costs & Building a Second Unit',
    seoTitle: 'Boise ADU Guide | Rules, Costs & Permits',
    metaDescription:
      'Boise ADU guide: zoning rules, size limits, costs ($90k-$300k+), permits, and attached vs detached vs garage conversion for Treasure Valley lots.',
    excerpt:
      'Everything Treasure Valley homeowners need to plan an accessory dwelling unit: Boise zoning rules, realistic costs, permits, and design choices.',
    content: BOISE_ADU_GUIDE_HTML,
    author: 'Boise Remodeling Co',
    hubSlug: 'home-additions',
    guideType: 'hub-pillar',
    tags: ['adu', 'guest house', 'boise', 'addition'],
    publishedAt: '2026-06-10',
    quickAnswer: BOISE_ADU_GUIDE_QUICK_ANSWER,
    keyTakeaways: BOISE_ADU_GUIDE_TAKEAWAYS,
    faqs: BOISE_ADU_GUIDE_FAQS,
    linkedClusterSlugs: ['adu-guide-boise', 'garage-conversions', 'multigenerational-living-remodels'],
    linkedServices: ['adu'],
    linkedCities: ['boise', 'meridian', 'eagle', 'nampa'],
    relatedLinks: [
      { url: '/services/adu', anchor: 'ADU conversions' },
      { url: '/guides/boise-home-addition-guide' },
      { url: '/guides/boise-remodeling-cost-guide' },
      { url: '/resources/ada-canyon-permit-flow' },
    ],
    primaryKeyword: 'boise adu guide',
  },
  ...ALL_HUB_PILLARS,
  ...LOCATION_GUIDES,
];

export function getGuideBySlug(slug: string): GuidePageData | undefined {
  return GUIDE_PAGES.find((g) => g.slug === slug);
}
