/**
 * Approved P5 visibility copy (Priya brief, Sam re-light 3, 2026-11-07).
 * Titles and metas live in lib/brand-page-metadata.ts. This module is the
 * answer text and the FAQ pairs those pages render and mark up together.
 */

export const ADU_QUOTE_URL = 'https://p5homeco.com/quote/adu';
export const ADU_QUOTE_LABEL = 'p5homeco.com/quote/adu';

export interface VisibilityFaq {
  question: string;
  answer: string;
}

export const AEO = {
  home:
    'Get your kitchen, bath or whole-home remodel planned, permitted and built by one team. Boise Remodeling Co is a design-build home remodeling contractor for Boise and the Treasure Valley, so you work with one contract and one project manager. You start with a free in-home visit, a written scope before any price, and a written workmanship warranty.',
  eagle:
    'Keep your Eagle remodel\u2019s design and budget decisions together with one design-build team. Boise Remodeling Co serves Eagle, Idaho, planning kitchen, bathroom and whole-home remodels with design, permits and construction under one contract. Start with a free in-home visit, then receive a written scope and workmanship guarantee.',
  about:
    'Know what your remodel includes before construction starts. Boise Remodeling Co is a Boise design-build remodeler and part of P5 Home Co. Kitchens, bathrooms and whole homes have design, permits and construction under one contract, with a written scope, dust barriers and floor protection described in your scope, written change orders and a written workmanship guarantee.',
  kuna:
    'Plan your Kuna kitchen, bathroom or whole-home remodel with one accountable team. Boise Remodeling Co is a design-build contractor, handling design, permits and construction under one contract and one project manager. Start with a free in-home visit, then get a written scope and workmanship guarantee before work begins.',
  bathroom:
    'Plan a bathroom that works for your mornings before demolition begins. Boise Remodeling Co remodels primary baths, guest baths and powder rooms across Boise and the Treasure Valley. Shower, tile, vanity, ventilation, lighting and plumbing are planned in a written scope. Your project timeline is confirmed with your quote.',
  areas:
    'Find the right local starting point for your remodel. Boise Remodeling Co serves Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton and Caldwell. Pick your city to see local permit notes and available services. Start with a free in-home visit, followed by a written scope before the work is priced.',
  services:
    'Plan your remodel with design, permits and construction coordinated. Boise Remodeling Co offers kitchen, bathroom and whole-home remodels across Boise and the Treasure Valley. Each service runs under one design-build contract. Start with a free in-home visit, then receive a written scope before the work is priced.',
  testimonials:
    'Find design ideas that fit your Treasure Valley home, from kitchen and bathroom layouts to cabinetry, tile, lighting and finishes. Bring the ideas you like to a free in-home visit with Boise Remodeling Co. We discuss what fits your space, then follow up with a written scope before any price.',
  nampa:
    'Keep your Nampa remodel\u2019s design and construction connected. Boise Remodeling Co is a design-build remodeling contractor serving Nampa, Idaho. We remodel kitchens, bathrooms and whole homes under one contract, with Canyon County permitting handled by our team. Start with a free in-home visit, followed by a written scope.',
  blog:
    'Plan your remodel with fewer surprises. The Boise Remodeling Co blog covers budgeting, project timelines, permits and design-build planning for Treasure Valley homeowners. When you are ready, a free in-home visit turns your plan into a written scope, and our team handles permits for Ada and Canyon County addresses.',
  guides:
    'Boise Remodeling Co guides help Treasure Valley homeowners plan kitchens, bathrooms, additions and outdoor living, compare costs and ROI, and choose the right contractor. Each guide is written for Boise area homes and local permit rules. When you are ready, a free in-home visit turns your plan into a written scope.',
  contact:
    'Call or text us about your project to start a remodel with Boise Remodeling Co. Tell us about your kitchen, bathroom or whole-home plans, and we schedule a free in-home visit to walk the space with you. You then get a written scope before any price, across Boise and the Treasure Valley.',
  meridian:
    'Plan your Meridian remodel with one accountable team. Boise Remodeling Co is a design-build remodeling contractor serving Meridian, Idaho. Kitchens, bathrooms and whole homes have design, permits and construction under one contract and one project manager. Start with a free in-home visit, followed by a written scope and workmanship guarantee.',
  bathroomGuide:
    'This guide helps you plan a bathroom remodel in Boise, from choosing a walk-in shower or tub to layouts, aging-in-place features, permits and realistic Treasure Valley cost ranges. Use it to set priorities before you talk to a contractor, then bring your notes to a free in-home visit for a written scope.',
  kitchenGuide:
    'This guide helps you plan a kitchen remodel in Boise and the Treasure Valley: picking a layout, choosing cabinets, setting a realistic timeline, weighing ROI and understanding design-build. Read it before you meet a contractor, then book a free in-home visit with Boise Remodeling Co to turn your plan into a written scope.',
  adu:
    'Start your ADU request with the right P5 team. Boise ADU Co is our sister company and part of P5 Home Co. Tell the team about your ADU or guest house through the P5 intake page, with a written scope before the work is priced.',
} as const;

