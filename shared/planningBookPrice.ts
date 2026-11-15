import type { FinishLevel, ProjectType } from "./estimateEngine";
import { PRICE_BOOK } from "../lib/p5/priceBookData";
import {
  COST_CATEGORIES,
  DEFAULT_FINANCE,
  calculateP5Estimate,
  type CostCategory,
  type DirectCostLine,
  type Service,
} from "../lib/p5/pricing";

type FinishTier = "builder" | "mid" | "high" | "luxury";

/**
 * Homepage planning ranges.
 *
 * Direct unit costs follow sharedBookRate (tier price, plus the book's remodel
 * premium). The number a customer sees is not that rate. It is the planning
 * range from calculateP5Estimate, the shared engine: contingency, overhead,
 * profit, band, and rounding. This file does not import priceBook.ts, because
 * that module loads node:crypto and the browser bundle cannot. The calculator
 * test locks every direct unit to sharedBookRate and every shown range to the
 * engine.
 */

export interface PlanningRefinements {
  layoutChanges: "none" | "moderate" | "major" | null;
  plumbingElectrical: "cosmetic" | "partial" | "full" | null;
  bathroomCount: number | null;
  kitchenIncluded: boolean | null;
  stories: number | null;
  aduConfig: "detached" | "attached" | null;
  upgradeScope: string[] | null;
}

export interface PlanningLine {
  code: string;
  quantity: number;
  remodel: boolean;
}

const EMPTY: PlanningRefinements = {
  layoutChanges: null,
  plumbingElectrical: null,
  bathroomCount: null,
  kitchenIncluded: null,
  stories: null,
  aduConfig: null,
  upgradeScope: null,
};

const KITCHEN_CHIPS = ["cabinets", "counters", "flooring", "lighting"] as const;
const BATHROOM_CHIPS = ["shower", "tub", "vanity", "tile"] as const;

const roundQty = (n: number) => Math.max(1, Math.round(n));
const countQty = (n: number) => Math.max(1, Math.ceil(n));

const FINISH_TIER: Record<string, FinishTier> = {
  refresh: "builder",
  "mid-range": "mid",
  "high-end": "high",
  luxury: "luxury",
};

const roundMoney = (n: number) => Math.round(n * 100) / 100;

function tierOf(finish: FinishLevel): FinishTier {
  return FINISH_TIER[finish] ?? "mid";
}

function bookAmount(code: string, tier: FinishTier, remodel: boolean): number {
  const row = PRICE_BOOK.find((item) => item[0] === code.replace(/^PB-/, ""));
  if (!row) throw new Error(`Cost book has no unit price for ${code}`);
  const tierPrice = { builder: row[10], mid: row[11], high: row[12], luxury: row[13] }[tier];
  const premium = row[14];
  const withPremium = remodel && premium > 0;
  return roundMoney(tierPrice * (withPremium ? 1 + premium : 1));
}

function remodelOf(project: ProjectType): boolean {
  return project === "kitchen" || project === "bathroom" || project === "whole-home" || project === "basement";
}

function assumedBaths(project: ProjectType, sqft: number): number | null {
  if (project === "whole-home") return Math.max(1, Math.round(sqft / 1000));
  if (project === "basement" || project === "addition") return 0;
  if (project === "adu" || project === "bathroom") return 1;
  return null;
}

function counterCode(finish: FinishLevel): string {
  if (finish === "refresh") return "12-36-01";
  if (finish === "high-end") return "12-36-05";
  if (finish === "luxury") return "12-36-13";
  return "12-36-02";
}

function floorCode(finish: FinishLevel): string {
  if (finish === "refresh") return "09-65-01";
  if (finish === "high-end" || finish === "luxury") return "09-64-03";
  return "09-64-01";
}

function chipLine(project: ProjectType, finish: FinishLevel, sqft: number, id: string, baths: number): PlanningLine | null {
  const remodel = remodelOf(project);
  if (project === "kitchen") {
    if (id === "cabinets") return { code: "12-31-01", quantity: roundQty(sqft * 0.11) * baths, remodel };
    if (id === "counters") return { code: counterCode(finish), quantity: roundQty(sqft * 0.21) * baths, remodel };
    if (id === "flooring") return { code: floorCode(finish), quantity: roundQty(sqft * 0.95) * baths, remodel };
    if (id === "lighting") return { code: "26-50-01", quantity: countQty(sqft / 45) * baths, remodel };
  }
  if (project === "bathroom") {
    if (id === "shower") return { code: "90-30-05", quantity: baths, remodel };
    if (id === "tub") return { code: "90-30-07", quantity: baths, remodel };
    if (id === "vanity") return { code: "12-41-01", quantity: baths, remodel };
    if (id === "tile") return { code: "09-30-04", quantity: roundQty(sqft * 1.6) * baths, remodel };
  }
  return null;
}

