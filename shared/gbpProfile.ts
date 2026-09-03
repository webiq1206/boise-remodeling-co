/**
 * Google Business Profile copy and configuration.
 * Single source of truth for GBP fields, services, products, Q&A, posts, and sync data.
 * Operator checklists: local-seo-audit/02-gbp-plan.md
 */

import { SITE_CONFIG } from '@/shared/siteConfig';

const SITE = SITE_CONFIG.siteUrl.replace(/\/$/, '');

/** Canonical NAP - use verbatim on GBP and all citations. */
export const GBP_NAP = {
  name: 'Boise Remodeling Co',
  /**
   * The registered legal entity behind this DBA. Google verifies a business
   * name against the entity on record, and this block is used verbatim on GBP
   * and every citation - so `name` carries the DBA customers search for and
   * `legalName` carries P5 Home Co LLC, which is the company that actually
   * holds the registration.
   */
  legalName: 'P5 Home Co LLC',
  phone: SITE_CONFIG.phone,
  email: SITE_CONFIG.email,
  website: SITE,
  publicLocality: SITE_CONFIG.address.cityState,
  serviceAreaLabel: SITE_CONFIG.address.serviceArea,
  founded: '2020',
  hours: {
    monday: '7:00 AM - 6:00 PM',
    tuesday: '7:00 AM - 6:00 PM',
    wednesday: '7:00 AM - 6:00 PM',
    thursday: '7:00 AM - 6:00 PM',
    friday: '7:00 AM - 6:00 PM',
    saturday: '8:00 AM - 4:00 PM',
    sunday: 'Closed',
  },
} as const;

export const GBP_SERVICE_AREAS = [
  'Boise, ID',
  'Meridian, ID',
  'Eagle, ID',
  'Nampa, ID',
  'Kuna, ID',
  'Star, ID',
  'Middleton, ID',
  'Caldwell, ID',
] as const;

export const GBP_CATEGORIES = {
  primary: 'Remodeler',
  secondary: [
    'Kitchen remodeler',
    'Bathroom remodeler',
    'Construction company',
    'General contractor',
    'Home builder',
  ],
} as const;

export const GBP_DESCRIPTION =
  'Boise Remodeling Co is a design-build remodeling contractor serving Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, and Caldwell, Idaho. One accountable team handles design, Ada and Canyon County permits, and construction for kitchen remodels, bathroom remodels, whole-home renovations, room additions, ADUs, garage conversions, and basement finishing. Every project includes a written scope before construction, a dedicated project manager, weekly written progress updates, and a written workmanship guarantee. Founded in 2020. Bonded and insured. Schedule a free 60 to 90 minute in-home visit and leave with a planning range and design direction - no pressure, no obligation.';

export const GBP_LINKS = {
  website: SITE,
  appointment: `${SITE}/contact`,
  estimator: `${SITE}/#calculator`,
  resources: `${SITE}/resources`,
  review: `${SITE}/review`,
} as const;

export const GBP_SOCIAL = {
  facebook: 'https://www.facebook.com/boiseremodeling',
  instagram: 'https://www.instagram.com/boiseremodeling',
} as const;

export const GBP_ATTRIBUTES = {
  onlineEstimates: true,
  onsiteServices: true,
  payments: ['Cash', 'Check', 'Credit cards', 'Financing available'],
  planning: 'Appointment required (for consultations)',
  serviceOptions: 'Free estimates (in-home visit + online estimator)',
} as const;

export const GBP_MESSAGING = {
  welcomeMessage:
    'Thanks for reaching out to Boise Remodeling Co. We respond within one business day. For faster help, call (208) 477-1169 or schedule a visit at boiseremodeling.co/contact',
} as const;

export interface GbpService {
  name: string;
  description: string;
  startingPrice?: string;
}

