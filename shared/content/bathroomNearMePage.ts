import type { LandingSection } from '@/components/seo/LandingPageTemplate';

/**
 * Parent URL only: /services/bathroom-remodel.
 * City pages keep their own intros, cost bands, and timelines.
 * Phase 7 / R-3: keyword-first copy, no "near me" phrases.
 */

// SEO audit REM-T1 (20 November 2026): the hub is the Treasure Valley page and
// /services/bathroom-remodel/boise owns "bathroom remodeling in Boise".
export const BATHROOM_NEAR_ME_TITLE = 'Treasure Valley bathroom remodeling | Boise Remodeling Co';

export const BATHROOM_NEAR_ME_DESCRIPTION =
  'Bathroom remodeling across the Treasure Valley: showers, tile, waterproofing and permits under one written scope, with a free in-home visit to start.';

export const BATHROOM_NEAR_ME_H1 = 'Bathroom remodeling in Boise and the Treasure Valley';

export const BATHROOM_NEAR_ME_KEYWORD = 'bathroom remodeling in Boise';

export const BATHROOM_NEAR_ME_OVERVIEW =
  'Boise Remodeling Co plans bathroom remodels in Boise and the Treasure Valley around one written scope for layout, plumbing, waterproofing, tile, fixtures, ventilation, lighting, allowances, and finish decisions. Share photos, goals, and must-haves so the team can review scope boundaries and likely disruption before discussing next steps.';

// Parent-route copy stays separate from the existing city-page content.
export const BATHROOM_NEAR_ME_BENEFITS = [
  'Layout, plumbing and waterproofing considered together',
  'Written scope covering the work and finish selections',
  'Allowances and scope boundaries reviewed before construction',
  'A project-specific schedule after scope and selections are defined',
];

export const BATHROOM_NEAR_ME_INCLUSIONS = [
  'Vanity, shower, and tub planning',
  'Tile, flooring, and fixture selections guidance',
  'Ventilation and lighting improvements',
  'Plumbing and electrical updates as scoped',
  'Access, room protection, and cleanup requirements in the written scope',
];

export const BATHROOM_NEAR_ME_TIMELINE =
  'Project timing depends on layout changes, existing conditions, permit requirements, product selections, and trade coordination. The team confirms a project-specific schedule after the scope and selections are defined.';

export const BATHROOM_NEAR_ME_PROCESS: { title: string; description: string }[] = [
  {
    title: 'Consultation',
    description:
      'Share your goals, photos, and any storage or accessibility needs so we can review the bathroom and the proposed work.',
  },
  {
    title: 'Selections and scope',
    description: 'Review the layout, fixtures, finishes, allowances, and permit requirements before construction.',
  },
  {
    title: 'Build',
    description: 'The agreed scope and schedule guide demolition, trade work, waterproofing, tile, and finish installation.',
  },
  {
    title: 'Final walkthrough',
    description:
      'Review the completed scope and document any remaining items with the team.',
  },
];

export const BATHROOM_NEAR_ME_FAQS: { question: string; answer: string }[] = [
  {
    question: 'What does a bathroom remodel include?',
    answer:
      'Vanity, shower or tub planning, tile and flooring guidance, ventilation and lighting improvements, and plumbing or electrical updates as scoped. Exact inclusions are written into your proposal.',
  },
  {
    question: 'Which cities do you serve?',
    answer:
      'Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, and Caldwell, across Ada County and Canyon County.',
  },
  {
    question: 'How does the quote process work?',
    answer:
      'Share photos, goals, and must-haves. The online estimator can give you a preliminary total range with scope organized by division. A firm written proposal follows a site visit, measurements, and your selections.',
  },
  {
    question: 'How long does a typical bath remodel take?',
    answer: BATHROOM_NEAR_ME_TIMELINE,
  },
  {
    question: 'Can you remodel a bathroom without moving plumbing?',
    answer:
      'Some updates can keep fixtures in their existing locations. The team reviews the layout, plumbing condition, and proposed work before confirming what can stay.',
  },
  {
    question: 'Do you work in both Ada and Canyon County?',
    answer:
      'We serve Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, and Caldwell across Ada County and Canyon County. Confirm the property address and scope with the team. Permit requirements depend on the work and the city or county jurisdiction.',
  },
];

export const BATHROOM_NEAR_ME_SECTIONS: LandingSection[] = [
  {
    heading: 'What a bathroom remodel covers',
    paragraphs: [
      'Primary baths, guest baths and powder rooms each need a scope that fits the existing room. Layout, waterproofing, plumbing, ventilation, tile, vanity, and fixtures belong in that plan.',
      'Discuss access, protection of adjacent rooms, cleanup, and how the household will manage while the bathroom is unavailable. Put agreed requirements in the written scope.',
    ],
  },
  {
    heading: 'Why design-build for your bathroom remodel',
    paragraphs: [
      'Reviewing design and construction together helps connect the layout you want with the work it requires. Moving a shower, for example, can affect plumbing, waterproofing, tile, and the schedule.',
      'Use the written proposal to review inclusions, allowances, exclusions, and selection decisions before construction. The online planning range is a starting point for that conversation.',
    ],
  },
];
