/**
 * The two views of an estimate, and the wall between them.
 *
 * A LEAD sees: the planning range, a summary of what they told us, and the
 * disclaimers. Nothing else. No unit costs, no line items, no trade totals, no
 * margin, no markup, no contingency figure, no internal cost. The range and the
 * summary are the entire customer-facing surface, on the website and in the
 * confirmation email alike.
 *
 * An ADMIN sees: parent trades with the quantity that drove them, internal cost,
 * the margin actually applied, the customer-facing amount, and any warnings.
 * Child line items are computed and retained for audit but collapsed by default,
 * because a forty-line takeoff is not a briefing.
 *
 * The wall is enforced by construction rather than by discipline: buildLeadView
 * cannot reach a cost, because it is never handed one. It takes the range and
 * the selections and nothing else.
 */
// Import from the concrete modules, never from ./index: index re-exports this
// file, so importing back from it forms a cycle that resolves to undefined at
// runtime in a bundled client component.
import type { CostLine, EstimateWarning, InternalEstimate, TradeRollup } from "./engine";
import { marginToMarkup } from "./engine";
import type { PlanningRange } from "./pricing";

/* ------------------------------------------------------------- lead view */

export interface LeadSelectionRow {
  label: string;
  value: string;
}

export interface LeadView {
  /** Formatted, e.g. "$28,000 to $39,000". */
  range: string;
  low: number;
  high: number;
  selections: LeadSelectionRow[];
  disclaimers: string[];
}

/**
 * Everything a homeowner is told about how the number was reached.
 *
 * Written to be honest about the limits of an online estimate rather than to
 * sound cautious. Each line names a specific thing a web form cannot see, so a
 * homeowner understands why the number is a range and what would narrow it.
 */
export const LEAD_DISCLAIMERS: string[] = [
  "This is a planning range, not a quote. It is built from current Treasure Valley costs for a project like yours.",
  "Final pricing requires an on-site evaluation and a fully defined scope of work.",
  "Conditions we cannot see from here will move the number: existing framing, wiring and plumbing behind walls, site access, hidden water or structural damage, engineering requirements, and what the permit office asks for.",
  "Your final selections move it too. Cabinetry, stone, tile and fixtures span a wide range at every finish level.",
  "We will confirm the scope in writing before any work begins, and you will have a firm number before you commit.",
];

function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/**
 * Build the customer-facing view.
 *
 * Deliberately takes the range and the selection rows only. There is no path
 * from here to a cost, a margin or a line item, so no future edit can leak one
 * without changing this signature and being noticed in review.
 */
export function buildLeadView(range: PlanningRange, selections: LeadSelectionRow[]): LeadView {
  return {
    range: `${formatUsd(range.low)} to ${formatUsd(range.high)}`,
    low: range.low,
    high: range.high,
    selections,
    disclaimers: LEAD_DISCLAIMERS,
  };
}

/* ------------------------------------------------------------ admin view */

export interface AdminTradeRow {
  division: string;
  /** e.g. "250 SF, 28 LF" - what drove the quantity. */
  scopeSummary: string;
  internalCost: number;
  customerAmount: number;
  /** Retained for audit, collapsed by default in the UI. */
  children: CostLine[];
}

export interface AdminView {
  trades: AdminTradeRow[];
  directCost: number;
  contingency: number;
  totalInternalCost: number;
  customerPrice: number;
  range: { low: number; high: number };
  /** "30% gross margin (42.9% markup)" */
  marginLabel: string;
  marginTrimmed: boolean;
  /** "0.85x to 1.15x of centre" */
  rangeLabel: string;
  assumptions: string[];
  warnings: EstimateWarning[];
  /** Gross profit in dollars at the applied margin. */
  grossProfit: number;
}

/**
 * Build the internal view.
 *
 * Customer amounts are assigned to each trade in proportion to its internal
 * cost, so the trade rows sum to the quoted centre exactly. Assigning them any
 * other way would make the parent totals disagree with the number the homeowner
 * was shown, which is the first thing anyone checks.
 */
export function buildAdminView(estimate: InternalEstimate, range: PlanningRange): AdminView {
  const scale = estimate.totalInternalCost > 0 ? range.centre / estimate.totalInternalCost : 0;

  const trades: AdminTradeRow[] = estimate.trades.map((t: TradeRollup) => ({
    division: t.division,
    scopeSummary: t.scopeSummary,
    internalCost: t.internalCost,
    // Scale from DIRECT cost through the contingency and margin in one step, so
    // the rows reconcile to the centre rather than to the pre-contingency total.
    customerAmount: t.lines.some(l=>l.sellingUnitPrice!==undefined)
      ?t.lines.reduce((sum,l)=>sum+Math.round(l.quantity*(l.sellingUnitPrice||0)*100)/100,0)
      :t.internalCost/(estimate.directCost-(estimate.ownerServiceCost||0))*(range.centre-(estimate.ownerServicePrice||0)),
    children: t.lines,
  }));

  const marginPct = Math.round(range.appliedMargin * 1000) / 10;
  const markupPct = Math.round(marginToMarkup(range.appliedMargin) * 1000) / 10;

  return {
    trades,
    directCost: estimate.directCost,
    contingency: estimate.contingency,
    totalInternalCost: estimate.totalInternalCost,
    customerPrice: range.centre,
    range: { low: range.low, high: range.high },
    marginLabel: `${marginPct}% gross margin (${markupPct}% markup)${range.marginTrimmed ? ", trimmed to stay within the market ceiling" : ""}`,
    marginTrimmed: range.marginTrimmed,
    rangeLabel: `${(range.low / range.centre).toFixed(2)}x to ${(range.high / range.centre).toFixed(2)}x of ${formatUsd(range.centre)}`,
    assumptions: estimate.assumptions,
    warnings: range.warnings,
    grossProfit: range.centre - estimate.totalInternalCost,
  };
}

/**
 * Strings that must never appear on a lead-facing surface.
 *
 * Superset of the existing CLIENT_FORBIDDEN_PHRASES guard, extended for the
 * line-item engine: a homeowner must not see internal cost, margin or markup
 * vocabulary either. Asserted against the rendered lead view in the invariant
 * suite, so a new field on LeadView that carries one fails the build.
 */
export const LEAD_FORBIDDEN_PHRASES: string[] = [
  "overhead",
  "profit",
  "OH&P",
  "supervision",
  "Project management and supervision",
  "margin",
  "markup",
  "internal cost",
  "unit cost",
  "contingency",
  "cost code",
];

/** The first forbidden phrase in a rendered lead surface, or null if clean. */
export function findLeadLeak(rendered: string): string | null {
  const hay = rendered.toLowerCase();
  for (const p of LEAD_FORBIDDEN_PHRASES) {
    if (hay.includes(p.toLowerCase())) return p;
  }
  return null;
}
