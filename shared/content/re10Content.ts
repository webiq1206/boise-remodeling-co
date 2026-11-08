/**
 * RE-10 landing page content.
 *
 * Held as data rather than markup for two reasons. The FAQ answers have to feed
 * both the visible accordion and the FAQPage JSON-LD, and schema that disagrees
 * with the page is worse than no schema at all - so they come from one place.
 * And the claims here are the ones that must stay true: what this company will
 * and will not do on a transaction. Keeping them in a single file makes them
 * reviewable by the owner without reading JSX.
 *
 * WHAT IS DELIBERATELY ABSENT. No guaranteed completion dates, no promise that
 * a repair will satisfy an inspector or a buyer, no claim to clear inspection
 * conditions or certify code, no referral incentives, and no "Boise's leading"
 * superlatives. Every one of those was available and every one would be either
 * unverifiable or a promise a contractor cannot keep on someone else's closing.
 */

/** An RE-10 is an Idaho form. Say what it is before selling against it. */
export const RE10_DEFINITION =
  "An RE-10 is the Idaho inspection response form. After a home inspection, the buyer uses it to ask the seller to repair specific items before closing, and the seller responds by agreeing, declining, or negotiating. The repairs on that form are what has to be scheduled, completed and documented before the transaction can close.";

/**
 * The direct answer block, 40-60 words, placed above everything else.
 *
 * This is what an answer engine lifts when someone asks who does RE-10 repairs
 * in Boise, so it has to stand alone away from the page and still be true.
 */
export const RE10_DIRECT_ANSWER =
  "Boise Remodeling Co completes RE-10 and home inspection repairs for real estate agents, buyers and sellers across Boise and the Treasure Valley. Send the RE-10 and inspection report, and we review the repair list, price it, coordinate access, complete the approved work, and provide photo documentation and invoices for the file.";

export interface Re10Benefit {
  title: string;
  body: string;
}

/** Written as outcomes for the agent, not features of the company. */
export const RE10_BENEFITS: Re10Benefit[] = [
  {
    title: "One contact for the whole repair list",
    body: "Carpentry, drywall, paint, flooring, minor plumbing and electrical, and exterior work coordinated by one company. You stop chasing four contractors for one inspection response.",
  },
  {
    title: "You are told before we proceed",
    body: "If we open a wall and find something worse, you hear it that day, with photos, and nothing additional gets done until someone with authority approves it.",
  },
  {
    title: "Documentation your file can use",
    body: "Before-and-after photos, itemized invoices and receipts, sent in a form you can forward to the other agent, the lender or your client without editing it first.",
  },
  {
    title: "Access handled professionally",
    body: "Vacant, occupied, lockbox or tenant-occupied. We confirm the arrangement in writing beforehand and we do not turn up unannounced at your client's home.",
  },
  {
    title: "Scheduling built around your dates",
    body: "We ask for the repair deadline and the closing date first, because those decide whether a scope is realistic. If it is not, you hear that early enough to renegotiate.",
  },
  {
    title: "A repair partner across transactions",
    body: "Most of our RE-10 work comes from agents who used us once. Pre-listing repairs, buyer-requested repairs, seller preparation and post-closing work all run the same way.",
  },
];

export interface Re10ServiceGroup {
  heading: string;
  items: string[];
}

/**
 * Only work this company actually performs. Roofing is minor repair only, and
 * anything structural, gas, main-service electrical or sewer is named as a
 * coordination item rather than quietly implied to be in scope.
 */
export const RE10_SERVICES: Re10ServiceGroup[] = [
  {
    heading: "Interior repairs",
    items: [
      "Drywall repair, texture matching and repainting",
      "Trim, molding and baseboard repair",
      "Interior door adjustment, replacement and hardware",
      "Cabinet repair, hinges, slides and pulls",
      "Flooring and tile repair, carpet patching and restretching",
      "Handrail, stair tread and guard repairs",
      "Shelving, closet and general carpentry",
    ],
  },
  {
    heading: "Minor plumbing and electrical",
    items: [
      "Faucet, supply valve and toilet repairs",
      "Leak repair at traps, supplies and fixtures",
      "Outlet, switch and cover plate replacement",
      "GFCI protection where an inspector has called for it",
      "Light fixture replacement and smoke or CO detectors",
      "Water heater replacement, permitted where required",
    ],
  },
  {
    heading: "Exterior and weatherproofing",
    items: [
      "Siding and exterior trim repair",
      "Caulking, sealing and weatherproofing",
      "Deck board and deck railing repair",
      "Fence and gate repair",
      "Gutter and downspout repair",
      "Window seal and flashing repair",
      "Minor localized roof repairs",
    ],
  },
];