function chipsFor(project: ProjectType): readonly string[] {
  if (project === "kitchen") return KITCHEN_CHIPS;
  if (project === "bathroom") return BATHROOM_CHIPS;
  return [];
}

function partialIds(project: ProjectType, scope: string[] | null): string[] | null {
  const chips = chipsFor(project);
  if (!chips.length || !scope || scope.length === 0) return null;
  const selected = scope.filter((id) => chips.includes(id));
  if (selected.length === 0 || selected.length >= chips.length) return null;
  return selected;
}

function assemblyLines(project: ProjectType, sqft: number, ref: PlanningRefinements): PlanningLine[] {
  const remodel = remodelOf(project);
  if (project === "kitchen") return [{ code: "90-20-02", quantity: sqft, remodel }];
  if (project === "bathroom") {
    const baths = Math.max(1, ref.bathroomCount ?? 1);
    return [{ code: "90-30-02", quantity: baths, remodel }];
  }
  if (project === "whole-home") return [{ code: "90-40-01", quantity: sqft, remodel }];
  if (project === "addition") {
    if (ref.stories != null && ref.stories > 1) return [{ code: "90-50-06", quantity: 1, remodel: false }];
    return [{ code: "90-50-01", quantity: sqft, remodel: false }];
  }
  if (project === "adu") {
    const code = ref.aduConfig === "attached" ? "90-50-11" : "90-50-10";
    return [{ code, quantity: 1, remodel: false }];
  }
  return [{ code: "90-40-02", quantity: sqft, remodel }];
}

function permitLine(project: ProjectType): PlanningLine | null {
  if (project === "addition") return { code: "00-20-03", quantity: 1, remodel: false };
  if (project === "adu") return null;
  return { code: "00-20-02", quantity: 1, remodel: false };
}

function adderLines(project: ProjectType, sqft: number, ref: PlanningRefinements): PlanningLine[] {
  const lines: PlanningLine[] = [];
  const remodel = remodelOf(project);
  if (project === "kitchen") {
    if (ref.layoutChanges === "major") lines.push({ code: "90-20-03", quantity: 1, remodel });
    if (ref.plumbingElectrical === "partial" || ref.plumbingElectrical === "full") {
      lines.push({ code: "90-20-04", quantity: 1, remodel });
    }
    if (ref.plumbingElectrical === "full") lines.push({ code: "90-20-05", quantity: 1, remodel });
  }
  if (project === "addition") {
    if (ref.bathroomCount != null && ref.bathroomCount > 0) {
      lines.push({ code: "90-30-02", quantity: ref.bathroomCount, remodel: true });
    }
    if (ref.kitchenIncluded === true) lines.push({ code: "90-20-01", quantity: 1, remodel: true });
  }
  if (project === "basement") {
    if (ref.bathroomCount != null && ref.bathroomCount > 0) {
      lines.push({ code: "90-30-02", quantity: ref.bathroomCount, remodel: true });
    }
    if (ref.kitchenIncluded === true) lines.push({ code: "90-20-10", quantity: 1, remodel: true });
  }
  if (project === "whole-home" && ref.bathroomCount != null) {
    const assumed = assumedBaths(project, sqft) ?? 0;
    const delta = ref.bathroomCount - assumed;
    if (delta > 0) lines.push({ code: "90-30-02", quantity: delta, remodel: true });
    if (delta < 0) lines.push({ code: "90-30-02", quantity: delta, remodel: true });
  }
  if (project === "adu" && ref.bathroomCount != null) {
    const delta = ref.bathroomCount - 1;
    if (delta !== 0) lines.push({ code: "90-30-02", quantity: delta, remodel: true });
  }
  return lines;
}

export function planningLines(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  refinements: PlanningRefinements = EMPTY,
): PlanningLine[] {
  const baths = project === "bathroom" ? Math.max(1, refinements.bathroomCount ?? 1) : 1;
  const partial = partialIds(project, refinements.upgradeScope);
  const lines: PlanningLine[] = [];
  if (partial) {
    for (const id of partial) {
      const line = chipLine(project, finish, sqft, id, baths);
      if (line) lines.push(line);
    }
  } else {
    lines.push(...assemblyLines(project, sqft, refinements));
    lines.push(...adderLines(project, sqft, refinements));
  }
  const permit = permitLine(project);
  if (permit) lines.push(permit);
  return lines;
}

