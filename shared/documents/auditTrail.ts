/**
 * The internal audit trail: what we extracted, where it came from, and how a
 * quantity was arrived at.
 *
 * WHY IT IS A FIRST-CLASS OBJECT AND NOT LOGGING. An estimate built from a
 * hundred-page set is a claim about a document nobody on our side has read
 * end to end. When the number is questioned - by a customer, by an estimator
 * checking it, or by us six months later - "the model said so" is not an
 * answer. Every priced fact carries the page and the sheet it came from and
 * the sentence it was read out of, so any figure can be walked back to the
 * drawing in about ten seconds.
 *
 * It is also where duplicates and conflicts become visible. Two sheets stating
 * two different areas for one room is a fact ABOUT THE DOCUMENT, not an error
 * to be resolved by picking one silently. It is recorded as a conflict, it
 * blocks a confident price, and it becomes a question for the customer.
 */

export interface FactSource {
  /** Page index into the PageInventory, so the trail joins back to coverage. */
  pageIndex: number;
  filename: string;
  sheet: string | null;
  /** The text the fact was read out of, verbatim. Null when not quotable. */
  quote: string | null;
}

export type FactStatus =
  /** One consistent reading, from one or more agreeing sources. */
  | "confirmed"
  /** Seen more than once and merged; counted ONCE. */
  | "deduplicated"
  /** Sources disagree. Not priced with confidence; raises a question. */
  | "conflict"
  /** No source stated it; a documented default was used. */
  | "assumed"
  /** Named in the documents but explicitly outside the contract. */
  | "excluded";

export interface AuditFact {
  /** Normalised identity used for dedup. Stable across chunks. */
  key: string;
  /** What this is, in the document's own words where possible. */
  label: string;
  /** Family: "room-area", "count", "scope", "repair", "allowance", "alternate". */
  factType: string;
  value: number | null;
  unit: string | null;
  /** Plain sentence: how this number was arrived at. */
  derivation: string;
  status: FactStatus;
  sources: FactSource[];
  /** Populated when status is "conflict". */
  competingValues?: { value: number | null; source: FactSource }[];
}

export interface AuditTrail {
  facts: AuditFact[];
  /** Per-family counts, for the estimator's summary line. */
  totals: Record<string, number>;
}

/** Normalise a label so "KITCHEN", "Kitchen " and "kitchen" are one thing. */
export function normalizeKey(...parts: (string | null | undefined)[]): string {
  return parts
    .map((p) => (p ?? "").toString().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean)
    .join("|");
}

/**
 * How close two readings of the same measurement must be to count as agreeing.
 *
 * Not zero: two sheets legitimately round the same room differently (303 SF on
 * the plan, 302 in the tabulation). Not loose either - the whole reason to
 * track conflicts is that a stale superseded sheet states a genuinely
 * different number, and 5% is comfortably below the smallest revision worth
 * noticing while absorbing rounding.
 */
export const AGREEMENT_TOLERANCE = 0.05;

export function valuesAgree(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  if (a === 0 && b === 0) return true;
  const larger = Math.max(Math.abs(a), Math.abs(b));
  if (larger === 0) return true;
  return Math.abs(a - b) / larger <= AGREEMENT_TOLERANCE;
}

/**
 * Fold a newly-read fact into the trail.
 *
 * THE DEDUP IS THE POINT. A hundred-page set restates the same quantity in
 * several places by design: a room is tagged on the plan and again in a
 * tabulation, a door count appears on the plan and in the schedule. Reading
 * pages independently and concatenating the results double-counts every one of
 * those. Merging on a normalised key means a repeated fact is counted once and
 * gains a second source; a CONTRADICTED fact is marked instead of averaged,
 * because the average of a right number and a wrong one is also wrong.
 */
export function addFact(trail: AuditTrail, incoming: AuditFact): void {
  const existing = trail.facts.find((f) => f.key === incoming.key && f.factType === incoming.factType);

  if (!existing) {
    trail.facts.push({ ...incoming });
    trail.totals[incoming.factType] = (trail.totals[incoming.factType] ?? 0) + 1;
    return;
  }

  // Already contradicted: keep accumulating the evidence, stay contradicted.
  if (existing.status === "conflict") {
    existing.competingValues = [
      ...(existing.competingValues ?? []),
      ...incoming.sources.map((s) => ({ value: incoming.value, source: s })),
    ];
    existing.sources.push(...incoming.sources);
    return;
  }

  if (valuesAgree(existing.value, incoming.value)) {
    existing.sources.push(...incoming.sources);
    if (existing.status === "confirmed") existing.status = "deduplicated";
    existing.derivation =
      `${existing.derivation} Restated on ${incoming.sources.length} further source(s) and counted once.`;
    return;
  }

  existing.status = "conflict";
  existing.competingValues = [
    ...existing.sources.map((s) => ({ value: existing.value, source: s })),
    ...incoming.sources.map((s) => ({ value: incoming.value, source: s })),
  ];
  existing.sources.push(...incoming.sources);
  existing.derivation =
    `Sources disagree on this value. Not used at face value; see the conflict list.`;
}

export function emptyTrail(): AuditTrail {
  return { facts: [], totals: {} };
}

export function conflicts(trail: AuditTrail): AuditFact[] {
  return trail.facts.filter((f) => f.status === "conflict");
}

export function deduplicated(trail: AuditTrail): AuditFact[] {
  return trail.facts.filter((f) => f.status === "deduplicated");
}

/** Readable trail for the internal email and the CRM record. */
export function renderAuditTrail(trail: AuditTrail): string {
  if (trail.facts.length === 0) return "No facts were extracted from the documents.";
  const lines: string[] = ["EXTRACTION AUDIT TRAIL", ""];

  const byType = new Map<string, AuditFact[]>();
  for (const fact of trail.facts) {
    const list = byType.get(fact.factType) ?? [];
    list.push(fact);
    byType.set(fact.factType, list);
  }

  for (const [type, facts] of byType) {
    lines.push(`${type.toUpperCase().replace(/-/g, " ")} (${facts.length})`);
    for (const fact of facts) {
      const value = fact.value === null ? "not stated" : `${fact.value}${fact.unit ? ` ${fact.unit}` : ""}`;
      lines.push(`  ${fact.label}: ${value}  [${fact.status}]`);
      lines.push(`    how: ${fact.derivation}`);
      for (const source of fact.sources) {
        const where = [source.sheet, `page ${source.pageIndex}`, source.filename].filter(Boolean).join(", ");
        lines.push(`    from: ${where}${source.quote ? ` - "${source.quote}"` : ""}`);
      }
      if (fact.competingValues && fact.competingValues.length > 0) {
        for (const competing of fact.competingValues) {
          const where = [competing.source.sheet, `page ${competing.source.pageIndex}`].filter(Boolean).join(", ");
          lines.push(`    CONFLICT: ${competing.value ?? "not stated"} on ${where}`);
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
