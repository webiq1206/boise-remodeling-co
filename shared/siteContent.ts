import {
  ShieldCheck,
  MessageSquare,
  CalendarClock,
  Wallet,
  Hammer,
  HeartHandshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SHOW_UNPROVEN_PROJECT_COUNT } from "@/shared/foundingClaim";
import { SHOW_FOUNDING_YEAR } from "@/shared/publicClaims";

export const SITE_TAGLINE = "Treasure Valley design-build, built on clarity and craftsmanship";

export const HERO_EYEBROW = "Boise Remodeling Contractor · Treasure Valley";

export const HERO_SUBHEAD =
  "One accountable design-build team from first visit to final walkthrough.";

export const HERO_STATS = [
  { num: "After photos", label: "Planning range after visit" },
  { num: "Free", label: "In-home visit" },
  { num: "Written", label: "Scope before build" },
] as const;

export const DIFFERENTIATORS_HEADLINE = "Built for homeowners who want clarity, not chaos";

export const DIFFERENTIATORS_INTRO =
  "Many homeowners we meet have lived through a remodel where the scope shifted, the budget grew, the house became unlivable, or nobody returned their calls. We built our process around the opposite: one accountable team, a written plan before construction, a job site that respects your home, and proactive updates every Friday.";

export interface Differentiator {
  title: string;
  body: string;
  contrast: string;
}

/** Top differentiators for homepage; full list on About. */
export const HOMEPAGE_DIFFERENTIATOR_INDICES = [0, 1, 2, 3, 4] as const;

export const DIFFERENTIATORS: Differentiator[] = [
  {
    title: "Your budget builds your home, not our overhead",
    contrast: "Instead of paying for big offices, showrooms, and fleets of trucks that quietly get built into your price,",
    body: "you get a company that runs lean on purpose. We put more of every dollar into the materials, labor, and finish of your project, so more of what you spend ends up in your home.",
  },
  {
    title: "One team, one point of accountability",
    contrast: "Instead of coordinating a designer, a contractor, and multiple subs who may point fingers when something goes wrong,",
    body: "you work with a single design-build team. Design, permitting, and construction stay under one roof, with the same dedicated project manager from your first visit through final walkthrough.",
  },
  {
    title: "A written plan before we swing a hammer",
    contrast: "Rather than relying on a verbal estimate that shifts once work begins,",
    body: "you receive a clear written scope with design direction and finish selections before construction starts. Any change mid-project requires a written change order with your approval first.",
  },
  {
    title: "Proactive communication, not radio silence",
    contrast: "Instead of wondering what happened on your project this week,",
    body: "you receive a written update every Friday: what was completed, what is next, and any decisions needed from you. We also flag budget impacts early, before they become surprises.",
  },
  {
    title: "Local permit and schedule expertise",
    contrast: "Rather than chasing paperwork or guessing at timelines,",
    body: "we handle Ada and Canyon County permits in-house and build realistic schedules into your project plan from day one. You always know where the project stands.",
  },
  {
    title: "Confidence that outlasts the project",
    contrast: "Beyond a quick sign-off and goodbye,",
    body: "we stand behind our craftsmanship with a written workmanship guarantee. Optional 3D visualizations are available for clients who want extra confidence in major layout and finish decisions before construction begins.",
  },
  {
    title: "A job site that respects your home",
    contrast: "Instead of living with open dust, damaged floors, and crews working at all hours,",
    body: "we use dust barriers and floor protection daily, schedule disruptive work during reasonable hours, and plan the project so most kitchen and bath remodels remain livable while we work.",
  },
  {
    title: "No high-pressure sales, no going dark",
    contrast: "Rather than a commission-driven pitch to sign on the spot or a project manager who stops returning calls,",
    body: "your free in-home visit is focused on planning guidance and an honest range. You work with the same dedicated project manager throughout, with weekly written updates so you are never left wondering who to contact or what is happening.",
  },
  {
    title: "Schedule changes communicated early",
    contrast: "Instead of finding out a milestone slipped after the fact,",
    body: "we build realistic timelines into your plan from day one and update you in writing when anything affects your schedule. Permit timelines for Ada and Canyon County are accounted for upfront, not treated as an afterthought.",
  },
  {
    title: "Craftsmanship you review before we close out",
    contrast: "Rather than rushing to the next job before you have a chance to inspect the work,",
    body: "we walk every finished detail with you at a final walkthrough. Finish selections are documented in your written scope before construction so what we build matches what you approved.",
  },
];