export const GBP_SERVICES: GbpService[] = [
  {
    name: 'Kitchen remodeling',
    description:
      'Custom kitchen renovations from cabinet refreshes to full gut-and-rebuild. Written scope, permits, and weekly updates included.',
    startingPrice: '$15,000',
  },
  {
    name: 'Bathroom remodeling',
    description:
      'Spa-quality bathroom transformations designed around how you actually live. Guest and primary baths.',
    startingPrice: '$18,000',
  },
  {
    name: 'Whole-home remodeling',
    description:
      'Cohesive whole-home renovations with a single project manager start to finish. Phased options available.',
    startingPrice: '$180,000',
  },
  {
    name: 'Room additions',
    description:
      'Thoughtfully designed additions that feel like they were always part of your home. Bump-outs to second-story additions.',
    startingPrice: '$80,000',
  },
  {
    name: 'ADU construction',
    description:
      'Detached or attached accessory dwelling units designed to maximize your property value. Boise ordinance guidance included.',
    startingPrice: '$90,000',
  },
  {
    name: 'Garage conversion',
    description:
      'Convert an existing garage into livable ADU or guest space. Feasibility and utility strategy included.',
    startingPrice: '$90,000',
  },
  {
    name: 'Basement finishing',
    description:
      'Finish or reconfigure basement space for living, storage, or rental-ready layouts.',
    startingPrice: 'Contact for range',
  },
  {
    name: 'Design-build remodeling',
    description:
      'One team handles design direction, selections, permits, and construction. No separate architect required for most projects.',
  },
  {
    name: 'Remodeling permit management',
    description:
      'Ada and Canyon County permits pulled in-house. Inspection scheduling coordinated by your project manager.',
  },
  {
    name: 'Home renovation consultation',
    description:
      'Free 60 to 90 minute in-home visit. Leave with a planning range and design direction. No obligation.',
  },
  {
    name: 'Primary suite additions',
    description:
      "Master bedroom and bathroom additions designed to match your home's architecture.",
  },
  {
    name: 'Kitchen cabinet refresh',
    description:
      'Reface or replace cabinets, counters, and backsplash without full gut. Lower planning band entry point.',
  },
];

export interface GbpProduct {
  category: string;
  name: string;
  price: string;
  url: string;
  description: string;
}

export const GBP_PRODUCT_CATEGORIES = [
  'Remodeling Services',
  'Free Planning Resources',
  'Consultation & Tools',
  'Areas We Serve',
] as const;

