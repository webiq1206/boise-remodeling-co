/**
 * What an estimate says about itself, generated from the estimate.
 *
 * THE RULE THIS MODULE EXISTS TO ENFORCE: nothing is displayed unless something
 * in the actual calculation produced it. Not a curated list of things that are
 * usually true, not a disclaimer block with the project name substituted in.
 * Every assumption, inclusion, exclusion, warning and acknowledgment below
 * carries an `evidence` string naming the line item, selection, document gap or
 * measurement that put it there, and `verify:disclosure` fails the build if any
 * of them is empty.
 *
 * WHY THAT MATTERS MORE THAN IT SOUNDS. A generic exclusion list is worse than
 * no list: it tells a homeowner that permits are excluded on a job where we
 * priced the permit, which is false, and it buries the one exclusion that
 * actually applies to them among fifteen that do not. The moment a customer
 * learns the disclaimers are boilerplate they stop reading all of them,
 * including the one that would have saved an argument on site.
 *
 * TWO TOOLS, TWO VOCABULARIES, DELIBERATELY NOT SHARED. A remodel estimate is
 * about scope a homeowner is choosing; an RE-10 is about repairs someone else
 * wrote down and a document we may have misread. The failure modes are
 * different, so the protections are different, and the two builders below share
 * this file's plumbing and none of its sentences.
 */

/** How an item relates to the number the customer is looking at. */
export type DisclosureStatus =
  /** Priced, and in the range. */
  | "included"
  /** Not in the range, and named so nobody assumes otherwise. */
  | "excluded"
  /** Not in the range, but we can price it if they want it. */
  | "optional"
  /** In the range at a placeholder value that will move on selection. */
  | "allowance"
  /** In or out cannot be settled from what we have. */
  | "needs-review"
  /** Settled by standing in the room, not by more questions. */
  | "needs-onsite"
  /** Needs a licensed trade or an engineer before it can be priced. */
  | "needs-specialist";

export interface DisclosureItem {
  /** Stable across runs, so the UI and the admin record can key on it. */
  id: string;
  label: string;
  status: DisclosureStatus;
  /** Plain language, specific to this estimate. Shown to the customer. */
  detail: string;
  /** What in the calculation produced this. Never empty; asserted. */
  evidence: string;
}

export interface EstimateAssumption {
  id: string;
  /** A full sentence about THIS project. */
  text: string;
  evidence: string;
}

export interface ConditionWarning {
  id: string;
  text: string;
  /** The actual project condition that made this relevant. Never empty. */
  trigger: string;
}

/**
 * Something we could not read, could not measure, or were never told.
 *
 * Four fields because a useful message answers four questions, and the spec is
 * right that a bare "some information was missing" is worthless. What is
 * missing, where, what it did to the estimate, and what the customer can do.
 */
export interface MissingInformation {
  id: string;
  what: string;
  where: string;
  effect: string;
  remedy: string;
}

export type ConfidenceLevel = "high" | "medium" | "low";

export interface Disclosure {
  assumptions: EstimateAssumption[];
  items: DisclosureItem[];
  warnings: ConditionWarning[];
  missing: MissingInformation[];
  /** What will move the final number. Only what applies. */
  factors: string[];
  /** What the customer is asked to acknowledge. Only what applies. */
  acknowledgments: string[];
  confidence: ConfidenceLevel;
  /**
   * Extra half-band, added to the estimator's floor, for thin information.
   *
   * ONLY EVER WIDENS. The 15 percent floor is not ours to tighten: five
   * back-tested jobs landed at 0.96, 1.25, 1.00, 1.01 and 0.99 of the engine
   * and every one of them had a known floor area, so that spread is estimator
   * variance rather than input error. Better documents cannot buy their way
   * below it. Worse documents can and should push above it, which is what this
   * is for.
   */
  bandPenalty: number;
  nextSteps: string[];
}

/** Never let a stack of penalties turn a range into a shrug. */
export const MAX_BAND_PENALTY = 0.2;

export function confidenceFromBand(penalty: number): ConfidenceLevel {
  if (penalty <= 0.001) return "high";
  return penalty <= 0.075 ? "medium" : "low";
}

/* ------------------------------------------------------------- assembly */

/**
 * A tiny builder, so every rule reads as "when X, say Y because Z" and a rule
 * that forgets its evidence cannot compile into the output.
 */
export class DisclosureBuilder {
  private readonly assumptions: EstimateAssumption[] = [];
  private readonly items: DisclosureItem[] = [];
  private readonly warnings: ConditionWarning[] = [];
  private readonly missing: MissingInformation[] = [];
  private readonly factors: string[] = [];
  private readonly acknowledgments: string[] = [];
  private readonly nextSteps: string[] = [];
  private penalty = 0;

  assume(id: string, text: string, evidence: string): void {
    if (!evidence.trim()) throw new Error(`Assumption "${id}" has no evidence.`);
    if (!this.assumptions.some((a) => a.id === id)) this.assumptions.push({ id, text, evidence });
  }

  /**
   * AN ITEM MAY ONLY BE CLAIMED ONCE. The commonest way a disclosure block goes
   * wrong is saying a thing is included in one section and excluded in another,
   * which the spec calls out explicitly. First writer wins and the second is a
   * programming error rather than a display quirk, so it throws.
   */
  item(id: string, label: string, status: DisclosureStatus, detail: string, evidence: string): void {
    if (!evidence.trim()) throw new Error(`Disclosure item "${id}" has no evidence.`);
    const existing = this.items.find((i) => i.id === id);
    if (existing) {
      if (existing.status !== status) {
        throw new Error(`Disclosure item "${id}" claimed as both ${existing.status} and ${status}.`);
      }
      return;
    }
    this.items.push({ id, label, status, detail, evidence });
  }

  warn(id: string, text: string, trigger: string): void {
    if (!trigger.trim()) throw new Error(`Warning "${id}" has no trigger.`);
    if (!this.warnings.some((w) => w.id === id)) this.warnings.push({ id, text, trigger });
  }

  gap(id: string, what: string, where: string, effect: string, remedy: string): void {
    if (!this.missing.some((m) => m.id === id)) this.missing.push({ id, what, where, effect, remedy });
  }

  factor(text: string): void {
    if (!this.factors.includes(text)) this.factors.push(text);
  }

  acknowledge(text: string): void {
    if (!this.acknowledgments.includes(text)) this.acknowledgments.push(text);
  }

  next(text: string): void {
    if (!this.nextSteps.includes(text)) this.nextSteps.push(text);
  }

  /** Widen the band. Never narrows; the floor is not ours to move. */
  widen(amount: number): void {
    if (amount > 0) this.penalty = Math.min(MAX_BAND_PENALTY, this.penalty + amount);
  }

  build(): Disclosure {
    const bandPenalty = Number(this.penalty.toFixed(3));
    return {
      assumptions: this.assumptions,
      items: this.items,
      warnings: this.warnings,
      missing: this.missing,
      factors: this.factors,
      acknowledgments: this.acknowledgments,
      confidence: confidenceFromBand(bandPenalty),
      bandPenalty,
      nextSteps: this.nextSteps,
    };
  }
}

/** Every string a customer could read, for the leak detector to sweep. */
export function disclosureText(d: Disclosure): string {
  return [
    ...d.assumptions.map((a) => a.text),
    ...d.items.map((i) => `${i.label} ${i.detail}`),
    ...d.warnings.map((w) => w.text),
    ...d.missing.map((m) => `${m.what} ${m.where} ${m.effect} ${m.remedy}`),
    ...d.factors,
    ...d.acknowledgments,
    ...d.nextSteps,
  ].join("\n");
}