/**
 * Named plainly rather than buried, because an agent finding out on the day of
 * closing that their contractor does not do sewer scopes is the worst possible
 * moment to learn it.
 */
export const RE10_COORDINATION_ONLY = [
  "Structural repairs and anything needing an engineer's letter",
  "Foundation work",
  "Mold, asbestos or lead abatement, which requires testing and a licensed abatement contractor",
  "Main electrical service, panel and meter work",
  "Sewer and septic",
  "HVAC equipment replacement",
  "Gas line work",
  "Full roof replacement",
];

export interface Re10ProcessStep {
  step: string;
  title: string;
  body: string;
}

export const RE10_PROCESS: Re10ProcessStep[] = [
  {
    step: "01",
    title: "Send the RE-10",
    body: "Upload the RE-10, the relevant inspection report pages and any photos, with the property address, repair deadline and closing date.",
  },
  {
    step: "02",
    title: "We review the repair list",
    body: "We work through every requested item and tell you which we can price from the documents, which need a photo, and which need someone on site.",
  },
  {
    step: "03",
    title: "You get scope and pricing",
    body: "A written scope with pricing, the assumptions behind it, what is excluded, and anything we think will not survive contact with the property.",
  },
  {
    step: "04",
    title: "We coordinate access",
    body: "We agree the access arrangement with whoever holds it, and schedule against your repair deadline and material lead times.",
  },
  {
    step: "05",
    title: "We complete the approved work",
    body: "Approved repairs only. Anything we find that changes the scope is raised with photos and waits for approval before it is touched.",
  },
  {
    step: "06",
    title: "You get the documentation",
    body: "Completion photos, itemized invoices and receipts, ready to share with the other side, the lender or your client.",
  },
];

export interface Re10Faq {
  question: string;
  answer: string;
}

/**
 * Feeds both the accordion and the FAQPage schema.
 *
 * Written so each answer stands alone if an answer engine lifts it out of the
 * page. Short direct sentence first, detail after, no marketing throat-clearing
 * before the reader gets what they asked for.
 */
