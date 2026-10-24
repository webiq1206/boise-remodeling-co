import type { LandingSection } from '@/components/seo/LandingPageTemplate';
import { SITE_CONFIG } from '@/shared/siteConfig';

/**
 * Parent URL only: /services/bathroom-remodel.
 * City pages keep their own intros, cost bands, and timelines.
 *
 * [VERIFY] ops week-count: do not publish a duration on this page until
 * operations confirms wording. The live "3 to 5 weeks" line is not restated.
 */

export const BATHROOM_NEAR_ME_TITLE = 'Bathroom Remodeling Near Me';

export const BATHROOM_NEAR_ME_DESCRIPTION =
  'Bathroom remodeling near me in Boise and the Treasure Valley. Design-build bath remodels with a free in-home consultation and a written scope.';

export const BATHROOM_NEAR_ME_H1 = 'Bathroom remodeling near me';

export const BATHROOM_NEAR_ME_KEYWORD = 'bathroom remodeling near me';

const BATHROOM_NEAR_ME_FIRST_SENTENCE =
  'Bathroom remodeling near me should connect you to a local design-build team that plans primary baths, guest baths, and powder rooms with a clear written scope.';

export const BATHROOM_NEAR_ME_OVERVIEW = [
  BATHROOM_NEAR_ME_FIRST_SENTENCE,
  'Bathroom remodeling near me is how many Treasure Valley homeowners start contractor research. We remodel bathrooms for Boise and nearby cities with design-build accountability from layout through tile and fixtures. Start with a free in-home consultation, share photos or plans, and get a written scope before demolition. Waterproofing and plumbing details are defined in writing.',
  `Request a free in-home consultation or call ${SITE_CONFIG.phone}.`,
].join(' ');

export const BATHROOM_NEAR_ME_TIMELINE =
  'Schedule depends on permits, material lead times, and layout changes. Your project plan will state the timeline after scope is set.';

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
      'We review every detail with you before sign-off. Written workmanship guarantee on our labor.',
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
    question: 'How does the estimate work?',
    answer:
      'Share what you know (photos, goals, must-haves). We review and confirm a planning path at the free in-home visit, then provide a written scope.',
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
      'Yes. We serve Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, Caldwell, and surrounding Treasure Valley communities.',
  },
  {
    question: 'Do I need a permit for a bathroom remodel in Idaho?',
    answer:
      'Like-for-like fixture swaps usually do not require permits. Moving plumbing, adding circuits, changing layout, or altering structure does. We confirm the permit path for your address and handle Ada or Canyon County submissions in-house.',
  },
  {
    question: 'What is a curbless shower and is it worth it?',
    answer:
      'A curbless shower has no step or threshold, which looks cleaner and works for aging-in-place. It requires recessing the floor and careful waterproofing and slope, so it is easiest to plan during a full remodel rather than as a retrofit.',
  },
  {
    question: 'How do you prevent water damage and mold in a remodeled bathroom?',
    answer:
      'Waterproofing membrane systems behind tile, correct shower slope, and properly sized ventilation are all defined in the written scope and inspected during construction. Ventilation matters in our dry climate more than most homeowners expect.',
  },
  {
    question: 'Can you make a bathroom work for aging in place without looking clinical?',
    answer:
      'Yes. Curbless entries, blocking for future grab bars, comfort-height vanities, and slip-resistant tile can be designed into a bathroom that looks like a spa, not a hospital.',
  },
];

export const BATHROOM_NEAR_ME_SECTIONS: LandingSection[] = [
  {
    heading: 'Bathroom remodel services for Boise and the Treasure Valley',
    paragraphs: [
      'Bathroom remodel near me searches usually mean you want a contractor who will own the plan, not hand you off mid-project. We handle vanity, shower, and tub planning; tile, flooring, and fixture guidance; ventilation and lighting improvements; and plumbing or electrical updates as scoped. Adjacent rooms stay protected during workdays as part of the job plan.',
    ],
  },
  {
    heading: 'What a bathroom remodel can include',
    paragraphs: [
      'Scope varies by home, but common work includes layout updates, shower or tub changes, vanity and storage upgrades, tile and flooring, lighting, ventilation, and the trade coordination those steps require. Your written scope lists what is in and what is out before build starts.',
    ],
  },
  {
    heading: 'Design-build path',
    paragraphs: [
      'As a design-build remodeler, design, estimating, permitting coordination, and construction sit with one accountable team. Selections are documented before demolition. You get weekly updates during the build and a final walkthrough before sign-off. Written workmanship guarantee on our labor.',
    ],
  },
  {
    heading: 'Cities and next steps',
    paragraphs: [
      'Dedicated bathroom remodel pages exist for Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, and Caldwell. Use the city page that matches your address for local permit notes, then book the free consult to confirm scope.',
    ],
    links: [
      { label: 'Bathroom remodel Boise', href: '/services/bathroom-remodel/boise' },
      { label: 'Bathroom remodel Middleton', href: '/services/bathroom-remodel/middleton' },
      { label: 'Bathroom remodel Meridian', href: '/services/bathroom-remodel/meridian' },
      { label: 'Bathroom remodel Eagle', href: '/services/bathroom-remodel/eagle' },
      { label: 'Bathroom remodel Nampa', href: '/services/bathroom-remodel/nampa' },
      { label: 'Bathroom remodel Kuna', href: '/services/bathroom-remodel/kuna' },
      { label: 'Bathroom remodel Star', href: '/services/bathroom-remodel/star' },
      { label: 'Bathroom remodel Caldwell', href: '/services/bathroom-remodel/caldwell' },
      { label: 'Services', href: '/services' },
      { label: 'Estimate', href: '/estimate' },
      { label: 'Bathroom remodeling guide', href: '/guides/boise-bathroom-remodeling-guide' },
      { label: 'About', href: '/about' },
    ],
  },
];
