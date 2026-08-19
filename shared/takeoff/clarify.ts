import { COMMON_WORK_TYPES, describeWork, type ClassifiedWork } from "./workTypes";
import { TRADE_LABELS, type TakeoffUnit, type Trade } from "./units";

/**
 * The clarification loop: ask ONE good question, price what the answer
 * unlocks, then ask the next one.
 *
 * WHY ONE AT A TIME. The honest alternative to guessing is asking, but a
 * screen of thirty questions is not asking - it is handing the work back. An
 * estimator answers "what do you charge per linear foot for a paneled bar
 * front" in four seconds; they abandon a form with thirty fields. So the queue
 * is ordered by how much it unblocks and served one at a time, and every
 * answer is applied immediately so the next question is chosen knowing what
 * the previous one just settled.
 *
 * TWO KINDS OF MISSING THING, AND THEY GO TO DIFFERENT PEOPLE. A RATE question
 * ("what do you charge for this") is for whoever owns the pricing. A
 * MEASUREMENT question ("the drawings do not dimension the back bar - how long
 * is it") is for the customer or the architect. Collapsing them into one list
 * sends half the questions to someone who cannot answer them.
 *
 * ANSWERS ARE KEPT. A rate answered once becomes a rate in the book, keyed to
 * the work type, so the same question is never asked twice and the company's
 * coverage grows out of the jobs it actually bid rather than out of a
 * purchased cost database that was never true here.
 */

export type QuestionKind =
  /** We know the quantity; nobody has told us the price. For the estimator. */
  | "rate"
  /** The drawings did not say how much there is. For the customer/architect. */
  | "measurement"
  /** The read is ambiguous and the answer changes what gets priced. */
  | "scope";

export interface ClarifyingQuestion {
  id: string;
  kind: QuestionKind;
  /** The question, phrased the way a person would ask it. */
  question: string;
  /** Why it is being asked, so it does not read as bureaucracy. */
  why: string;
  /** What a valid answer looks like. */
  answer:
    | { type: "money-per-unit"; unit: TakeoffUnit }
    | { type: "quantity"; unit: TakeoffUnit }
    | { type: "choice"; options: string[] }
    | { type: "text" };
  /** Work type this settles, when it is a rate question. */
  workType?: string;
  trade: Trade;
  /** Item indices this question unblocks. */
  unblocks: number[];
  /** Total quantity riding on the answer, in `unit`. */
  quantityAtStake: number;
  unit: TakeoffUnit | "";
  /** Sheets the work was read from, so the answer can be checked. */
  sheets: string[];
}

export interface ClarifiableItem {
  description: string;
  trade: Trade;
  quantity: number;
  unit: TakeoffUnit | "";
  sheet: string | null;
  work: ClassifiedWork;
  /** True when a rate already covers it. */
  priced: boolean;
}

/**
 * Build the question queue from a classified takeoff.
 *
 * Questions are grouped by work type, never per item: one bar-front rate
 * answers every bar-front line at once, and asking three times because the
 * drawings drew three elevations is exactly the wall of questions this exists
 * to avoid.
 */
