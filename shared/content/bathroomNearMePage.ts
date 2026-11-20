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

const BATHROOM_NEAR_ME_FIRST_SENTENCE =
  'We plan primary baths, guest baths and powder rooms with a written scope before demolition, waterproofing and plumbing details defined in writing, and a free in-home consultation to start.';

export const BATHROOM_NEAR_ME_OVERVIEW = [
  BATHROOM_NEAR_ME_FIRST_SENTENCE,
  'Boise Remodeling Co remodels bathrooms across Ada and Canyon County with design-build accountability from layout through tile and fixtures. Share photos or plans, get a written scope before demolition, and keep one project manager through the walkthrough.',
  // SEO audit SW-6: no phone number in a hero paragraph; the phone sits with the CTAs.
  'Request a free in-home consultation.',
].join(' ');

export const BATHROOM_NEAR_ME_TIMELINE =
  'Most bathroom remodels run 3 to 6 weeks from permit approval, depending on layout changes and custom material lead times.';

export const BATHROOM_NEAR_ME_PROCESS: { title: string; description: string }[] = [
  {
    title: 'Consultation',
    description:
      'We assess your bath, discuss storage and accessibility needs, and confirm a planning path at the free in-home visit.',
  },
  {
    title: 'Selections and scope',
    description: 'Finishes and fixtures are documented before demolition.',
  },
  {
    title: 'Build',
    description: 'Licensed trades coordinate waterproofing, tile, and trim with weekly updates.',
  },
  {
    title: 'Final walkthrough',
    description:
      'We review every detail with you before sign-off. One-year written workmanship guarantee on our labor, from documented Final Completion.',
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
      'Share what you know (photos, goals, must-haves). We review and confirm a planning path at the free in-home visit, then provide a written scope before any price.',
  },
  {
    question: 'How long does a typical bath remodel take?',
    answer: BATHROOM_NEAR_ME_TIMELINE,
  },
  {
    question: 'Can you remodel a bathroom without moving plumbing?',
    answer:
      'Yes. Cosmetic and mid-scope updates can keep existing plumbing locations. We will recommend layout changes only when they add real value.',
  },
  {
    question: 'Do you work in both Ada and Canyon County?',
    answer:
      'Yes. We remodel bathrooms in Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, and Caldwell, across Ada County and Canyon County, and we handle permits in-house for the jurisdiction that applies to your address.',
  },
];

export const BATHROOM_NEAR_ME_SECTIONS: LandingSection[] = [
  {
    heading: 'What a bathroom remodel covers',
    paragraphs: [
      'Primary baths, guest baths and powder rooms get a written scope covering waterproofing, plumbing, tile, vanity and fixtures before demolition starts.',
      'We protect adjacent rooms during workdays and send a written update every Friday while construction is underway.',
    ],
  },
  {
    heading: 'Why design-build for your bathroom remodel',
    paragraphs: [
      'Design, estimating, permitting and construction stay with one accountable company and one point of contact for your project, so layout and waterproofing decisions do not get lost between separate vendors.',
      'You get a written scope before construction begins, clear allowances for selections, and a one-year workmanship guarantee from documented Final Completion.',
    ],
  },
];