export const HOME_NEW_FAQS: VisibilityFaq[] = [
  {
    question: 'How do I choose a home remodeling contractor in Boise?',
    answer:
      'Look for a contractor who writes the scope before quoting, explains permits and puts the warranty in writing. Boise Remodeling Co starts with a written scope and handles permitting as part of the project.',
  },
  {
    question: 'Do you handle room additions and ADUs too?',
    answer:
      'We handle kitchens, bathrooms and whole-home remodels. For an addition or ADU, call or text P5 Home Co so your request reaches the right team.',
  },
];

export const AREA_AEO: Record<string, string> = {
  eagle: AEO.eagle,
  kuna: AEO.kuna,
  nampa: AEO.nampa,
  meridian: AEO.meridian,
};

export const AREA_NEW_FAQS: Record<string, VisibilityFaq[]> = {
  eagle: [
    {
      question: 'What happens at the free in-home visit in Eagle?',
      answer:
        'We walk the space with you and talk through your goals and priorities, then follow up with a written scope. The first figures are budget ranges, not quotes, so you can plan before you commit.',
    },
    {
      question: 'Who handles permits for an Eagle remodel?',
      answer:
        'We do. Permitting for Ada and Canyon County addresses, including Eagle, is part of the same design-build contract.',
    },
  ],
  kuna: [
    {
      question: 'Do you handle kitchen and bathroom remodels in Kuna?',
      answer:
        'Yes. We remodel kitchens, bathrooms and whole homes across Kuna, with design, permits and construction under one contract and one project manager through the final walkthrough.',
    },
    {
      question: 'Will I get a firm price at the first visit?',
      answer:
        'The first figures are budget ranges, not quotes. After the free in-home visit you get a written scope, and the price follows once the scope is clear.',
    },
  ],
  nampa: [
    {
      question: 'Do you handle permits in Nampa?',
      answer: 'Yes. Permitting for Canyon County and Nampa addresses is part of our design-build contract.',
    },
    {
      question: 'How does a Nampa remodel start?',
      answer:
        'With a free in-home visit. We walk the space, talk through your goals, and follow up with a written scope and budget ranges.',
    },
  ],
  meridian: [
    {
      question: 'Do you remodel interiors in Meridian?',
      answer: 'Yes. Kitchens, bathrooms and whole-home interiors across Meridian, planned in one written scope.',
    },
    {
      question: 'Who pulls the permit for a Meridian remodel?',
      answer: 'We do. Permitting for Ada County addresses is part of our design-build contract.',
    },
  ],
};

export const ABOUT_FAQS: VisibilityFaq[] = [
  {
    question: 'Is Boise Remodeling Co a registered contractor?',
    answer:
      'Yes. Work is performed by P5 Home Co LLC, Idaho Registered Contractor #8381215, insured, with a certificate available on request.',
  },
  {
    question: 'What can I count on during my remodel?',
    answer:
      'A written scope before construction, dust barriers and floor protection described in your scope, written change orders only, and a written workmanship guarantee.',
  },
];

export const BATHROOM_NEW_FAQS: VisibilityFaq[] = [
  {
    question: 'How much does a bathroom remodel cost in Boise?',
    answer:
      'It depends on size, layout changes and finishes. We start with a free in-home consultation and a written scope, then price the work once the scope is clear, so the number matches the bathroom you want.',
  },
  {
    question: 'Do you waterproof showers as part of the remodel?',
    answer:
      'Yes. Waterproofing and plumbing details are defined in writing before demolition, and licensed trades coordinate waterproofing, tile and trim with progress updates.',
  },
];

