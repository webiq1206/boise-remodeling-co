import type { LandingSection } from '@/components/seo/LandingPageTemplate';
import type { FAQItem } from '../seoContent';

/**
 * ADU and additions ownership inside the P5 Home Co family (owner decision,
 * 31 October 2026):
 *   - Boise Construction Co owns NEW detached ADUs and STRUCTURAL additions
 *     (a new footprint, second stories).
 *   - Boise Remodeling Co owns interior remodels, attached ADU conversions
 *     (garage, basement, attic) and work within the existing footprint.
 *
 * /services/adu and /services/room-addition keep their URLs (747 and 2,019
 * Search Console impressions) and become the remodeling side of that split,
 * each with one followed handoff link to the Construction page that owns the
 * rest. Every fact below already appears elsewhere in this repository: the
 * ADU guide, the ADU and addition cost posts, the bedroom-additions post and
 * the service FAQs. Nothing here is new pricing.
 */

export const CONSTRUCTION_ADU_URL = 'https://boiseconstruction.co/services/adu';
export const CONSTRUCTION_ADDITIONS_URL = 'https://boiseconstruction.co/services/home-additions';

interface OwnershipPage {
  /** Conversion and bump-out imagery, so the page does not open on a detached build. */
  images?: { hero: string; heroAlt: string; breather?: string };
  overview: string;
  inclusions: string[];
  timeline: string;
  sections: LandingSection[];
  faqs: FAQItem[];
}

export const ADU_CONVERSION_PAGE: OwnershipPage = {
  images: {
    hero: '/images/blog/multigenerational-living-remodels.webp',
    heroAlt: 'Living area with a kitchenette, a sofa and a doorway to a bedroom',
    breather: '/images/blog/garage-conversions.webp',
  },
  overview:
    'Boise Remodeling Co turns a garage, a basement or an attached wing into an accessory dwelling unit: a self-contained place for family, guests or a long-term tenant, built inside the structure you already own. Design, permits and construction run under one written scope with one design-build team.',
  inclusions: [
    'Feasibility review of the garage, basement or attached space',
    'Egress, insulation and moisture control for a livable unit',
    'Kitchenette and bathroom fit-out with plumbing and electrical',
    'A utility plan: shared lines sized correctly, and a panel evaluation',
    'Permit coordination through final inspection',
  ],
  timeline:
    'Conversion timelines depend on the space, the utility plan and plan review. We set yours in the written scope after the free in-home visit.',
  sections: [
    {
      heading: 'Garage, basement and attached ADU conversions',
      paragraphs: [
        'A garage conversion reuses the existing foundation and shell, which is why it usually costs less than building new. As of 2026, garage conversions in the Boise area typically plan $90,000 to $180,000, and attached ADUs and basement conversions plan $120,000 to $250,000. The tradeoff with a garage is the storage and parking you give up.',
        'These are planning ranges, not bids. The utility plan and the condition of the space drive a conversion budget, which is why feasibility comes first in our process.',
      ],
      links: [
        { label: 'Garage conversions: what to plan for', href: '/blog/garage-conversions' },
        { label: 'Basement finishing in Boise', href: '/blog/basement-finishing-boise' },
        { label: 'Boise ADU costs (2026)', href: '/blog/adu-cost-boise' },
      ],
    },
    {
      heading: 'What to check before you convert',
      paragraphs: [
        'Boise generally allows ADUs up to 900 square feet under its current zoning code, though setbacks, lot coverage and existing structures often set the practical limit. Every Treasure Valley jurisdiction requires a permit for an ADU, and we confirm the current standards for your address at the start of every project.',
        'Many units share the main house water and sewer with properly sized lines; the electrical service usually needs a panel evaluation. Renting the unit is often possible, subject to local zoning and HOA rules. A permitted ADU adds appraisable square footage, while an unpermitted one creates disclosure and insurance problems at sale.',
      ],
      links: [{ label: 'Boise ADU guide: rules, costs and timelines', href: '/guides/boise-adu-guide' }],
    },
    {
      heading: 'New detached ADUs are built by Boise Construction Co',
      paragraphs: [
        'A new detached ADU or guest house needs its own foundation, structure and utility runs, the same permit path as other new construction, so it is built by Boise Construction Co, our sibling company in the P5 Home Co family. Boise ADU Co projects currently run through Boise Construction Co as well.',
      ],
      links: [{ label: 'New detached ADUs at Boise Construction Co', href: CONSTRUCTION_ADU_URL }],
    },
  ],
  faqs: [
    {
      question: 'Do I need a permit to convert a garage or basement into an ADU?',
      answer:
        'Yes. ADUs require permits in all Treasure Valley jurisdictions, and requirements vary by city and lot. We handle permitting as part of the design-build scope.',
    },
    {
      question: 'Is a garage conversion cheaper than building a detached ADU?',
      answer:
        'Usually yes. Garage conversions reuse the existing foundation and shell, typically planning $90,000 to $180,000, versus $180,000 to $300,000 or more for a detached new build. The tradeoff is losing garage storage and parking.',
    },
    {
      question: 'How big can an ADU be in Boise?',
      answer:
        'Boise generally allows ADUs up to 900 square feet under its current zoning code, though setbacks and lot coverage on your specific lot often set the practical limit. We confirm the buildable envelope during feasibility.',
    },
    {
      question: 'Does a converted ADU need separate utilities?',
      answer:
        'It depends on the city and the design. Many units share the main house water and sewer with properly sized lines; electrical usually needs a panel evaluation. We settle the utility plan during design, before pricing is final.',
    },
    {
      question: 'Who builds a new detached ADU or guest house?',
      answer:
        'Boise Construction Co, our sibling company in the P5 Home Co family. Boise Remodeling Co converts space inside the structure you already have.',
    },
  ],
};