export function lineAmount(line: PlanningLine, finish: FinishLevel): number {
  return bookAmount(line.code, tierOf(finish), line.remodel) * line.quantity;
}

/** Direct total for this planning input. Every dollar is a cost-book rate. Not a customer price. */
export function planningTotal(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  refinements: PlanningRefinements = EMPTY,
): number {
  return planningLines(project, finish, sqft, refinements).reduce(
    (sum, line) => sum + lineAmount(line, finish),
    0,
  );
}

function serviceFor(project: ProjectType): Service {
  if (project === "basement") return "remodel";
  if (project === "kitchen" || project === "bathroom" || project === "whole-home" || project === "addition" || project === "adu") return project;
  return "remodel";
}

function categoryFor(code: string): CostCategory {
  if (code.startsWith("00-20")) return "permits-inspections";
  if (code === "01-01-07") return "other-direct";
  return "subcontractors";
}

/** The book's minimum service charge, as a balance line, only when direct cost is below it. */
function withMinimum(lines: PlanningLine[], finish: FinishLevel): PlanningLine[] {
  const priced = lines.filter((line) => line.quantity > 0);
  const direct = priced.reduce((sum, line) => sum + lineAmount(line, finish), 0);
  const minimum = bookAmount("01-01-07", tierOf(finish), false);
  if (direct <= 0 || direct >= minimum) return priced;
  const quantity = Math.ceil(((minimum - direct) / minimum) * 100) / 100;
  return [...priced, { code: "01-01-07", quantity, remodel: false }];
}

/**
 * Customer planning range for these direct book lines.
 * Markup, overhead, the band, and rounding all come from calculateP5Estimate.
 */
export function customerRangeForLines(
  lines: PlanningLine[],
  project: ProjectType,
  finish: FinishLevel,
): { low: number; high: number } {
  const priced = withMinimum(lines, finish);
  if (!priced.length) throw new Error("No cost-book line to price");
  const directLines: DirectCostLine[] = priced.map((line, index) => ({
    id: `plan-${index + 1}`,
    category: categoryFor(line.code),
    description: `Cost book ${line.code}`,
    quantity: line.quantity,
    unit: "unit",
    unitCost: bookAmount(line.code, tierOf(finish), line.remodel),
    priceBasis: "direct-cost" as const,
    estimatingBasis: "owner-average-cost" as const,
    quantitySource: "Customer planning selection",
    evidence: {
      basis: "owner-estimating-schedule" as const,
      reference: `PB-${line.code}`,
      verifiedAt: "2026-11-15",
      validUntil: "2027-11-15",
    },
  }));
  const used = new Set(directLines.map((line) => line.category));
  const estimate = calculateP5Estimate({
    estimatePurpose: "preliminary",
    bookPriced: true,
    service: serviceFor(project),
    revision: "planning-1",
    scopeSummary: `${project} planning range`,
    lines: directLines,
    coverage: COST_CATEGORIES.map((category) => used.has(category)
      ? { category, status: "included" as const, reason: "Priced from the shared cost book." }
      : { category, status: "not-applicable" as const, reason: "Not in this planning assembly." }),
    risks: [],
    assumptions: [],
    exclusions: [],
    missingInformation: [],
    allowances: [],
    uncertainty: "medium",
    locationProvided: false,
  }, DEFAULT_FINANCE, [], new Date("2026-11-15T12:00:00.000Z"));
  if (!estimate.publishable || !estimate.planningRange) {
    const blocked = estimate.warnings.filter((warning) => warning.severity === "block").map((warning) => warning.message);
    throw new Error(blocked.join("; ") || "The shared engine did not publish a range");
  }
  return estimate.planningRange;
}

/** The range a customer is shown. Direct book rates never leave this function. */
export function customerPlanningRange(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  refinements: PlanningRefinements = EMPTY,
): { low: number; high: number } {
  return customerRangeForLines(planningLines(project, finish, sqft, refinements), project, finish);
}

/** Projects the book prices per room or per dwelling, not per square foot. */
export function pricedPerRoom(project: ProjectType): boolean {
  return project === "bathroom" || project === "adu";
}