export const AREAS_FAQS: VisibilityFaq[] = [
  {
    question: 'Which cities does Boise Remodeling Co serve?',
    answer: 'Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton and Caldwell, across Ada and Canyon County.',
  },
  {
    question: 'How does a remodel outside Boise start?',
    answer:
      'Every city starts with the same free in-home visit and written scope, and permitting for Ada and Canyon County addresses is handled by our team.',
  },
];

export const SERVICES_FAQS: VisibilityFaq[] = [
  {
    question: 'What remodeling services do you offer?',
    answer:
      'Kitchen, bathroom and whole-home remodels, plus bump-outs and in-footprint room additions. New-footprint builds go to Boise Construction Co. For an ADU, call or text P5 Home Co.',
  },
  {
    question: 'Is design included?',
    answer:
      'Yes. We are design-build, so design, permits and construction stay under one contract with one accountable team.',
  },
];

export const TESTIMONIALS_FAQS: VisibilityFaq[] = [
  {
    question: 'Can you build a design I found online?',
    answer:
      'Bring it to the free in-home visit. We look at your space, talk through the idea, and put what fits into a written scope before any price.',
  },
  {
    question: 'Do you help choose tile, lighting and finishes?',
    answer: 'Yes. Design is part of our design-build process, so selections are planned alongside layout and budget.',
  },
];

export const BLOG_FAQS: VisibilityFaq[] = [
  {
    question: 'Where should I start planning a remodel?',
    answer:
      'Start with your goals and a rough budget range, then book a free in-home visit to get a written scope before any price.',
  },
  {
    question: 'Do your articles cover permits?',
    answer:
      'Yes. Permits for Ada and Canyon County addresses come up often, and our team handles them on every project we build.',
  },
];

export const GUIDES_FAQS: VisibilityFaq[] = [
  {
    question: 'Which guide should I read first?',
    answer:
      'Start with the cost guide if budget is the question, or the kitchen or bathroom guide if you already know the room.',
  },
  {
    question: 'Are the guides specific to Boise?',
    answer: 'Yes. They are written for Treasure Valley homes and include local city resources.',
  },
];

export const CONTACT_NEW_FAQS: VisibilityFaq[] = [
  {
    question: 'What should I share when I reach out?',
    answer:
      'The room, what is not working today, a rough budget range and any photos. That helps us make the free in-home visit useful.',
  },
  {
    question: 'Will someone come to my home?',
    answer: 'Yes. The first step is a free in-home visit where we walk the space with you.',
  },
];

export const BATHROOM_GUIDE_NEW_FAQS: VisibilityFaq[] = [
  {
    question: 'Does a Boise bathroom remodel need a permit?',
    answer:
      'Plumbing, electrical or layout changes usually do. Boise Remodeling Co handles permitting for Ada and Canyon County addresses.',
  },
  {
    question: 'Can I plan for aging in place?',
    answer: 'Yes. The guide covers aging-in-place choices so the bathroom keeps working for you over time.',
  },
];

export const KITCHEN_GUIDE_NEW_FAQS: VisibilityFaq[] = [
  {
    question: 'Should I hire design-build for a kitchen?',
    answer:
      'Design-build keeps design, permits and construction under one contract, so layout and budget decisions stay connected.',
  },
  {
    question: 'When should I book an in-home visit?',
    answer: 'The visit is free. We discuss your goals, then follow up with a written scope.',
  },
];

export const ADU_FAQS: VisibilityFaq[] = [
  {
    question: 'Does Boise Remodeling Co build ADUs?',
    answer:
      'No. ADUs are built by our sister company Boise ADU Co, part of P5 Home Co. Start your ADU request at p5homeco.com/quote/adu.',
  },
  {
    question: 'How do I start an ADU project?',
    answer:
      'Send one request at p5homeco.com/quote/adu. It reaches Boise ADU Co, and you get a written scope before any price.',
  },
];

export const GUIDE_AEO: Record<string, string> = {
  'boise-bathroom-remodeling-guide': AEO.bathroomGuide,
  'boise-kitchen-remodeling-guide': AEO.kitchenGuide,
};
