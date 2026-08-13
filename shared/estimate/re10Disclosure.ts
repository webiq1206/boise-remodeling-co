/**
 * What an RE-10 REPAIR estimate says about itself.
 *
 * A DIFFERENT PROBLEM FROM A REMODEL, SO DIFFERENT PROTECTIONS. A remodel is
 * scope a homeowner is choosing and we are pricing before the walls are open.
 * An RE-10 is a list somebody else wrote, on a document we read automatically,
 * against a house nobody from here has stood in, with a closing date attached.
 * The things that go wrong are: we misread the document, the document did not
 * say how much, the damage is bigger once it is opened, or the item needs a
 * licensed trade. None of those are remodel risks, and none of the remodel
 * language belongs here.
 *
 * EVERY LINE BELOW IS DRIVEN BY THE ACTUAL READ. Which repairs priced, which
 * carried no measurement, which the extractor could not map, which the estimator
 * flagged for an onsite look and why. A protection that does not correspond to
 * something in this specific document does not appear.
 */
import type { Re10Estimate, ReviewReason } from "../costs/re10Repairs";
import { DisclosureBuilder, type Disclosure } from "./disclosure";

export interface Re10DisclosureInput {
  estimate: Re10Estimate;
  /** Requests the extractor read but could not map to a priceable category. */
  unmapped?: { verbatim: string; reason?: string }[];
  /** What the extractor noticed about the document itself. */
  documentNotes?: string[];
  /** True when the RE-10 itself was read, false when only photos arrived. */
  looksLikeRe10?: boolean;
  /** How many files the customer sent, so "the document" can be named honestly. */
  documentCount?: number;
  /** Repairs the customer typed in themselves rather than us reading them. */
  manuallyAdded?: string[];
  /** Repairs the customer toggled OFF on the review screen. */
  excluded?: { description: string }[];
  /** Files stored for the team but not machine-readable (docx, HEIC). */
  attachedOnly?: string[];
  repairDeadline?: string | null;
  occupancy?: "occupied" | "vacant" | "unknown";
}

/**
 * The estimator already writes some of this, and it is already dynamic.
 *
 * `estimateRe10` derives its own assumptions from the priced result - how many
 * repairs carry an allowance, how many trades are being scheduled together,
 * whether the property is occupied - and those sentences were written carefully
 * enough that one of them carries a note about why it does NOT say "one
 * mobilization per trade". Regenerating that here would mean two sources of
 * truth for the same claim and an inevitable drift between them. So they are
 * folded in as first-class assumptions, evidenced as coming from the takeoff,
 * and this module adds only what the estimator does not already say.
 */
function foldEngineAssumptions(b: DisclosureBuilder, estimate: Re10Estimate): void {
  for (const [i, text] of estimate.assumptions.entries()) {
    b.assume(`engine-${i}`, text, "derived by the repair estimator from the priced result");
  }
}

/**
 * Why an item needs a person rather than a price, in the customer's words.
 *
 * Keyed off the estimator's own reason codes, so a new reason cannot be added
 * upstream and silently render as nothing here.
 */
