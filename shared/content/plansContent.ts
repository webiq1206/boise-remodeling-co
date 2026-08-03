/**
 * Copy for the plan-set estimator page.
 *
 * WRITTEN FROM WHAT THE READS ACTUALLY SHOWED, not from what a marketing page
 * would like to claim. Four real Treasure Valley plan sets have been through
 * the extractor, and the specifics here are theirs: which sheets carry usable
 * measurements, why a total square footage has to be asked for, and why a full
 * forty-sheet permit set is the wrong thing to send. A page that promised more
 * than the four sets support would be a page the product then has to apologise
 * for on the results screen.
 */

export interface PlanFaq {
  question: string;
  answer: string;
}

export interface PlanProcessStep {
  title: string;
  body: string;
}

/**
 * The direct answer, roughly 50 words, resolving the core question before any
 * preamble. This is the block answer engines lift.
 */
export const PLANS_DIRECT_ANSWER =
  "Upload your floor plans and schedules and we read the room areas, ceiling heights and fixture counts off the drawings, then price the work from those measurements instead of from a typical house of that size. You confirm what we measured before anything is priced. It takes a couple of minutes.";

export const PLANS_DEFINITION =
  "A plan-set estimate is a remodeling budget built from your actual construction drawings. Rather than asking you to guess a square footage, we read what the architect printed on the sheets: room areas, plate heights, and the door, window and fixture schedules. The result is a planning range grounded in your house rather than an average one.";

export const PLANS_PROCESS: PlanProcessStep[] = [
  {
    title: "Send the sheets we price from",
    body: "Floor plans first, plus any door, window, finish or plumbing fixture schedules. A demolition plan helps on a remodel. You do not need to send the structural details, the foundation sections or the elevations - we do not price from those, and a full permit set is often too heavy to read in one go.",
  },
  {
    title: "We read the drawings",
    body: "We pull the room areas where the drafting office printed them, the plate heights where the sections state them, and the counts from the schedules. Every measurement is tagged with where it came from. Anything we could not read comes back empty rather than guessed at.",
  },
  {
    title: "You confirm what we measured",
    body: "You see the room list and the total before we price anything. Take out what is not part of the project, and tell us the finished square footage of the home. That number is how we catch a misread, so it is the one thing we always ask for.",
  },
  {
    title: "You get a planning range",
    body: "Priced from your measurements at current Treasure Valley costs, with what we used spelled out. If the drawings did not carry enough measurement to price from directly, we say so plainly and build the range from the area you gave us instead.",
  },
];

export const PLANS_WHAT_WE_READ = [
  "Room areas where they are tagged on the floor plans, for example \"Kitchen 303 SF\"",
  "Ceiling and plate heights stated on the sections",
  "Door and window schedules, including the rough opening sizes called out inline",
  "Plumbing fixture and finish schedules where the set includes them",
  "Which rooms are existing to remain and which are in the new work, on a remodel",
];

export const PLANS_WHAT_WE_DO_NOT_USE = [
  "Anything measured against a scale bar. A misread scale produces numbers that look consistent and are completely wrong, and nothing downstream can catch it.",
  "Room sizes we had to infer from an untagged plan. If the area is not printed, we leave it empty and tell you which rooms they were.",
  "The overall building dimensions. What is printed is a chain of dimensions rather than an outline, so an area cannot be recovered from it reliably.",
];

export const PLANS_FAQS: PlanFaq[] = [
  {
    question: "Which sheets should I send?",
    answer:
      "The floor plans and any schedules - door, window, finish, or plumbing fixture. On a remodel, add the demolition plan if you have one. Those are the sheets a price comes off. Structural details, foundation sections and elevations do not change the number and make the file harder to read.",
  },
  {
    question: "Why do you ask for the total square footage if you are reading my plans?",
    answer:
      "Because it is how we check ourselves. Adding up the room areas and comparing them against a stated total is what catches a misread tag before it reaches your price. Most residential sets never state a total anywhere, and it cannot be recovered from the dimension strings, so we ask you. You know it, and it is genuinely independent of our read.",
  },
  {
    question: "What if my drawings do not label room sizes?",
    answer:
      "Some drafting offices tag every room with its square footage and some tag none. If yours do not, we will tell you which rooms came back empty and price from the total area you give us instead. You still get a planning range, we are just honest that it is not built off the drawings.",
  },
  {
    question: "My plan set is a large file and it will not upload. What now?",
    answer:
      "Send the floor plans and schedules on their own rather than the whole set. Large-format drawings are much heavier to process than their file size suggests, so a five-sheet architectural set can be harder to read than a twenty-sheet scan. The sheets we price from are usually only a handful of pages.",
  },
  {
    question: "Is this a quote?",
    answer:
      "No. It is a planning range, built from current Treasure Valley costs for a project like yours. Conditions we cannot see from a drawing will move the number: existing wiring and plumbing behind walls, site access, hidden damage, engineering, and what the permit office asks for. You get a firm number after a walkthrough and a defined scope.",
  },
  {
    question: "Do I need permit-ready drawings, or will schematic plans do?",
    answer:
      "Schematic design plans are fine, and often read better than a full permit set because they are architectural rather than structural. What matters is that the floor plans are there and readable, not what stage the set is at.",
  },
  {
    question: "Do you keep my drawings?",
    answer:
      "They are stored with your enquiry and sent to our estimating team so we can review them by hand alongside the automatic read. We do not share them outside the company.",
  },
  {
    question: "What does this cost?",
    answer:
      "Nothing. The estimate and the review are free, and there is no obligation. We ask for contact details only at the last step, after you have seen and corrected what we read.",
  },
];

export const PLANS_PRICING_DISCLAIMER =
  "Planning ranges are built from current Treasure Valley costs and the measurements on your drawings. They are not quotes. A firm price follows an on-site evaluation and a defined scope of work.";