/**
 * Headline credibility stats. Owner-provided facts about the business - keep
 * these accurate and update in one place. `established` is the founding year
 * (see shared/gbpProfile.ts GBP_NAP.founded); `projectsCompleted` is a rounded
 * completed-project count.
 */
export const PROOF_STATS = {
  established: "2020",
  projectsCompleted: "100+",
} as const;

/**
 * Post-hero proof bar. Leads with the two credibility stats, then the genuine
 * trust signals the business carries. No review counts or ratings until real
 * ones exist. Keep labels concise so the strip stays on one desktop row.
 */
const TRUST_ITEM_SOURCE = [
  `Est. ${PROOF_STATS.established}`,
  `${PROOF_STATS.projectsCompleted} Projects`,
  "Bonded · Insured",
  "Permits In-House",
  "Workmanship Guarantee",
  "Free In-Home Visit",
] as const;

export function visibleTrustItems(showYear: boolean = SHOW_FOUNDING_YEAR): string[] {
  const base = TRUST_ITEM_SOURCE.filter((item) => {
    if (/^est\.?\s*2020$/i.test(item)) return false;
    if (!SHOW_UNPROVEN_PROJECT_COUNT && item === `${PROOF_STATS.projectsCompleted} Projects`) return false;
    return true;
  });
  return showYear ? [`Est. ${PROOF_STATS.established}`, ...base] : base;
}
export const TRUST_ITEMS = visibleTrustItems();

export const PROMISE_ITEMS = [
  {
    num: "01",
    title: "Clear budget guidance",
    body: "You receive honest planning ranges, written scope, and proactive updates so you always know where your project stands.",
  },
  {
    num: "02",
    title: "Proactive communication",
    body: "Every Friday: what was completed, what is next, and any decisions needed from you. One dedicated project manager start to finish.",
  },
  {
    num: "03",
    title: "Schedule you can plan around",
    body: "We build realistic timelines into your project from day one and update you when anything changes, before it becomes a surprise.",
  },
  {
    num: "04",
    title: "The workmanship guarantee",
    body: "We stand behind our craftsmanship with a written workmanship guarantee, long after the final walkthrough.",
  },
];

export interface ClientPriority {
  title: string;
  body: string;
  icon: LucideIcon;
}

export const CLIENT_PRIORITIES: ClientPriority[] = [
  {
    title: "Trust and credibility",
    body: "Idaho Registered Contractor #8381215, bonded and insured, with permits handled in-house and a written scope before work begins.",
    icon: ShieldCheck,
  },
  {
    title: "Quality craftsmanship",
    body: "Skilled trades, careful finishes, and a final walkthrough on every project we build.",
    icon: Hammer,
  },
  {
    title: "Clear communication",
    body: "Weekly written updates and one project manager who knows your home from first visit to completion.",
    icon: MessageSquare,
  },
  {
    title: "Staying on budget",
    body: "Planning ranges upfront, written change orders before extra work, and proactive budget guidance throughout.",
    icon: Wallet,
  },
  {
    title: "Staying on schedule",
    body: "Realistic timelines built into your project plan with permit and construction milestones you can follow.",
    icon: CalendarClock,
  },
  {
    title: "A stress-free process",
    body: "Dust barriers, floor protection, and a team that respects your home while you live through the remodel.",
    icon: HeartHandshake,
  },
];

export const HOW_WE_BUILD_STEPS = [
  {
    number: "01",
    title: "Free in-home visit",
    desc: "We walk your space, hear your goals, and give you a planning range on the spot. No obligation.",
  },
  {
    number: "02",
    title: "Detailed scope and design direction",
    desc: "You receive a clear written scope with design direction and finish selections before construction begins.",
  },
  {
    number: "03",
    title: "Permits handled for you",
    desc: "We know the Ada and Canyon County offices. Permits are built into your schedule from day one.",
  },
  {
    number: "04",
    title: "Weekly progress updates",
    desc: "Every Friday you get a written update: what was done, what is next, and any decisions needed from you.",
  },
  {
    number: "05",
    title: "Final walkthrough and workmanship guarantee",
    desc: "We walk every inch with you. If we built it and it fails due to workmanship, we fix it free.",
  },
];

