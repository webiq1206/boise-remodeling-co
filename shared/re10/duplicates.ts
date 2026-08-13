import type { ExtractedRepair } from "./extraction";
import { normalizeKey } from "../documents/auditTrail";

/**
 * Suspected duplicate repairs - FLAGGED, never silently merged.
 *
 * Long inspection responses restate the same repair in more than one place:
 * a summary list at the front and a detailed paragraph later, or the same item
 * carried into an addendum. Pricing both charges the customer twice for one
 * job. That was the audit finding, and it is real.
 *
 * But the opposite mistake is worse and this codebase has already been bitten
 * by it: "Repair drywall in bedroom 1" and "Repair drywall in bedroom 2" are
 * two jobs, and a similarity threshold confident enough to catch every restated
 * item will eventually eat one of them. CLAUDE.md's rule is that nothing the
 * customer asked for may silently vanish, and an over-eager de-duplicator is
 * exactly a silent vanish with good intentions.
 *
 * So this detects and ASKS. A suspected pair becomes a question on the review
 * screen - "is this one job or two?" - which the customer answers in a second,
 * with the default being that both are kept. Detection can be aggressive
 * because the consequence of a false positive is one extra question, not a
 * lost repair.
 */

export interface DuplicatePair {
  /** Index into the repair list. */
  a: number;
  b: number;
  /** 0 to 1. How alike the two requests read. */
  similarity: number;
  /** Why we think these might be the same, in the customer's language. */
  reason: string;
}

/** Words that carry no distinguishing signal in a repair request. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "at", "in", "on", "of", "for", "with",
  "is", "are", "be", "as", "per", "from", "by", "that", "this", "it", "its",
  "seller", "buyer", "shall", "will", "repair", "replace", "install", "provide",
  "item", "see", "above", "below", "noted", "report", "inspection", "page",
]);

function tokens(text: string): Set<string> {
  return new Set(
    normalizeKey(text)
      .split(/[\s|]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Jaccard overlap of the meaningful words in two requests. */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  const union = ta.size + tb.size - shared;
  return union === 0 ? 0 : shared / union;
}

/**
 * Where a pair stops being "similar work" and starts being "probably the same
 * sentence twice". Tuned deliberately high: at 0.6 a drywall patch in two
 * different bedrooms still scores below the line, because the room word is the
 * only token they do not share and the rest of the sentence is identical
 * boilerplate that the stopword list already strips.
 */
export const DUPLICATE_THRESHOLD = 0.7;

/**
 * A cross-reference is a much stronger signal than word overlap: a document
 * that says "see item 3" is telling us outright that this is a restatement.
 */
const CROSS_REFERENCE = /\b(see|per|refer to|same as|duplicate of)\s+(item|no\.?|number|#)?\s*\d+/i;

export function findDuplicatePairs(repairs: ExtractedRepair[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];

  for (let i = 0; i < repairs.length; i++) {
    for (let j = i + 1; j < repairs.length; j++) {
      const a = repairs[i];
      const b = repairs[j];

      // Different repair categories are different work, whatever the wording.
      if (a.kind !== b.kind) continue;

      // A stated location that differs is decisive: bedroom 1 is not bedroom 2.
      const locA = normalizeKey(a.location ?? "");
      const locB = normalizeKey(b.location ?? "");
      if (locA && locB && locA !== locB) continue;

      const score = similarity(a.verbatim, b.verbatim);
      const crossReferenced = CROSS_REFERENCE.test(a.verbatim) || CROSS_REFERENCE.test(b.verbatim);

      if (crossReferenced && score >= 0.4) {
        pairs.push({
          a: i,
          b: j,
          similarity: score,
          reason: "One of these refers back to the other, so it may be the same repair listed twice.",
        });
        continue;
      }
      if (score >= DUPLICATE_THRESHOLD) {
        pairs.push({
          a: i,
          b: j,
          similarity: score,
          reason: "These two read as the same repair described twice.",
        });
      }
    }
  }

  return pairs;
}

/**
 * Repairs whose quantities disagree while describing the same work.
 *
 * Separate from duplicates because the remedy differs: a duplicate asks "one
 * job or two?", a quantity conflict asks "which measurement is right?".
 */
export interface QuantityConflict {
  a: number;
  b: number;
  quantityA: number | null;
  quantityB: number | null;
}

export function findQuantityConflicts(
  repairs: ExtractedRepair[],
  pairs: DuplicatePair[],
): QuantityConflict[] {
  const conflicts: QuantityConflict[] = [];
  for (const pair of pairs) {
    const qa = repairs[pair.a].quantity ?? null;
    const qb = repairs[pair.b].quantity ?? null;
    if (qa === null || qb === null) continue;
    const larger = Math.max(qa, qb);
    if (larger === 0) continue;
    if (Math.abs(qa - qb) / larger > 0.05) {
      conflicts.push({ a: pair.a, b: pair.b, quantityA: qa, quantityB: qb });
    }
  }
  return conflicts;
}