export const RE10_FAQS: Re10Faq[] = [
  {
    question: "What is an RE-10 repair request?",
    answer:
      "An RE-10 is the Idaho inspection response form. After a home inspection, the buyer uses it to request specific repairs before closing, and the seller agrees, declines or negotiates. The agreed items become the repair list that has to be completed and documented before the transaction closes.",
  },
  {
    question: "Can you review the full RE-10 document?",
    answer:
      "Yes. Send the RE-10 and the relevant inspection report pages and we will work through every requested item, tell you which we can price from the documents, which need a photo or a measurement, and which need an onsite evaluation before anyone should put a number on them.",
  },
  {
    question: "Can you work directly with the real estate agent?",
    answer:
      "Yes. Agents are who we usually deal with. We can take the documents from you, coordinate access with the buyer, seller or occupant, and send you the scope, pricing and completion documentation directly so you can pass it on.",
  },
  {
    question: "Can you handle multiple repairs at the same property?",
    answer:
      "Yes, and it is the efficient way to do it. Most RE-10 lists span several trades. We group the work so travel and set-up are shared across the list rather than charged separately for every item, which is usually cheaper than hiring each trade individually.",
  },
  {
    question: "How do you review a repair request?",
    answer:
      "We read every item on the list and answer your questions about it. Send the documents as early as you can. The earlier we see the list, the more honestly we can tell you what fits inside your deadline.",
  },
  {
    question: "Can you complete repairs before closing?",
    answer:
      "Often, but we will not promise it before seeing the list. It depends on the scope, material lead times, property access and how much of the calendar is left. We prioritize transaction-related repairs and will tell you clearly what can reasonably be finished inside your timeframe.",
  },
  {
    question: "Do you provide written estimates?",
    answer:
      "Yes. Every repair list gets a written scope with pricing, the assumptions behind it, and what is excluded. Anything that needs an onsite evaluation is listed separately rather than guessed at.",
  },
  {
    question: "Do you provide completion photos, invoices and receipts?",
    answer:
      "Yes. Completed work is documented with photos, and you get itemized invoices and receipts where applicable, in a form you can forward to the other agent, the lender or your client without reformatting.",
  },
  {
    question: "Can you work on vacant properties and coordinate lockbox access?",
    answer:
      "Yes. Vacant, occupied and tenant-occupied properties are all routine. We confirm the access arrangement in writing before the first visit, including lockbox codes or key handling, and we do not turn up unannounced.",
  },
  {
    question: "What happens if you find additional damage?",
    answer:
      "Work stops on that item and you hear about it the same day, with photos. Nothing additional is completed until whoever holds authority approves it in writing. Concealed damage behind a finish is the commonest reason an inspection repair changes price.",
  },
  {
    question: "Do you handle plumbing and electrical repairs?",
    answer:
      "We handle minor plumbing and electrical repairs of the kind that appear on inspection responses: faucets, supply valves, toilets, leaks, outlets, switches, GFCI protection, light fixtures and detectors. Main electrical service, panel work, gas lines, and sewer or septic require a licensed specialist and we will point you to one.",
  },
  {
    question: "Who is responsible for approving additional work?",
    answer:
      "Whoever is paying for it. We ask at the start of the job who holds approval authority, usually the seller or the buyer depending on the agreement, and we take written approval from that person before any work beyond the agreed scope.",
  },
  {
    question: "Can you help with repairs before a property is listed?",
    answer:
      "Yes. Pre-listing repairs, deferred maintenance, safety corrections and cosmetic work before photography or showings are all work we do. Handling likely inspection items before listing usually costs less than negotiating them after an inspection.",
  },
  {
    question: "Do all repairs require an onsite inspection?",
    answer:
      "No. Many common items can be scoped and priced from a clear repair request and a photo. Anything structural, anything involving water intrusion, mold or concealed damage, and anything where the request is too vague to price responsibly needs someone on site first.",
  },
  {
    question: "Can you guarantee a repair will satisfy the buyer or the inspector?",
    answer:
      "No, and no contractor honestly can. We complete the repair correctly and document it, but whether a re-inspection or a buyer accepts it is their decision. What we can do is make sure the work is done properly and that the documentation shows exactly what was completed.",
  },
  {
    question: "Do you work throughout the Treasure Valley?",
    answer:
      "Yes. Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, Garden City and Caldwell, across Ada and Canyon County.",
  },
  {
    question: "How do I submit an RE-10 or inspection report?",
    answer:
      "Send it through the form on this page with the property address, repair deadline and closing date, or call or text us and we will tell you where to send it. PDFs, scans and phone photos of a printed document all work.",
  },
];

/** Service-area names, matching the areas the company actually covers. */
export const RE10_SERVICE_AREAS = [
  "Boise",
  "Meridian",
  "Eagle",
  "Nampa",
  "Kuna",
  "Star",
  "Middleton",
  "Garden City",
  "Caldwell",
];

/**
 * Shown wherever pricing or timing is discussed.
 *
 * The estimator this page will eventually feed produces a planning range, not a
 * quote, and the difference matters when the reader is under a contractual
 * deadline.
 */
/**
 * Rewritten when the estimator moved from a range to a firm price.
 *
 * The old wording ("a planning range, not a contract price") would now
 * contradict the number beside it. A price an agent cannot rely on is not
 * worth quoting, so this commits to the figure and is precise about the two
 * things that can move it: an item we said needed an onsite look, and damage
 * nobody could see. Both are named up front rather than discovered later.
 */
export const RE10_PRICING_DISCLAIMER =
  "This price is firm for the repairs listed, at the quantities shown, and is held for 30 days. Items we have flagged for an onsite look are not included and are priced separately once we see them. If concealed damage turns up behind a finish, we stop and agree the change with you in writing before any extra work happens. No work is scheduled or authorized until a scope and agreement are approved.";