export function buildQuestions(items: ClarifiableItem[]): ClarifyingQuestion[] {
  const questions: ClarifyingQuestion[] = [];

  /* RATE QUESTIONS, one per work type. */
  const byWorkType = new Map<string, { items: ClarifiableItem[]; indices: number[] }>();
  items.forEach((item, index) => {
    if (item.priced) return;
    if (!(item.quantity > 0 && item.unit)) return; // measured elsewhere
    const key = `${item.work.workType}|${item.unit}`;
    const bucket = byWorkType.get(key) ?? { items: [], indices: [] };
    bucket.items.push(item);
    bucket.indices.push(index);
    byWorkType.set(key, bucket);
  });

  for (const [key, bucket] of byWorkType) {
    const first = bucket.items[0];
    const unit = first.unit as TakeoffUnit;
    const total = bucket.items.reduce((sum, i) => sum + i.quantity, 0);
    const rounded = Math.round(total * 100) / 100;
    const sheets = [...new Set(bucket.items.map((i) => i.sheet).filter(Boolean) as string[])];
    const described = describeWork(first.work, rounded, unit);

    questions.push({
      id: `rate:${key}`,
      kind: "rate",
      question: `What do you charge per ${unitWord(unit)} for ${describeWork(first.work, 0, "").trim()}?`,
      why:
        `The drawings carry ${rounded} ${unit} of it` +
        (sheets.length > 0 ? ` on ${sheets.slice(0, 3).join(", ")}` : "") +
        (bucket.items.length > 1 ? `, across ${bucket.items.length} locations` : "") +
        `. One number prices all of it.`,
      answer: { type: "money-per-unit", unit },
      workType: first.work.workType,
      trade: first.trade,
      unblocks: bucket.indices,
      quantityAtStake: rounded,
      unit,
      sheets,
    });
    void described;
  }

  /* MEASUREMENT QUESTIONS, one per item, because a length is per-thing. */
  items.forEach((item, index) => {
    if (item.priced) return;
    if (item.quantity > 0 && item.unit) return;
    const expected = expectedUnit(item.work.workType, item.trade);
    questions.push({
      id: `measure:${index}`,
      kind: "measurement",
      question: `How much ${describeWork(item.work, 0, "").trim()} is there?`,
      why:
        item.work.needsToKnow.length > 0
          ? item.work.needsToKnow.join(" ")
          : `We found it${item.sheet ? ` on ${item.sheet}` : ""} but the sheets do not dimension it, so it is not in the price yet.`,
      answer: { type: "quantity", unit: expected },
      workType: item.work.workType,
      trade: item.trade,
      unblocks: [index],
      quantityAtStake: 0,
      unit: expected,
      sheets: item.sheet ? [item.sheet] : [],
    });
  });

  /* SCOPE QUESTIONS, where the classifier itself was unsure. A low-confidence
     classification priced at a confident rate is a wrong number wearing a
     right one's clothes. */
  items.forEach((item, index) => {
    if (item.priced || item.work.confidence >= 0.6) return;
    questions.push({
      id: `scope:${index}`,
      kind: "scope",
      question: `What is this, exactly: "${item.description.slice(0, 90)}"?`,
      why: `We could not tell what kind of work this is from the sheets, and the price depends on it.`,
      answer: { type: "text" },
      trade: item.trade,
      unblocks: [index],
      quantityAtStake: item.quantity,
      unit: item.unit,
      sheets: item.sheet ? [item.sheet] : [],
    });
  });

  return orderQuestions(questions);
}

/**
 * Most valuable question first.
 *
 * VALUE WITHOUT PRICES IS THE AWKWARD PART: ranking by dollar exposure needs
 * the very rates we are asking for. So the proxy is how much the answer
 * unblocks - a rate covering nine lines beats one covering a single line - and
 * quantity breaks ties within that. Rate questions outrank measurement ones
 * because a rate is answerable on the spot while a measurement usually needs
 * somebody else, and the goal is to price as much as possible per question
 * asked.
 */
export function orderQuestions(questions: ClarifyingQuestion[]): ClarifyingQuestion[] {
  const kindRank: Record<QuestionKind, number> = { rate: 0, scope: 1, measurement: 2 };
  return [...questions].sort((a, b) => {
    if (kindRank[a.kind] !== kindRank[b.kind]) return kindRank[a.kind] - kindRank[b.kind];
    if (b.unblocks.length !== a.unblocks.length) return b.unblocks.length - a.unblocks.length;
    if (b.quantityAtStake !== a.quantityAtStake) return b.quantityAtStake - a.quantityAtStake;
    return a.id.localeCompare(b.id);
  });
}

/** The next single question, or null when there is nothing left to ask. */
export function nextQuestion(
  questions: ClarifyingQuestion[],
  answered: Set<string>,
): ClarifyingQuestion | null {
  return questions.find((q) => !answered.has(q.id)) ?? null;
}

function unitWord(unit: TakeoffUnit): string {
  switch (unit) {
    case "LF": return "linear foot";
    case "SF": return "square foot";
    case "SY": return "square yard";
    case "CY": return "cubic yard";
    case "EA": return "each";
    case "HR": return "hour";
    case "TON": return "ton";
    case "LB": return "pound";
    case "LS": return "lump sum";
    default: return unit;
  }
}

/** The unit this kind of work is normally measured in. */
function expectedUnit(workType: string, trade: Trade): TakeoffUnit {
  const known = COMMON_WORK_TYPES[workType];
  if (known) return known.unit;
  // Sensible per-trade default when the work type is new.
  if (trade === "millwork" || trade === "finish-carpentry") return "LF";
  if (trade === "painting" || trade === "drywall" || trade === "flooring" || trade === "tile") return "SF";
  if (trade === "concrete") return "CY";
  return "EA";
}

/** Readable label for grouping questions in the UI. */
export function questionGroup(q: ClarifyingQuestion): string {
  return TRADE_LABELS[q.trade];
}
