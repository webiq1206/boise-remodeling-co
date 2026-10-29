import type { LandingSection } from '@/components/seo/LandingPageTemplate';
import { SITE_CONFIG } from '@/shared/siteConfig';

/**
 * Parent URL only: /services/bathroom-remodel.
 * City pages keep their own intros, cost bands, and timelines.
 * Phase 7 / R-3: keyword-first copy, no "near me" phrases.
 */

export const BATHROOM_NEAR_ME_TITLE = 'Bathroom Remodeling in Boise | Boise Remodeling Co';

export const BATHROOM_NEAR_ME_DESCRIPTION =
  'Bathroom remodeling in Boise and the Treasure Valley. Design-build bath remodels with a free in-home consultation and a written scope.';

export const BATHROOM_NEAR_ME_H1 = 'Bathroom remodeling in Boise and the Treasure Valley';

export const BATHROOM_NEAR_ME_KEYWORD = 'bathroom remodeling in Boise';

const BATHROOM_NEAR_ME_FIRST_SENTENCE =
  'We plan primary baths, guest baths and powder rooms with a written scope before demolition, waterproofing and plumbing details defined in writing, and a free in-home consultation to start.';

export const BATHROOM_NEAR_ME_OVERVIEW = [
  BATHROOM_NEAR_ME_FIRST_SENTENCE,
  'Boise Remodeling Co remodels bathrooms across Ada and Canyon County with design-build accountability from layout through tile and fixtures. Share photos or plans, get a written scope before demolition, and keep one project manager through the walkthrough.',
  `Request a free in-home consultation or call ${SITE_CONFIG.phone}.`,
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
      'We review every detail with you before sign-off. Two-year written workmanship guarantee on our labor.',
  },
];

export const BATHROOM_NEAR_ME_FAQS: { question: string; answer: string }[] = [
  {
    question: 'What does a bathroom remodel include?',
    answer:
      'Vanity, shower or tub planning, tile and flooring guidance, ventilation and lighting improvements, and plumbing or electrical updates as scoped. Exact inclusions are written into your proposal.',
  },
  {
    question: 'Do you serve Middleton?',
    answer:
      'Yes. See the Middleton bathroom remodel page, or request a free in-home consultation from the main bathroom service page.',
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
      'Yes. We remodel bathrooms throughout the Treasure Valley and handle permits in-house for the jurisdiction that applies to your address.',
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
      'Design, estimating, permitting and construction stay under one contract and one accountable team, so layout and waterproofing decisions do not get lost between separate vendors.',
      'You get a written scope before construction begins, clear allowances for selections, and a two-year workmanship guarantee when the project is complete.',
    ],
  },
];
