import {
  summarizeInventory,
  type PageInventory,
} from "./pageInventory";
import { conflicts, type AuditTrail, type AuditFact } from "./auditTrail";

/**
 * May this document set produce a finished estimate, and if not, what do we
 * need to ask?
 *
 * THE DEFAULT IS NO. Every gate here is a reason a confident number would be
 * wrong, and the failure mode being defended against is not an error message -
 * it is a clean, plausible, precise price built on a document we only half
 * read. That is worse than no price, because a customer can plan around a wide
 * range and cannot recover from a narrow one that was never true.
 *
 * A blocked estimate is NOT a dead end. The customer still gets a range built
 * from whatever we could establish, clearly labelled as the wider number, plus
 * the specific questions that would tighten it. "We could not read pages 40 to
 * 44" with an offer to resend them is a better experience than a number that
 * quietly excluded them.
 */

export type BlockerKind =
  | "pages-unread"
  | "no-pages"
  | "conflicting-values"
  | "low-legibility"
  | "no-priceable-content"
  | "missing-critical-input";

export interface Blocker {
  kind: BlockerKind;
  /** What is wrong, in the customer's language. */
  message: string;
  /** What would clear it. Always actionable, never "contact support". */
  remedy: string;
  /** True when this alone must prevent a tightened price. */
  blocking: boolean;
}

export interface FollowUpQuestion {
  id: string;
  /** The question, asked the way a person would ask it. */
  question: string;
  /** Why we are asking, so it does not read as bureaucracy. */
  why: string;
  /** What kind of answer clears it. */
  answer: "number" | "choice" | "text";
  /** For "choice": the options, drawn from the conflicting readings. */
  options?: string[];
  /** Links the answer back to the fact it resolves. */
  factKey?: string;
}

export interface ReadinessVerdict {
  /**
   * True only when the set was fully read, nothing contradicts, and there is
   * something priceable in it. Gates the TIGHTENED price, never the lead.
   */
  canFinalize: boolean;
  blockers: Blocker[];
  questions: FollowUpQuestion[];
  /** 0 to 1. Coverage and legibility combined; drives the confidence label. */
  confidence: number;
  /** One sentence for the result screen. */
  summary: string;
}

/**
 * Below this share of pages read, the set is not a set - it is a sample, and
 * anything derived from it is a guess about the rest.
 */
export const MIN_PAGE_COVERAGE = 0.95;

/** Mean legibility below this means OCR struggled enough to distrust numbers. */
export const MIN_MEAN_LEGIBILITY = 0.6;

export interface ReadinessInput {
  inventory: PageInventory;
  trail: AuditTrail;
  /** Set false by a caller that found nothing worth pricing. */
  hasPriceableContent: boolean;
  /** Inputs the caller requires but the documents did not supply. */
  missingCriticalInputs?: { label: string; question: string; why: string }[];
}

export function assessReadiness(input: ReadinessInput): ReadinessVerdict {
  const summary = summarizeInventory(input.inventory);
  const blockers: Blocker[] = [];
  const questions: FollowUpQuestion[] = [];

  if (summary.totalPages === 0) {
    return {
      canFinalize: false,
      blockers: [
        {
          kind: "no-pages",
          message: "We could not open any pages from what you sent.",
          remedy: "Send the documents as PDFs or clear photos and we will read them again.",
          blocking: true,
        },
      ],
      questions: [],
      confidence: 0,
      summary: "Nothing could be read.",
    };
  }

  const coverage = summary.read / summary.totalPages;
  if (coverage < 1) {
    const list = summary.failedPages
      .slice(0, 6)
      .map((p) => `${p.filename} page ${p.pageInFile}`)
      .join(", ");
    const more = summary.failedPages.length > 6 ? ` and ${summary.failedPages.length - 6} more` : "";
    blockers.push({
      kind: "pages-unread",
      message: `${summary.failed} of ${summary.totalPages} pages could not be read: ${list}${more}.`,
      remedy:
        "Resend just those pages, ideally as a clearer scan or an export straight from the drawing software, and we will fold them in.",
      // Any unread page blocks a TIGHTENED price: we cannot claim to have
      // priced a document we did not finish reading.
      blocking: coverage < MIN_PAGE_COVERAGE || summary.failed > 0,
    });
  }

  for (const u of input.inventory.unpaginated) {
    blockers.push({
      kind: "pages-unread",
      message: `${u.filename} could not be opened: ${u.reason}`,
      remedy: "Re-export or re-save that file and send it again.",
      blocking: true,
    });
  }

  const readPages = input.inventory.pages.filter((p) => p.status === "read");
  const meanLegibility =
    readPages.length === 0 ? 0 : readPages.reduce((sum, p) => sum + p.legibility, 0) / readPages.length;
  if (readPages.length > 0 && meanLegibility < MIN_MEAN_LEGIBILITY) {
    blockers.push({
      kind: "low-legibility",
      message: "The scans were faint enough that we would be guessing at some of the numbers.",
      remedy: "A higher-resolution scan, or a PDF exported directly from the drawing software, reads far better.",
      blocking: true,
    });
  }

  const contradictions = conflicts(input.trail);
  if (contradictions.length > 0) {
    blockers.push({
      kind: "conflicting-values",
      message: `${contradictions.length} value${contradictions.length === 1 ? "" : "s"} appear${contradictions.length === 1 ? "s" : ""} differently on different sheets.`,
      remedy: "Tell us which reading is current and we will price that one.",
      blocking: true,
    });
    for (const fact of contradictions.slice(0, 8)) questions.push(conflictQuestion(fact));
  }

  if (!input.hasPriceableContent) {
    blockers.push({
      kind: "no-priceable-content",
      message: "We read the pages, but none of them carry the quantities we price from.",
      remedy: "Floor plans, schedules and the demolition plan are the sheets that carry them.",
      blocking: true,
    });
  }

  for (const missing of input.missingCriticalInputs ?? []) {
    blockers.push({
      kind: "missing-critical-input",
      message: `We could not find ${missing.label} anywhere in the documents.`,
      remedy: missing.question,
      blocking: true,
    });
    questions.push({
      id: `missing-${missing.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      question: missing.question,
      why: missing.why,
      answer: "number",
    });
  }

  // Confidence is coverage AND legibility, with contradictions taken off the
  // top: a fully-read set that disagrees with itself is not a confident read.
  const conflictPenalty = Math.min(0.4, contradictions.length * 0.1);
  const confidence = Math.max(0, Math.min(1, coverage * meanLegibility - conflictPenalty));

  const blocking = blockers.filter((b) => b.blocking);
  return {
    canFinalize: blocking.length === 0,
    blockers,
    questions,
    confidence,
    summary: blocking.length === 0
      ? `All ${summary.totalPages} pages read and consistent.`
      : `${blocking.length} thing${blocking.length === 1 ? "" : "s"} to settle before this can be priced tightly.`,
  };
}

function conflictQuestion(fact: AuditFact): FollowUpQuestion {
  const options = (fact.competingValues ?? [])
    .map((c) => {
      const where = c.source.sheet ? `${c.source.sheet}` : `page ${c.source.pageIndex}`;
      return `${c.value ?? "not stated"}${fact.unit ? ` ${fact.unit}` : ""} (${where})`;
    })
    .filter((v, i, all) => all.indexOf(v) === i);

  return {
    id: `conflict-${fact.key}`,
    question: `Which is right for ${fact.label}?`,
    why: "Two of the sheets give different figures for this, so we have not assumed either one.",
    answer: "choice",
    options,
    factKey: fact.key,
  };
}
