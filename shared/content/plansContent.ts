/**
 * Copy for /remodel-plans-boise: send your plans with a project request.
 *
 * The plan-reading estimator this page once described was retired on 24
 * September 2026 (its endpoints answer 410 through retiredEstimatorResponse()).
 * The form on the page is the shared document estimator, whose public flow is
 * a project REQUEST with no price: the visitor describes the work and attaches
 * plans, photos and documents, and the team reviews them before preparing an
 * estimate (INTAKE_COPY in lib/p5/intakePolicy.ts). SEO audit SW-1, owner
 * decision 20 November 2026: the page says exactly that and promises no price
 * from drawings. Do not bring back the plan-reading claims, the HowTo steps or
 * "see a real number" unless a tool that does it is live again.
 */

import { SCOPE_UPLOAD_HELP } from "@/lib/p5/scope";

export interface PlanFaq {
  question: string;
  answer: string;
}

export interface PlanStep {
  title: string;
  body: string;
}

/** The direct answer, first under the hero. */
export const PLANS_DIRECT_ANSWER =
  "Send your floor plans with a project request and our team reviews the drawings and your scope before preparing an estimate. Describe the work in your own words, attach the plans, photos and documents you have, and send the request. No price is shown from the drawings on this page; a site visit or more information may be needed first.";

/** What to attach, in the order a remodel estimate uses it. */
export const PLANS_WHAT_TO_SEND = [
  "Floor plans, existing and proposed, for the rooms in the project",
  "Door, window, finish and plumbing fixture schedules, if the set has them",
  "A demolition plan on a remodel, if you have one",
  "Photos of the rooms as they are today",
  "Any notes from your architect, designer or the permit office",
];

/** What happens after the request is sent (INTAKE_COPY.next, in steps). */
export const PLANS_NEXT_STEPS: PlanStep[] = [
  {
    title: "You send the request",
    body: "Describe the project, attach your plans, photos and documents, and add how you would like us to reach you.",
  },
  {
    title: "Our team reviews it",
    body: "The team reviews your scope and the uploaded files before preparing an estimate.",
  },
  {
    title: "We follow up",
    body: "A site visit or additional information may be needed. We use your preferred contact method to follow up.",
  },
];

export const PLANS_FAQS: PlanFaq[] = [
  {
    question: "Which sheets should I send?",
    answer:
      "The floor plans and any schedules: door, window, finish or plumbing fixture. On a remodel, add the demolition plan if you have one, and photos of the rooms as they are. Structural details, foundation sections and elevations are welcome but are not needed to start.",
  },
  {
    question: "Will I see a price on this page?",
    answer:
      "No. This page sends a project request. Our team reviews your scope and drawings before preparing an estimate, and a site visit or more information may be needed first. For a preliminary price range on screen, use the instant estimate instead.",
  },
  {
    question: "How large can the files be?",
    answer: SCOPE_UPLOAD_HELP,
  },
  {
    question: "Do I need permit-ready drawings?",
    answer:
      "No. Schematic plans, a designer's layout or a sketch with measurements all help. Send what you have; the team will ask for anything else the estimate needs.",
  },
  {
    question: "Do you keep my drawings?",
    answer:
      "They are stored with your request and sent to our estimating team so they can review them. We do not share them outside the company.",
  },
  {
    question: "What does this cost?",
    answer: "Nothing. Sending a project request is free, and there is no obligation.",
  },
];
