/**
 * /areas/garden-city copy. The visible FAQ and the FAQPage JSON-LD both read
 * GARDEN_CITY_FAQS, so the two cannot drift.
 */
export const GARDEN_CITY_TITLE = 'Home Remodeling in Garden City, ID';

export const GARDEN_CITY_DESCRIPTION =
  'Home remodeling in Garden City, Idaho, from Riverside Village to Chinden: kitchens, baths and additions by one design-build team. Call or text to start.';

export const GARDEN_CITY_H1 = 'Home remodeling in Garden City, Idaho';

export const GARDEN_CITY_OVERVIEW =
  'Get a written scope and a free in-home visit for your Garden City remodel, whether you are updating a kitchen in an established riverside home or planning an addition near the Boise River Greenbelt. Boise Remodeling Co, a P5 Home Co company, is one design-build team from that first visit to the final walkthrough.';

export const GARDEN_CITY_LOCAL_NOTE =
  'We serve Garden City homeowners across Riverside Village, The Plantation, the Marigold and Glenwood area, and the Chinden corridor. Confirm the permitting authority for the project address before applying.';

export const GARDEN_CITY_FAQS: Array<{ question: string; answer: string }> = [
  {
    question: 'What remodeling services do you offer?',
    answer:
      'Remodeled kitchens and baths, whole-home renovations and room additions are our core Garden City work, each run design-build so one team answers for design, permitting and the build.',
  },
  {
    question: 'Are you a registered contractor and insured?',
    answer: 'Yes. We are an Idaho Registered Contractor #8381215 and insured.',
  },
  {
    question: 'How do I start a project?',
    answer:
      'Call or text (208) 477-1169, or ask for a free in-home visit on the website. You get a written scope before construction begins.',
  },
  {
    question: 'Do you serve Garden City, Idaho?',
    answer:
      'Yes. Garden City is its own city in Ada County, nearly surrounded by Boise, and it sits inside our Treasure Valley service area. We remodel kitchens, bathrooms, whole homes and additions in Riverside Village, The Plantation, the Marigold and Glenwood area, and along the Chinden corridor.',
  },
  {
    question: 'Do Garden City remodels need a building permit?',
    answer:
      'Building permits for Garden City addresses go through Garden City Development Services, not Boise. Trade permits for plumbing, electrical and mechanical work go through the State of Idaho. Which parts of your remodel need a permit, and any floodplain review for riverside lots, should be confirmed with the city. We flag those triggers during design.',
  },
  {
    question: 'Is Garden City part of Boise?',
    answer:
      'No. Garden City is its own city in Ada County, nearly surrounded by Boise, with its own city government and permit office. We serve Garden City addresses the same way we serve the rest of the valley.',
  },
];

/** Parent service pages only. No guest-house or ADU link, and no city spokes. */
export const GARDEN_CITY_SERVICE_LINKS = [
  { label: 'Kitchen remodeling', href: '/services/kitchen-remodel' },
  { label: 'Bathroom remodeling', href: '/services/bathroom-remodel' },
  { label: 'Whole-home remodeling', href: '/services/whole-home-remodel' },
  { label: 'Room additions and bump-outs', href: '/services/room-addition' },
  { label: 'Basement remodeling', href: '/services/basement-remodel' },
  { label: 'Outdoor living and decks', href: '/services/outdoor-living' },
  { label: 'Aging-in-place remodeling', href: '/services/aging-in-place' },
] as const;