const REVIEW_LANGUAGE: Record<ReviewReason, { label: string; text: string }> = {
  structural: {
    label: "Structural repair",
    text: "Structural work is priced after someone has looked at it. What is visible rarely describes the whole repair.",
  },
  foundation: {
    label: "Foundation repair",
    text: "Foundation work needs eyes on it, and often an engineer, before anyone can put a number on it.",
  },
  "water-intrusion": {
    label: "Water intrusion",
    text: "Active water needs its source found first. The repair is priced once we know where it is coming from.",
  },
  "mold-hazmat": {
    label: "Mould or hazardous material",
    text: "This is handled by a licensed specialist, and testing comes before pricing.",
  },
  "asbestos-lead": {
    label: "Asbestos or lead",
    text: "Testing and abatement are licensed work and are not in this price.",
  },
  "major-roofing": {
    label: "Roofing",
    text: "Roof work of this size is priced from the roof, not from a description of it.",
  },
  "electrical-service": {
    label: "Electrical service",
    text: "Service and panel work needs a licensed electrician to assess before pricing.",
  },
  "sewer-septic": {
    label: "Sewer or septic",
    text: "This needs a camera or a dig before anyone can quote it honestly.",
  },
  "hvac-replacement": {
    label: "HVAC replacement",
    text: "Equipment replacement is sized on site, and the size drives the price.",
  },
  gas: {
    label: "Gas work",
    text: "Gas lines are licensed work with a required inspection.",
  },
  "fire-damage": {
    label: "Fire damage",
    text: "Fire repairs need an assessment of what the heat reached, which is usually more than it looks.",
  },
  engineering: {
    label: "Engineering required",
    text: "An engineer has to specify this before it can be priced or built.",
  },
  "permit-uncertain": {
    label: "Permit unclear",
    text: "Whether this needs a permit depends on what the inspector finds, which changes the cost.",
  },
  concealed: {
    label: "Concealed damage likely",
    text: "The visible damage is usually the edge of it. The real extent shows up when it is opened.",
  },
  allowance: {
    label: "Allowance",
    text: "Carried at a provisional figure until the actual work is confirmed.",
  },
  "incomplete-info": {
    label: "Not enough detail",
    text: "The document does not say enough about this one to price it properly.",
  },
  "out-of-scope": {
    label: "Not work we take on",
    text: "This one is outside what we do. We will point you at the right trade rather than quote it and subcontract it blind.",
  },
};

/** How a flagged reason lands in the customer's list of what is and is not priced. */
function statusFor(reason: ReviewReason): "allowance" | "needs-specialist" | "excluded" | "needs-onsite" {
  if (reason === "allowance") return "allowance";
  if (reason === "out-of-scope") return "excluded";
  if (reason === "engineering" || reason === "mold-hazmat" || reason === "asbestos-lead") return "needs-specialist";
  return "needs-onsite";
}