export const ROOM_ADDITION_PAGE: OwnershipPage = {
  overview:
    'Boise Remodeling Co designs and builds additions that work with the house you already have: bump-outs that extend a kitchen, bathroom or great room a few feet, and conversions of existing space into new rooms. Roof lines, siding and interior trim are planned to blend, not bolt on, and one design-build team carries the scope from feasibility to final inspection.',
  inclusions: [
    'Feasibility, setback and structural review',
    'Bump-out framing, sometimes cantilevered to avoid a full foundation',
    'Roof tie-in and exterior finish matched to your home',
    'Interior finish, HVAC and electrical tied into the existing rooms',
    'Permit and inspection coordination',
  ],
  timeline:
    'Timelines depend on the size of the bump-out or conversion, engineering and plan review. We set yours in the written scope after the free in-home visit.',
  sections: [
    {
      heading: 'Bump-outs and conversions we build',
      paragraphs: [
        'Extending a kitchen or bathroom a few feet is the most economical way to gain space, sometimes cantilevered to avoid a full foundation. A great room or kitchen bump-out opens a cramped floor plan, and converting existing space such as a garage or basement is the most affordable way to add a bedroom. A legal bedroom needs egress, a window, a minimum size and usually a closet.',
        'As of 2026, room additions in the Boise area commonly plan $80,000 to $250,000 or more, and single-room bump-outs sit at the lower end of that range. These are planning ranges, not bids; we confirm yours in a written scope after the free in-home visit.',
      ],
      links: [
        { label: 'Boise home addition costs (2026)', href: '/blog/home-addition-cost-boise' },
        { label: 'Bedroom additions in Boise', href: '/blog/bedroom-additions' },
        { label: 'Boise home addition guide', href: '/guides/boise-home-addition-guide' },
      ],
    },
    {
      heading: 'Matching the house you already have',
      paragraphs: [
        'Roof lines, siding and interior trim are planned so the new space looks original to the home. Additions require permits in Ada and Canyon County, and we handle permitting as part of the scope. Engineering and plan review add 6 to 12 weeks up front, and HOA design review in communities like Eagle can add more.',
        'Most of the work happens outside the existing rooms until the tie-in, so many families stay home during the project; we sequence the breakthrough to keep the days your living space is open to a minimum.',
      ],
    },
    {
      heading: 'New footprints and second stories are built by Boise Construction Co',
      paragraphs: [
        'An addition that needs a new foundation footprint, and every second-story addition, is structural new construction with the permit path that comes with it. Those projects are built by Boise Construction Co, our sibling company in the P5 Home Co family.',
      ],
      links: [{ label: 'Home additions at Boise Construction Co', href: CONSTRUCTION_ADDITIONS_URL }],
    },
  ],
  faqs: [
    {
      question: 'Do I need a permit for a room addition or bump-out in Idaho?',
      answer: 'Yes. Additions require permits in Ada and Canyon County. We handle permitting as part of our scope.',
    },
    {
      question: 'Will a bump-out match my existing home?',
      answer: 'That is a core part of our design process: roof lines, siding and interior trim are planned to blend, not bolt on.',
    },
    {
      question: 'How much does a room addition cost in Boise?',
      answer:
        'Most Treasure Valley additions plan $80,000 to $250,000 or more depending on size, foundation work, and whether bathrooms or kitchens are included. Single-room bump-outs sit at the lower end.',
    },
    {
      question: 'Can I stay in my home during an addition?',
      answer:
        'Usually yes. Most of the work happens outside the existing envelope until tie-in, and we sequence the breakthrough phase to minimize the days your living space is open.',
    },
    {
      question: 'Who builds second-story and new-footprint additions?',
      answer:
        'Boise Construction Co, our sibling company in the P5 Home Co family. Boise Remodeling Co handles bump-outs and additions within the existing footprint.',
    },
  ],
};