export const PRINCIPLES = [
  {
    title: "Written scope before we build",
    desc: "Every project starts with a clear written scope so you know exactly what to expect before construction begins.",
  },
  {
    title: "Written change orders only",
    desc: "If scope changes mid-project, you get a written change order before any additional work begins. Always.",
  },
  {
    title: "Proactive budget guidance",
    desc: "We communicate early when selections or conditions may affect your budget. No surprises at invoice time.",
  },
  {
    title: "We respect your time",
    desc: "Noisy work during reasonable hours. Dust barriers every day. Your home stays as livable as possible.",
  },
  {
    title: "One PM, start to finish",
    desc: "Your project manager is the same person from design day to final walkthrough. You always know who to call.",
  },
  {
    title: "Workmanship guarantee",
    desc: "We stand behind what we build with a written workmanship guarantee, because we build things meant to last.",
  },
];

export const STANDARD_INCLUSIONS = [
  "All permits pulled in-house",
  "Dedicated project manager",
  "Weekly written progress updates",
  "Dust barriers and floor protection daily",
  "Written workmanship guarantee",
  "Manufacturer warranties passed through",
];

export const OPTIONAL_ENHANCEMENTS = {
  title: "3D renderings and visualizations",
  body: "Optional design upgrade that helps you visualize your finished space before construction begins. Adds to project investment and design timeline, but gives many clients confidence in major layout and finish decisions.",
  note: "Available on request during your design consultation.",
};

export const BUDGET_GUIDANCE_POINTS = [
  {
    title: "Planning ranges, not firm bids",
    body: "Our online estimator and in-home visit provide planning ranges based on project type, size, finish level, and market conditions. Your detailed project evaluation happens at consultation.",
  },
  {
    title: "Written scope before construction",
    body: "Before work begins, you receive a written scope outlining what is included, key finish selections, and your project investment. This is your roadmap, not a line-item materials list.",
  },
  {
    title: "Proactive budget updates",
    body: "If selections, site conditions, or scope changes affect your budget, we communicate early and in writing before proceeding.",
  },
  {
    title: "Change orders in writing",
    body: "Any scope change mid-project requires a written change order with your approval before additional work begins.",
  },
];

export const LEADERSHIP_COPY = {
  label: "Our commitment",
  headline: "Remodeling should feel clear, not chaotic.",
  paragraphs: [
    "Boise Remodeling Co was built on a simple belief: homeowners in the Treasure Valley deserve a design-build partner who communicates clearly, plans carefully, and treats their home with respect.",
    "We know how most firms are compared: separate designers and contractors, vague scopes, inconsistent updates, and pressure to sign before you have real answers. Our process was designed around what comparison shoppers actually need.",
    "That means one accountable team, written scope before we build, weekly updates while we work, and a team that picks up the phone when you have a question.",
  ],
  closing: "That is not a marketing promise. Every detail, every decision - handled with intention.",
};

export const FINANCING_BULLETS = [
  "Terms from 12 to 144 months",
  "Soft credit check to view offers",
  "No prepayment penalties",
  "Same-day approval decisions",
  "Works alongside cash, check, or wire",
];

export const CONSULT_BULLETS = [
  "No commission-driven salespeople",
  "No pressure to decide on the spot",
  "Honest planning ranges, in writing",
  "Response within one business day",
];

/**
 * Full-bleed cinematic statement band on the homepage - a photographic
 * "breather" that breaks the run of text sections below the estimator.
 * `accentWord` renders as the sage Fraunces accent (keep it to one word).
 */
export const STATEMENT_BAND = {
  eyebrow: "Our commitment",
  statement: "Every detail, every decision, handled with",
  accentWord: "intention",
  support:
    "One accountable team, a written plan before we build, and proactive updates every week, from your first in-home visit to the final walkthrough.",
} as const;

/**
 * "Where your money goes" positioning: as a lean, newer company we keep
 * overhead low and reinvest it in the work. Flagship homepage band placed just
 * before the estimator so it frames the pricing conversation. Editorial voice,
 * confident (not a "what you're not paying for" list).
 */
export const VALUE_MODEL = {
  eyebrow: "Where your money goes",
  headlineA: "Don't pay for our overhead.",
  headlineB: "Pay for your",
  accentWord: "home",
  costs: "Big offices. Fancy showrooms. Fleets of trucks. Layers of management.",
  costsBody: "Those costs don't disappear, they get built into your project.",
  reframe:
    "So we built our company differently. Every dollar you invest should go toward your home, not toward paying our bills.",
  taglineLead: "Get more home for",
  taglineAccent: "what you spend",
} as const;