export const GBP_PRODUCTS: GbpProduct[] = [
  {
    category: 'Remodeling Services',
    name: 'Kitchen Remodel',
    price: 'From $15,000',
    url: `${SITE}/services/kitchen-remodel`,
    description:
      'Design-build kitchen remodels in the Treasure Valley. Cabinet refresh to full gut-and-rebuild. Free in-home planning visit.',
  },
  {
    category: 'Remodeling Services',
    name: 'Bathroom Remodel',
    price: 'From $18,000',
    url: `${SITE}/services/bathroom-remodel`,
    description:
      'Guest and primary bathroom remodels with written scope before construction. Ada and Canyon County permits handled in-house.',
  },
  {
    category: 'Remodeling Services',
    name: 'Whole-Home Remodel',
    price: 'From $180,000',
    url: `${SITE}/services/whole-home-remodel`,
    description:
      'Single project manager from design through final walkthrough. Weekly written updates and workmanship guarantee included.',
  },
  {
    category: 'Remodeling Services',
    name: 'Room Addition',
    price: 'From $80,000',
    url: `${SITE}/services/room-addition`,
    description:
      'Bump-outs, primary suites, and second-story additions that look original to your home.',
  },
  {
    category: 'Remodeling Services',
    name: 'ADU / Guest House',
    price: 'From $90,000',
    url: `${SITE}/services/adu`,
    description:
      'Attached, detached, and garage-conversion ADUs. Feasibility review and Boise ordinance guidance.',
  },
  {
    category: 'Remodeling Services',
    name: 'Garage Conversion',
    price: 'From $90,000',
    url: `${SITE}/services/adu`,
    description:
      'Convert existing garage space into livable ADU or guest quarters.',
  },
  {
    category: 'Remodeling Services',
    name: 'Basement Finishing',
    price: 'Contact for quote',
    url: `${SITE}/contact`,
    description:
      'Basement finishing and reconfiguration for living space or rental-ready layouts in Ada and Canyon County.',
  },
  {
    category: 'Free Planning Resources',
    name: 'Remodel Budget Worksheet',
    price: 'Free',
    url: `${SITE}/downloads/remodel-budget-worksheet.pdf`,
    description:
      'Printable 2026 Treasure Valley planning ranges, budget buckets, and bid comparison checks.',
  },
  {
    category: 'Free Planning Resources',
    name: 'Kitchen & Bath Planning Checklist',
    price: 'Free',
    url: `${SITE}/downloads/kitchen-bath-planning-checklist.pdf`,
    description:
      'Room-by-room checklist for layouts, selections, permits, and construction. Bring to your consultation.',
  },
  {
    category: 'Free Planning Resources',
    name: 'Ada vs Canyon Permit Guide',
    price: 'Free',
    url: `${SITE}/downloads/ada-canyon-permit-guide.pdf`,
    description:
      'One-page reference: jurisdiction map, when permits apply, and timeline bands.',
  },
  {
    category: 'Free Planning Resources',
    name: 'Permit Flow Guide (Interactive)',
    price: 'Free',
    url: `${SITE}/resources/ada-canyon-permit-flow`,
    description:
      'Visual walkthrough of Ada vs Canyon County permit paths and inspection milestones.',
  },
  {
    category: 'Consultation & Tools',
    name: 'Free In-Home Consultation',
    price: 'Free',
    url: `${SITE}/contact`,
    description:
      '60 to 90 minute visit at your home. Planning range and design direction on the spot. No pressure, no obligation.',
  },
  {
    category: 'Consultation & Tools',
    name: 'Online Planning Range Estimator',
    price: 'Free',
    url: `${SITE}/#calculator`,
    description:
      'Instant planning range in 60 seconds. Kitchen, bath, whole-home, addition, or ADU. Not a bid - a starting point for conversation.',
  },
  {
    category: 'Consultation & Tools',
    name: 'Remodel Planning Resources Hub',
    price: 'Free',
    url: `${SITE}/resources`,
    description: 'All free PDFs and guides in one place.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Boise, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/boise`,
    description:
      'Design-build remodeling contractor serving Boise, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Meridian, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/meridian`,
    description:
      'Design-build remodeling contractor serving Meridian, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Eagle, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/eagle`,
    description:
      'Design-build remodeling contractor serving Eagle, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Nampa, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/nampa`,
    description:
      'Design-build remodeling contractor serving Nampa, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Kuna, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/kuna`,
    description:
      'Design-build remodeling contractor serving Kuna, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Star, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/star`,
    description:
      'Design-build remodeling contractor serving Star, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Middleton, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/middleton`,
    description:
      'Design-build remodeling contractor serving Middleton, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
  {
    category: 'Areas We Serve',
    name: 'Remodeling in Caldwell, ID',
    price: 'Free consultation',
    url: `${SITE}/areas/caldwell`,
    description:
      'Design-build remodeling contractor serving Caldwell, Idaho. Kitchen, bath, whole-home, additions, ADUs, and basement finishing.',
  },
];

export interface GbpQaEntry {
  question: string;
  answer: string;
}

export const GBP_QA_SEED: GbpQaEntry[] = [
  {
    question: 'Do you provide free estimates?',
    answer: `Yes. We offer a free 60 to 90 minute in-home visit where we walk your space and share an honest planning range and design direction - no pressure, no obligation. You can also get an instant planning range online at ${SITE}/#calculator`,
  },
  {
    question: 'What areas do you serve?',
    answer:
      'Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, and Caldwell, Idaho - all of Ada and Canyon County in the Treasure Valley.',
  },
  {
    question: 'Do you handle permits?',
    answer: `Yes. We pull Ada and Canyon County permits in-house and coordinate inspections through your dedicated project manager. See our permit guide: ${SITE}/resources/ada-canyon-permit-flow`,
  },
  {
    question: 'How much does a kitchen remodel cost in Boise?',
    answer: `As of 2026, planning ranges run roughly $16,000–$21,000 for a cosmetic refresh, $37,000–$47,000 for mid-range scope, and $85,000–$166,000 for high-end and luxury gut renovations with layout changes. These are planning ranges, not bids. Full breakdown: ${SITE}/guides/boise-kitchen-remodeling-guide`,
  },
  {
    question: 'How much does a bathroom remodel cost?',
    answer: `Guest baths typically plan $18,000–$45,000; primary baths $35,000–$85,000+ depending on layout and finishes. Written scope after your free visit confirms the number. Guide: ${SITE}/guides/boise-bathroom-remodeling-guide`,
  },
  {
    question: 'Are you licensed and insured?',
    answer:
      'Yes. Boise Remodeling Co is bonded and insured for residential remodeling across the Treasure Valley. Idaho contractor license details are available upon request.',
  },
  {
    question: 'Do you build ADUs?',
    answer: `Yes - attached, detached, and garage-conversion ADUs. Planning ranges from $90,000 for garage conversions to $180,000–$300,000+ for detached new builds. Guide: ${SITE}/guides/boise-adu-guide`,
  },
  {
    question: 'Do you finish basements?',
    answer: `Yes. We finish and reconfigure basement space for living areas, guest suites, or rental-ready layouts. Schedule a free consultation to review feasibility: ${SITE}/contact`,
  },
  {
    question: 'What is design-build remodeling?',
    answer: `One accountable team handles design direction, selections, permits, and construction - so you are not coordinating separate architect and contractor contracts. Learn more: ${SITE}/about`,
  },
  {
    question: 'Do you offer financing?',
    answer:
      'Yes. Financing is available through partners including GreenSky and Mosaic with terms from 12 to 144 months. Soft credit check with same-day decisions in many cases.',
  },
  {
    question: 'How long does a kitchen remodel take?',
    answer: `Timelines depend on scope. A refresh may take 4–6 weeks; a full gut with layout changes often runs 10–16 weeks. We provide a week-by-week schedule before demo day. Process guide: ${SITE}/guides/boise-remodeling-process-guide`,
  },
  {
    question: 'How do I get started?',
    answer: `Call (208) 477-1169, text us at the same number, or schedule online: ${SITE}/contact. We respond within one business day.`,
  },
];

export interface GbpPost {
  week: number;
  headline: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  photoHint: string;
}

export const GBP_POSTS_STARTER: GbpPost[] = [
  {
    week: 1,
    headline: 'Kitchen clarity in Boise',
    body: 'North End kitchen remodel - written scope before demo, weekly Friday updates, final walkthrough with workmanship guarantee.',
    buttonLabel: 'Learn more',
    buttonUrl: `${SITE}/services/kitchen-remodel/boise`,
    photoHint: 'Best kitchen after photo',
  },
  {
    week: 2,
    headline: '2026 kitchen planning ranges',
    body: 'Most Treasure Valley kitchen remodels plan $35K–$75K mid-range. Refresh from ~$15K. Use our free budget worksheet to compare bids apples-to-apples.',
    buttonLabel: 'Get the worksheet',
    buttonUrl: `${SITE}/downloads/remodel-budget-worksheet.pdf`,
    photoHint: 'Budget worksheet cover',
  },
  {
    week: 3,
    headline: 'ADU options in the Treasure Valley',
    body: 'Garage conversions from ~$90K. Detached ADUs $180K–$300K+. We handle feasibility, permits, and build. Free in-home visit.',
    buttonLabel: 'ADU guide',
    buttonUrl: `${SITE}/guides/boise-adu-guide`,
    photoHint: 'ADU or garage conversion project',
  },
  {
    week: 4,
    headline: 'Free in-home visit - no pressure',
    body: '60 to 90 minutes at your home. Leave with a planning range and design direction. One team from first visit to final walkthrough.',
    buttonLabel: 'Schedule visit',
    buttonUrl: `${SITE}/contact`,
    photoHint: 'Team or consultation photo',
  },
];

export const GBP_PHOTO_CHECKLIST = [
  { type: 'Logo', spec: 'Square, 720×720+', filename: 'boise-remodeling-co-logo.jpg' },
  {
    type: 'Cover',
    spec: 'Landscape 1200×900+',
    filename: 'design-build-remodeling-treasure-valley-cover.jpg',
  },
  {
    type: 'Project photos (10+)',
    spec: 'Before/after, captioned by city + type',
    filename: 'kitchen-remodel-boise-north-end-after.jpg',
  },
  {
    type: 'Team/founder',
    spec: 'Team member at job site or office',
    filename: 'team-project-manager-boise.jpg',
  },
  {
    type: 'Work-in-progress',
    spec: 'Dust barriers / floor protection',
    filename: 'job-site-protection-daily-cleanup.jpg',
  },
  {
    type: 'Trust',
    spec: 'Branded vehicle or signage',
    filename: 'boise-remodeling-co-vehicle.jpg',
  },
] as const;

export const GBP_CITATION_FIXES = [
  {
    platform: 'Yelp',
    action: 'Claim listing; set phone to (208) 477-1169; service-area model; no street address',
    url: 'https://www.yelp.com',
  },
  {
    platform: 'ProMatcher',
    action: 'Correct or delete profile - remove Lake Fork address and old phone (208) 405-8425',
    url: 'https://www.promatcher.com/profile/BoiseRemodelingCo',
  },
  {
    platform: 'Facebook',
    action: 'Confirm NAP matches canonical record',
    url: GBP_SOCIAL.facebook,
  },
  {
    platform: 'Instagram',
    action: 'Confirm NAP in bio matches canonical record',
    url: GBP_SOCIAL.instagram,
  },
  {
    platform: 'MapQuest',
    action: 'Submit correction after Yelp is fixed',
    url: 'https://www.mapquest.com',
  },
] as const;

export const GBP_PARALLEL_LISTINGS = [
  { platform: 'Bing Places', url: 'https://www.bingplaces.com', category: 'Remodeler / General Contractor' },
  {
    platform: 'Apple Business Connect',
    url: 'https://businessconnect.apple.com',
    category: 'Home Improvement',
  },
] as const;

export const GBP_MONTHLY_SYNC = [
  'Publish 1 Google Post with deep link (see GBP_POSTS_STARTER rotation)',
  'Upload 2–4 new project photos with city + project type captions',
  'Respond to all reviews within 48 hours',
  'Check Q&A for new homeowner questions',
  'Verify NAP on Facebook, Instagram, Bing, Apple still matches GBP_NAP',
  'Update BUSINESS_INFO.rating/reviewCount in lib/seo.ts if review count changed',
] as const;

export const GBP_QUARTERLY_SYNC = [
  'Search "Boise Remodeling Co" (208) 405-8425 - old phone should return nothing',
  'Audit for duplicate GBP listings',
  'Update product/post links if new guides publish',
  'Append new citation URLs to BUSINESS_INFO.sameAs via env vars',
] as const;

/** GBP short review link from dashboard - set NEXT_PUBLIC_GBP_REVIEW_URL in production. */
export function getGbpReviewUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_GBP_REVIEW_URL?.trim();
  return url || undefined;
}

/** GBP Maps listing URL - set NEXT_PUBLIC_GBP_URL after verification. */
export function getGbpProfileUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_GBP_URL?.trim();
  return url || undefined;
}

/** Optional third-party profile URLs for schema sameAs (set via env after listings go live). */
export function getExternalProfileUrls(): string[] {
  const keys = [
    'NEXT_PUBLIC_GBP_URL',
    'NEXT_PUBLIC_BING_PLACES_URL',
    'NEXT_PUBLIC_APPLE_BUSINESS_URL',
    'NEXT_PUBLIC_YELP_URL',
    'NEXT_PUBLIC_HOUZZ_URL',
  ] as const;

  return keys
    .map((key) => process.env[key]?.trim())
    .filter((url): url is string => Boolean(url));
}