export function buildRe10Disclosure(input: Re10DisclosureInput): Disclosure {
  const b = new DisclosureBuilder();
  const { estimate } = input;
  const docs = input.documentCount ?? 1;
  const docLabel = docs > 1 ? "the documents you sent" : "the document you sent";

  /* --------------------------------------------------------- assumptions
     Repair assumptions, not project assumptions. What we took the document to
     mean, and what we filled in where it said nothing. */

  b.assume(
    "document-is-the-scope",
    `We priced the repairs we could read in ${docLabel}, and nothing beyond them.`,
    `${estimate.priced.length} repairs read and priced`,
  );

  foldEngineAssumptions(b, estimate);

  /* UNCERTAINTY IS NOT MISSING INFORMATION, and conflating them was a real bug
     here. The estimator's notes are things that widen the range - "fewer than
     half the items have a photo, and photos are the fastest way to narrow this"
     - which is specific, actionable, and true of a document we read perfectly.
     Filing it under what-we-could-not-read meant a clean read reported a gap it
     did not have, which is the boilerplate failure this whole module exists to
     prevent. They are factors, and the actionable ones are next steps. */
  for (const text of estimate.uncertainty) {
    b.factor(text);
    if (/photo/i.test(text)) b.next(text);
  }

  const assumedQty = estimate.priced.filter((p) => p.quantityAssumed);
  if (assumedQty.length > 0) {
    b.assume(
      "quantities-assumed",
      `${assumedQty.length} ${assumedQty.length === 1 ? "repair gives" : "repairs give"} no measurement, so we used a typical quantity: ${assumedQty
        .map((p) => p.input.description)
        .slice(0, 4)
        .join("; ")}${assumedQty.length > 4 ? "; and others" : ""}.`,
      "repairs priced with defaultQty because the document stated no measurement",
    );
    b.acknowledge("Some quantities were assumed because the document did not state them, and will be verified on site.");
    b.widen(0.05);
  }

  const stated = estimate.priced.filter((p) => !p.quantityAssumed);
  if (stated.length > 0) {
    b.assume(
      "quantities-as-written",
      `Where the document gave a measurement we took it as written, on ${stated.length} ${stated.length === 1 ? "repair" : "repairs"}.`,
      "quantities read directly from the document",
    );
  }

  b.assume(
    "sound-substrate",
    "We assumed what is behind each repair is sound, because nothing in the document says otherwise.",
    "no concealed damage described in the document",
  );

  b.assume(
    "standard-materials",
    "Standard materials, matched as closely as stock allows. The document does not specify products.",
    "no material specification in the document",
  );

  if (input.occupancy === "occupied") {
    b.assume(
      "occupied",
      "Someone is living there, so access is arranged around them and the work is staged.",
      "occupancy reported as occupied",
    );
  }

  /* ------------------------------------------------- items, by what happened */

  for (const trade of estimate.trades) {
    for (const p of trade.repairs) {
      b.item(
        `priced-${p.input.id}`,
        p.input.description,
        "included",
        `${trade.label}${p.input.location ? `, ${p.input.location}` : ""}. ${
          p.quantityAssumed
            ? "No measurement in the document, so a typical quantity was used."
            : `Priced at ${p.quantity} ${p.recipe.unit}.`
        }`,
        `read from the document and priced as ${p.input.kind}`,
      );
    }
  }

  for (const r of estimate.review) {
    const lang = REVIEW_LANGUAGE[r.reason];
    b.item(
      `review-${r.input.id}`,
      r.input.description,
      statusFor(r.reason),
      `${lang.label}. ${lang.text}`,
      `flagged ${r.reason} by the estimator`,
    );
    b.warn(`review-${r.reason}`, lang.text, `a repair in this document was flagged ${r.reason}`);
  }

  for (const [i, u] of (input.unmapped ?? []).entries()) {
    b.item(
      `unmapped-${i}`,
      u.verbatim,
      "needs-review",
      u.reason ?? "This one does not fit the categories we price automatically, so we price it after seeing it.",
      "read from the document but not matched to a priceable repair",
    );
    b.gap(
      `unmapped-gap-${i}`,
      `"${u.verbatim}" could not be matched to a repair we price automatically`,
      docLabel,
      "It is not in the price below.",
      "We will price it by hand. Call us and we will walk through it.",
    );
  }

  /* THE CUSTOMER'S OWN EXCLUSIONS. The review screen lets them remove a
     repair before pricing, and that removal used to erase the item from every
     downstream record. An excluded repair is exactly the thing the disclosure
     exists to name: it is in the document, it is not in the price, and the
     customer chose that. */
  for (const [i, x] of (input.excluded ?? []).entries()) {
    b.item(
      `customer-excluded-${i}`,
      x.description,
      "excluded",
      "Removed at your request on the review screen, so it is not in this price. Add it back any time and we will re-price.",
      "toggled off by the customer before pricing",
    );
  }

  for (const [i, f] of (input.attachedOnly ?? []).entries()) {
    b.gap(
      `attached-only-${i}`,
      `"${f}" was stored for our team but could not be read automatically`,
      docLabel,
      "Anything inside it is not reflected in this price.",
      "We review it by hand; mention anything important from it in your notes.",
    );
  }

  for (const [i, m] of (input.manuallyAdded ?? []).entries()) {
    b.item(
      `manual-${i}`,
      m,
      "included",
      "You added this one yourself, so it is priced from your description rather than from the document.",
      "added manually by the customer",
    );
  }

  /* ------------------------------------------------- extraction limitations
     ONLY WHAT THIS READ ACTUALLY HIT. A document we read cleanly does not get
     told that we might have misread it. */

  if (input.looksLikeRe10 === false) {
    b.gap(
      "not-an-re10",
      "This did not read like an RE-10 or an inspection response",
      docLabel,
      "We may have missed repairs that are in it.",
      "Send the RE-10 itself, or the inspection pages that list the repairs.",
    );
    b.widen(0.08);
  }

  for (const [i, note] of (input.documentNotes ?? []).entries()) {
    b.gap(
      `doc-note-${i}`,
      note,
      docLabel,
      "Anything we could not read is not in the price.",
      "Send a clearer copy of that page and we will re-read it.",
    );
    b.widen(0.03);
  }

  if ((input.unmapped ?? []).length > 0) {
    b.acknowledge(
      `${(input.unmapped ?? []).length} item${(input.unmapped ?? []).length === 1 ? "" : "s"} in my document could not be priced automatically and are not in this number.`,
    );
    b.widen(0.04);
  }

  /* --------------------------------------------------- standing RE-10 risks
     These are properties of repairing an existing house from a document, so
     they apply whenever there is at least one repair. They are still gated:
     an empty read gets none of them. */

  if (estimate.priced.length > 0) {
    b.warn(
      "concealed-damage",
      "Damage behind walls, under floors or above ceilings does not show up until the repair is opened. If there is more than the document describes, we tell you before we carry on.",
      `${estimate.priced.length} repairs priced from a document rather than from an inspection by us`,
    );
    b.factor("What is found once each repair is opened up");
    b.acknowledge("Concealed damage may not be visible until work begins.");

    b.item(
      "permits-re10",
      "Permits, testing and specialty inspections",
      "excluded",
      "Not in this price unless a specific repair above says otherwise. Most inspection repairs do not need one; where a permit is required we bill the fee at cost.",
      "no permit-bearing repair in the priced list",
    );
    /* Site clean-up IS priced; the haul is not. Stated because the engine
       carries no disposal cost beyond tidying, and an undisclosed omission is
       the thing this whole disclosure exists to prevent. */
    b.item(
      "disposal-re10",
      "Skip hire and dump fees on debris-heavy work",
      "excluded",
      "Site clean-up and tidying are included. Where a repair generates more than a truck load - a large drywall tear-out, flooring or roofing debris - the container and tip fee are billed at cost.",
      "always disclosed: the engine prices clean-up labour, not haulage",
    );
    b.item(
      "hazmat-re10",
      "Asbestos, lead, mould and contaminated materials",
      "excluded",
      "Testing and removal are licensed work and are not in this price. If we run into any of it, work stops and a specialist prices that part.",
      "no hazardous material repair identified in the document",
    );
    b.item(
      "hidden-damage",
      "Damage the document does not describe",
      "excluded",
      "This price covers what the document asks for. Anything found beyond that is priced separately and agreed with you first.",
      "priced strictly from the requests read in the document",
    );

    b.factor("Verified measurements at the property");
    b.factor("Current material prices and availability");
  }

  if (input.repairDeadline) {
    b.factor(`Getting the work finished by ${input.repairDeadline}`);
    b.assume(
      "deadline",
      `Scheduled to finish by ${input.repairDeadline}, which is the deadline you gave us.`,
      "repair deadline supplied by the customer",
    );
  }

  /* --------------------------------------------------- confidence and steps */

  // The estimator's own confidence rating is evidence in its own right.
  if (estimate.confidence === "low") b.widen(0.06);
  else if (estimate.confidence === "medium") b.widen(0.03);

  b.acknowledge("This is a preliminary price based only on the document I uploaded and what I told you.");
  b.acknowledge("It is not a binding proposal or a contract.");
  b.acknowledge("Pricing may change after an on-site inspection.");
  b.acknowledge("I have reviewed the repair list above and it reflects what my document asks for.");
  if (estimate.review.length > 0) {
    b.acknowledge("Items marked for an on-site look are not priced in this number.");
  }

  b.next("Confirm the repair list is complete, and add anything the document asks for that we missed.");
  b.next("Book the walkthrough so we can verify quantities and look at anything flagged above.");
  if (input.repairDeadline) b.next(`Confirm access dates that land the work before ${input.repairDeadline}.`);

  return b.build();
}
