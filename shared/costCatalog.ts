/**
 * Component cost catalog and quantity takeoff.
 *
 * WHY THIS EXISTS
 *
 * Pricing a remodel from a single dollars-per-square-foot figure is a proxy.
 * It cannot explain itself to a homeowner, it cannot be adjusted for the one
 * thing that actually differs about their project, and it gives the team
 * nothing to check against a real bid. This module prices the same projects
 * from components and quantities the way an estimator does: linear feet of
 * cabinet, square feet of quartz, count of recessed cans.
 *
 * THE HONESTY CONSTRAINT, AND HOW IT IS ENFORCED
 *
 * A takeoff engine has roughly a dozen unit costs per project type instead of
 * one number per category, and it presents them with a precision that reads as
 * authoritative. Inventing those unit costs would manufacture error at
 * line-item granularity and dress it up as detail. That risk is not
 * theoretical: the 2025 cost guide put a mid-range ADU floor at $210,000 when
 * the cheapest one actually delivered came in near $145,000, a 26 percent
 * error that only a real closed job caught.
 *
 * So no unit cost here is invented. Each is DERIVED by allocating a validated
 * category total across components:
 *
 *     unitCost = (component share x validated category total) / quantity
 *
 * Because the shares sum to exactly 1, the line items always sum back to the
 * number the estimator already quotes. `verify:estimate` asserts that on every
 * project, finish and size, so this module can never silently move a price.
 *
 * WHAT IS AND IS NOT MEASURED
 *
 * - Category totals: validated. From the 2025 Boise Remodeling Cost Guide, and
 *   for ADU from a real closed job (see ESTIMATOR-CALIBRATION.md).
 * - Component shares: industry-typical cost distributions. NOT measured
 *   against Boise Remodeling Co. jobs.
 * - Quantity ratios: standard takeoff rules of thumb.
 *
 * Every component therefore carries a `provenance` field. Nothing should
 * present a `derived` figure to a homeowner as though it were a quoted price.
 *
 * HOW TO REPLACE A DERIVED NUMBER WITH A REAL ONE
 *
 * Set `unitCost` on the component. A component with an explicit `unitCost` is
 * priced as quantity x unitCost and marked `measured`; the remaining share is
 * redistributed across the still-derived components so the total continues to
 * reconcile. Real numbers can therefore arrive one at a time, and accuracy
 * only ever improves.
 */

import type { FinishLevel, ProjectType } from "./estimateEngine";

/**
 * Bump when shares, quantity ratios, or unit costs change. Stored on every
 * lead so an estimate can always be explained months later with the numbers
 * that actually produced it.
 */
export const COST_CATALOG_VERSION = "2026.07.1";

export type ComponentUnit =
  | "linear foot"
  | "square foot"
  | "each"
  | "allowance"
  | "percent of project";

export type Provenance =
  /** Unit cost set from a real price book or closed job. */
  | "measured"
  /** Unit cost derived by allocating a validated category total. */
  | "derived";

/** How a component's quantity is computed from project size. */
export type QuantityBasis =
  /** quantity = projectSqft x factor */
  | { kind: "per-sqft"; factor: number }
  /** quantity = ceil(projectSqft / divisor) */
  | { kind: "per-sqft-count"; divisor: number }
  /** A single lot, allowance, or soft-cost line. */
  | { kind: "lot" };

export interface ComponentDef {
  id: string;
  label: string;
  unit: ComponentUnit;
  /** Share of the project total. Shares within a project must sum to 1. */
  share: number;
  quantity: QuantityBasis;
  /**
   * Set this to a real installed unit cost to convert the line from derived to
   * measured. Leave undefined to derive it from the category total.
   */
  unitCost?: number;
  /** Grouping for display: the work itself, or the cost of running the job. */
  group: "direct" | "soft";
  /** Shown to homeowners to explain what the line covers. */
  note?: string;
}

/*
 * Soft costs are identical across project types because they describe running
 * the job rather than the work itself. Held at 28 percent of project value:
 * project management 8, permits and inspections 2, contingency 5, overhead and
 * profit 13. Direct work therefore accounts for the remaining 72 percent, and
 * every project's direct components below sum to exactly 0.72.
 */
const SOFT_COSTS: ComponentDef[] = [
  {
    id: "project-management",
    label: "Project management and supervision",
    unit: "percent of project",
    share: 0.08,
    quantity: { kind: "lot" },
    group: "soft",
    note: "Scheduling, trade coordination, site supervision, and your single point of contact.",
  },
  {
    id: "permits-inspections",
    label: "Permits and inspections",
    unit: "percent of project",
    share: 0.02,
    quantity: { kind: "lot" },
    group: "soft",
    note: "Permit fees and inspection coordination with your city or county.",
  },
  {
    id: "contingency",
    label: "Contingency",
    unit: "percent of project",
    /* Matches what the price actually contains. The engine carries a 10%
       contingency on direct cost (CONTINGENCY_RATE, engine.ts), which works
       out to ~6% of the customer price once margin is applied
       (0.1d / (1.1d / 0.7) = 6.4%). The display said 5% while the price held
       10-on-direct - the breakdown a homeowner reads should not understate
       the cushion the number is built on. */
    share: 0.06,
    quantity: { kind: "lot" },
    group: "soft",
    note: "Held for conditions found once walls are open. Unused contingency is not spent.",
  },
  {
    id: "overhead-profit",
    label: "Overhead and profit",
    unit: "percent of project",
    share: 0.12,
    quantity: { kind: "lot" },
    group: "soft",
    note: "Insurance, warranty, licensing, and the cost of running a licensed contractor.",
  },
];

/*
 * Direct components per project type. Quantity factors are standard takeoff
 * ratios: a 250 sq ft kitchen yields about 28 linear feet of cabinet, 52 sq ft
 * of countertop, and 6 recessed cans, which is what an estimator would carry.
 */
const DIRECT_COMPONENTS: Record<ProjectType, ComponentDef[]> = {
  kitchen: [
    { id: "cabinetry", label: "Cabinetry", unit: "linear foot", share: 0.24, quantity: { kind: "per-sqft", factor: 0.11 }, group: "direct", note: "Boxes, doors, drawers, and installation." },
    { id: "countertops", label: "Countertops", unit: "square foot", share: 0.09, quantity: { kind: "per-sqft", factor: 0.21 }, group: "direct", note: "Material, fabrication, templating, and install." },
    { id: "backsplash", label: "Backsplash tile", unit: "square foot", share: 0.035, quantity: { kind: "per-sqft", factor: 0.13 }, group: "direct" },
    { id: "flooring", label: "Flooring", unit: "square foot", share: 0.055, quantity: { kind: "per-sqft", factor: 0.95 }, group: "direct" },
    { id: "plumbing-fixtures", label: "Sink, faucet, and disposal", unit: "allowance", share: 0.04, quantity: { kind: "lot" }, group: "direct" },
    { id: "plumbing-labor", label: "Plumbing rough and trim", unit: "allowance", share: 0.035, quantity: { kind: "lot" }, group: "direct" },
    { id: "electrical", label: "Electrical and lighting", unit: "each", share: 0.06, quantity: { kind: "per-sqft-count", divisor: 45 }, group: "direct", note: "Recessed cans, circuits, switches, and under-cabinet lighting." },
    { id: "drywall-paint-trim", label: "Drywall, paint, and trim", unit: "square foot", share: 0.07, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "demolition", label: "Demolition and disposal", unit: "allowance", share: 0.04, quantity: { kind: "lot" }, group: "direct", note: "Tear-out, dumpster, and haul-away." },
    // No appliance-installation line: appliances are client-supplied and the
    // company does not install them, which the exclusions state plainly. A line
    // reading "Appliance installation" in the breakdown contradicted that and
    // read as a service offered. Its 0.015 share was folded into the
    // miscellaneous line below, so the kitchen direct shares still total 0.72
    // and no price moved; the money is simply no longer labeled as appliance
    // work the company does not do.
    { id: "hardware-misc", label: "Hardware and miscellaneous", unit: "allowance", share: 0.055, quantity: { kind: "lot" }, group: "direct", note: "Cabinet hardware, fasteners, surface protection, final detailing, and site cleanup." },
  ],
  bathroom: [
    { id: "shower-tub", label: "Shower or tub system", unit: "allowance", share: 0.15, quantity: { kind: "lot" }, group: "direct", note: "Pan, valve, glass, and surround." },
    { id: "tile-work", label: "Tile work", unit: "square foot", share: 0.12, quantity: { kind: "per-sqft", factor: 1.6 }, group: "direct", note: "Walls and floor, including setting materials." },
    { id: "vanity-storage", label: "Vanity and storage", unit: "linear foot", share: 0.1, quantity: { kind: "per-sqft", factor: 0.06 }, group: "direct" },
    { id: "plumbing-fixtures", label: "Plumbing fixtures", unit: "allowance", share: 0.07, quantity: { kind: "lot" }, group: "direct" },
    { id: "plumbing-labor", label: "Plumbing rough and trim", unit: "allowance", share: 0.06, quantity: { kind: "lot" }, group: "direct" },
    { id: "electrical-vent", label: "Electrical and ventilation", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "drywall-paint-trim", label: "Drywall, paint, and trim", unit: "square foot", share: 0.05, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "demolition", label: "Demolition and disposal", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "flooring", label: "Floor preparation", unit: "square foot", share: 0.04, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "waterproofing", label: "Waterproofing", unit: "square foot", share: 0.03, quantity: { kind: "per-sqft", factor: 0.9 }, group: "direct", note: "Membrane and flood testing before tile." },
  ],
  "whole-home": [
    { id: "kitchen-scope", label: "Kitchen", unit: "allowance", share: 0.2, quantity: { kind: "lot" }, group: "direct" },
    { id: "bathroom-scope", label: "Bathrooms", unit: "allowance", share: 0.15, quantity: { kind: "lot" }, group: "direct" },
    { id: "flooring", label: "Flooring throughout", unit: "square foot", share: 0.09, quantity: { kind: "per-sqft", factor: 0.9 }, group: "direct" },
    { id: "interior-paint-trim", label: "Interior paint and trim", unit: "square foot", share: 0.07, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "electrical", label: "Electrical updates", unit: "allowance", share: 0.06, quantity: { kind: "lot" }, group: "direct" },
    { id: "plumbing", label: "Plumbing updates", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "hvac", label: "HVAC", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "drywall-repair", label: "Drywall repair", unit: "square foot", share: 0.03, quantity: { kind: "per-sqft", factor: 0.5 }, group: "direct" },
    { id: "demolition", label: "Demolition and disposal", unit: "allowance", share: 0.02, quantity: { kind: "lot" }, group: "direct" },
  ],
  addition: [
    { id: "framing", label: "Framing and structure", unit: "square foot", share: 0.14, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "roofing-exterior", label: "Roofing and exterior", unit: "square foot", share: 0.1, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct", note: "Roof structure, siding, and weatherproofing tied into the existing home." },
    { id: "foundation", label: "Foundation", unit: "square foot", share: 0.09, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "insulation-drywall", label: "Insulation and drywall", unit: "square foot", share: 0.07, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "flooring-finishes", label: "Flooring and finishes", unit: "square foot", share: 0.07, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "windows-doors", label: "Windows and doors", unit: "each", share: 0.06, quantity: { kind: "per-sqft-count", divisor: 90 }, group: "direct" },
    { id: "interior-trim-paint", label: "Interior trim and paint", unit: "square foot", share: 0.06, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "electrical", label: "Electrical", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "hvac-extension", label: "HVAC extension", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "plumbing-rough", label: "Plumbing rough-in", unit: "allowance", share: 0.03, quantity: { kind: "lot" }, group: "direct" },
  ],
  adu: [
    { id: "framing", label: "Framing and structure", unit: "square foot", share: 0.13, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "roofing-exterior", label: "Roofing and exterior", unit: "square foot", share: 0.09, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "foundation", label: "Foundation", unit: "square foot", share: 0.08, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "utility-connections", label: "Utility connections", unit: "allowance", share: 0.06, quantity: { kind: "lot" }, group: "direct", note: "Water, sewer, and power runs from the main house or street." },
    { id: "insulation-drywall", label: "Insulation and drywall", unit: "square foot", share: 0.06, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "kitchenette", label: "Kitchen or kitchenette", unit: "allowance", share: 0.06, quantity: { kind: "lot" }, group: "direct" },
    { id: "bathroom", label: "Bathroom", unit: "allowance", share: 0.06, quantity: { kind: "lot" }, group: "direct" },
    { id: "windows-doors", label: "Windows and doors", unit: "each", share: 0.05, quantity: { kind: "per-sqft-count", divisor: 90 }, group: "direct" },
    { id: "electrical", label: "Electrical system", unit: "allowance", share: 0.05, quantity: { kind: "lot" }, group: "direct" },
    { id: "hvac", label: "HVAC system", unit: "allowance", share: 0.04, quantity: { kind: "lot" }, group: "direct", note: "Separate system sized for the unit." },
    { id: "plumbing", label: "Plumbing system", unit: "allowance", share: 0.04, quantity: { kind: "lot" }, group: "direct" },
  ],
  basement: [
    { id: "framing-insulation", label: "Framing and insulation", unit: "square foot", share: 0.13, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "drywall-finish", label: "Drywall and finish", unit: "square foot", share: 0.12, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "flooring", label: "Flooring", unit: "square foot", share: 0.09, quantity: { kind: "per-sqft", factor: 0.95 }, group: "direct" },
    { id: "electrical", label: "Electrical and lighting", unit: "each", share: 0.09, quantity: { kind: "per-sqft-count", divisor: 50 }, group: "direct" },
    { id: "interior-trim-paint", label: "Interior trim and paint", unit: "square foot", share: 0.08, quantity: { kind: "per-sqft", factor: 1.0 }, group: "direct" },
    { id: "egress-window", label: "Egress window", unit: "each", share: 0.06, quantity: { kind: "lot" }, group: "direct", note: "Required for any below-grade sleeping room." },
    { id: "hvac-extension", label: "HVAC extension", unit: "allowance", share: 0.06, quantity: { kind: "lot" }, group: "direct" },
    { id: "doors-millwork", label: "Doors and millwork", unit: "each", share: 0.05, quantity: { kind: "per-sqft-count", divisor: 220 }, group: "direct" },
    { id: "demolition-prep", label: "Preparation and disposal", unit: "allowance", share: 0.04, quantity: { kind: "lot" }, group: "direct" },
  ],
};

export function getComponents(project: ProjectType): ComponentDef[] {
  return [...DIRECT_COMPONENTS[project], ...SOFT_COSTS];
}

/**
 * Real installed unit costs keyed by component id.
 *
 * Stored as one JSON blob in siteSettings so pricing can be corrected without
 * a deploy. Category totals are deliberately NOT editable this way: those are
 * validated figures that should move through the calibration procedure in
 * ESTIMATOR-CALIBRATION.md against a real closed job, not through a text box.
 */
export type UnitCostOverrides = Record<string, number>;

export interface TakeoffLine {
  id: string;
  label: string;
  group: "direct" | "soft";
  unit: ComponentUnit;
  quantity: number;
  /** Installed cost per unit. */
  unitCost: number;
  /** quantity x unitCost, rounded. */
  cost: number;
  provenance: Provenance;
  note?: string;
}

export interface Takeoff {
  project: ProjectType;
  finish: FinishLevel;
  sqft: number;
  lines: TakeoffLine[];
  directCost: number;
  softCost: number;
  /** Sum of every line. Reconciles to the estimate total by construction. */
  total: number;
  catalogVersion: string;
  /** True when every line's unit cost came from a real price book or job. */
  fullyMeasured: boolean;
}

function quantityFor(basis: QuantityBasis, sqft: number): number {
  switch (basis.kind) {
    case "per-sqft":
      return Math.max(1, Math.round(sqft * basis.factor));
    case "per-sqft-count":
      return Math.max(1, Math.ceil(sqft / basis.divisor));
    case "lot":
      return 1;
  }
}

/**
 * Break a validated project total into priced components.
 *
 * `total` must be a figure the estimator already stands behind, normally the
 * midpoint of the range calculateEstimate produced. Components are priced so
 * they sum back to it: any component carrying an explicit `unitCost` is priced
 * directly, and the remainder of the total is distributed across the still
 * derived components in proportion to their shares.
 */
export function buildTakeoff(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  total: number,
  /**
   * Real installed unit costs keyed by component id, from the admin pricing
   * panel. Each one flips its line from derived to measured and is priced
   * directly; the rest of the total redistributes across the still-derived
   * lines, so the takeoff keeps reconciling as real numbers arrive one by one.
   */
  overrides?: UnitCostOverrides
): Takeoff {
  const components = getComponents(project).map((component) => {
    const override = overrides?.[component.id];
    return override !== undefined && Number.isFinite(override) && override >= 0
      ? { ...component, unitCost: override }
      : component;
  });

  const priced = components.map((component) => {
    const quantity = quantityFor(component.quantity, sqft);
    return { component, quantity };
  });

  // Components with a real unit cost are priced first and consume part of the
  // total; the rest is allocated across the derived ones by share.
  const measured = priced.filter((p) => p.component.unitCost !== undefined);
  const derived = priced.filter((p) => p.component.unitCost === undefined);

  const measuredCost = measured.reduce(
    (sum, p) => sum + p.quantity * (p.component.unitCost as number),
    0
  );
  const remaining = Math.max(0, total - measuredCost);
  const derivedShareTotal = derived.reduce((sum, p) => sum + p.component.share, 0);

  const lines: TakeoffLine[] = priced.map(({ component, quantity }) => {
    let cost: number;
    let unitCost: number;
    let provenance: Provenance;

    if (component.unitCost !== undefined) {
      unitCost = component.unitCost;
      cost = quantity * unitCost;
      provenance = "measured";
    } else {
      const weight = derivedShareTotal > 0 ? component.share / derivedShareTotal : 0;
      cost = remaining * weight;
      unitCost = quantity > 0 ? cost / quantity : 0;
      provenance = "derived";
    }

    return {
      id: component.id,
      label: component.label,
      group: component.group,
      unit: component.unit,
      quantity,
      unitCost: Math.round(unitCost * 100) / 100,
      cost: Math.round(cost),
      provenance,
      note: component.note,
    };
  });

  const directCost = lines.filter((l) => l.group === "direct").reduce((s, l) => s + l.cost, 0);
  const softCost = lines.filter((l) => l.group === "soft").reduce((s, l) => s + l.cost, 0);

  return {
    project,
    finish,
    sqft,
    lines,
    directCost,
    softCost,
    total: directCost + softCost,
    catalogVersion: COST_CATALOG_VERSION,
    fullyMeasured: lines.every((l) => l.provenance === "measured"),
  };
}

/**
 * Quantity with its unit, pluralized correctly.
 *
 * Lives here so every consumer (emails, CRM, the estimator UI) renders a line
 * the same way and nobody reinvents it as "28 linear foots".
 */
export function formatQuantity(line: Pick<TakeoffLine, "quantity" | "unit">): string {
  const { quantity, unit } = line;
  if (unit === "allowance" || unit === "percent of project") return "";
  const plural =
    quantity === 1
      ? unit
      : unit === "linear foot"
        ? "linear feet"
        : unit === "square foot"
          ? "square feet"
          : unit;
  return `${quantity.toLocaleString("en-US")} ${plural}`;
}

/**
 * The takeoff for a quoted range.
 *
 * Centralises the midpoint convention so the estimator UI, both emails, and
 * the CRM record can never disagree about what the breakdown is. The midpoint
 * is the right basis because the range's own width already expresses the
 * uncertainty; splitting the low end would understate every line and splitting
 * the high end would overstate every line.
 */
export function takeoffForRange(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  priceLow: number,
  priceHigh: number,
  overrides?: UnitCostOverrides
): Takeoff {
  return buildTakeoff(project, finish, sqft, (priceLow + priceHigh) / 2, overrides);
}

/*
 * Lines the homeowner never sees itemized. Project management and overhead
 * are real costs of running the job, but showing them as separate lines
 * invites negotiating them away line by line. Their dollars are folded
 * proportionally into every remaining line so the client's breakdown still
 * sums to the same total. Admin surfaces (pricing panel, admin email, CRM
 * record) always render the full takeoff.
 */
export const CLIENT_HIDDEN_COMPONENT_IDS = new Set(["project-management", "overhead-profit"]);

/**
 * Vocabulary that must never appear on a lead-facing surface.
 *
 * The hidden lines are removed by `takeoffForClient`, but that only protects
 * the surfaces that remember to call it. This list is what the build actually
 * asserts against the fully rendered customer email, so a new surface that
 * forgets the client view fails `npm run verify:estimate` rather than shipping.
 *
 * The component labels are derived from the catalog rather than retyped, so
 * renaming a hidden line moves the guard with it and cannot silently open a
 * hole. The extra entries are the wordings used on paper proposals: an issued
 * proposal (EST-10079) carried a visible "Contractor OH&P" line, which is the
 * exact failure this guard exists to prevent.
 *
 * Matching is case-insensitive and substring-based, so "overhead" also catches
 * "Overhead & Profit" and "overhead and profit". That is deliberately blunt:
 * the estimate and both emails have no legitimate use for these words. The
 * marketing copy that does use "overhead" ("Don't pay for our overhead") lives
 * on the homepage, which this guard does not cover.
 */
export const CLIENT_FORBIDDEN_PHRASES: string[] = Array.from(
  new Set([
    ...getComponents("kitchen")
      .filter((c) => CLIENT_HIDDEN_COMPONENT_IDS.has(c.id))
      .map((c) => c.label),
    "overhead",
    "profit",
    "OH&P",
    "supervision",
    // Extended 2026-07 for the line-item cost engine. The admin email now
    // carries a real internal breakdown - trade costs, gross profit, the
    // applied margin and its markup equivalent - so the customer email has to
    // be guarded against that vocabulary too, not just the old soft-cost
    // labels. "Contingency" is deliberately NOT here: it renders as a visible
    // scope line in the client view by design, and is a cost the homeowner is
    // genuinely told about rather than an internal figure.
    "margin",
    "markup",
    "internal cost",
    "unit cost",
    "our cost",
    "cost code",
    "gross profit",
  ]),
);

/**
 * The first forbidden phrase present in `html`, or null if it is clean.
 * Shared by the build guard and any runtime caller that wants to assert before
 * sending.
 */
export function findForbiddenPhrase(html: string): string | null {
  // Test the VISIBLE TEXT, not the markup. Email HTML is styled inline, so
  // every "margin:12px" would otherwise trip the "margin" rule and the guard
  // would be useless noise. Strip style/script blocks and all tags first, which
  // also means the check measures what a homeowner actually reads.
  const haystack = html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .toLowerCase();
  for (const phrase of CLIENT_FORBIDDEN_PHRASES) {
    if (haystack.includes(phrase.toLowerCase())) return phrase;
  }
  return null;
}

/**
 * The takeoff as a client is allowed to see it.
 *
 * Removes the hidden lines and redistributes their dollars across every
 * remaining line in proportion to that line's cost, so the visible lines
 * still sum to the original total. Unit costs are recomputed from the
 * inflated line cost so quantity x unit cost stays consistent within the
 * client view. Group subtotals are recomputed from the surviving lines.
 */
export function takeoffForClient(takeoff: Takeoff): Takeoff {
  const hidden = takeoff.lines.filter((l) => CLIENT_HIDDEN_COMPONENT_IDS.has(l.id));
  const visible = takeoff.lines.filter((l) => !CLIENT_HIDDEN_COMPONENT_IDS.has(l.id));
  const hiddenCost = hidden.reduce((s, l) => s + l.cost, 0);
  const visibleCost = visible.reduce((s, l) => s + l.cost, 0);

  if (hiddenCost === 0 || visibleCost === 0) {
    const lines = visible;
    const directCost = lines.filter((l) => l.group === "direct").reduce((s, l) => s + l.cost, 0);
    const softCost = lines.filter((l) => l.group === "soft").reduce((s, l) => s + l.cost, 0);
    return { ...takeoff, lines, directCost, softCost, total: directCost + softCost };
  }

  const factor = (visibleCost + hiddenCost) / visibleCost;
  const lines: TakeoffLine[] = visible.map((line) => {
    const cost = Math.round(line.cost * factor);
    return {
      ...line,
      cost,
      unitCost: line.quantity > 0 ? Math.round((cost / line.quantity) * 100) / 100 : 0,
    };
  });

  // Rounding each line independently can drift a few dollars from the
  // original total; settle the difference on the largest line so the client
  // sees exactly the same total as the full takeoff.
  const drift = takeoff.total - lines.reduce((s, l) => s + l.cost, 0);
  if (drift !== 0 && lines.length > 0) {
    const largest = lines.reduce((a, b) => (b.cost > a.cost ? b : a));
    largest.cost += drift;
    largest.unitCost =
      largest.quantity > 0 ? Math.round((largest.cost / largest.quantity) * 100) / 100 : 0;
  }

  const directCost = lines.filter((l) => l.group === "direct").reduce((s, l) => s + l.cost, 0);
  const softCost = lines.filter((l) => l.group === "soft").reduce((s, l) => s + l.cost, 0);

  return {
    ...takeoff,
    lines,
    directCost,
    softCost,
    total: directCost + softCost,
  };
}

/**
 * Money format for a takeoff line.
 *
 * Deliberately not the planning-range format, which rounds to the nearest
 * thousand: at that resolution five different lines on a mid-range kitchen all
 * render as "$2k" and the breakdown stops carrying information. Deliberately
 * not exact dollars either, because these are allocations of a total rather
 * than priced quantities, and "$1,733" claims a precision that does not exist.
 *
 * Nearest hundred keeps every line distinguishable without overclaiming.
 */
export function formatTakeoffAmount(cost: number): string {
  return `$${(Math.round(cost / 100) * 100).toLocaleString("en-US")}`;
}

/**
 * The sentence that must accompany any display of these line items.
 *
 * The totals are validated but the split between lines is an industry-typical
 * allocation, not a bid this company has priced. Showing a homeowner
 * "$11,880 cabinetry" without this reads as a quote for cabinetry.
 */
export const TAKEOFF_BASIS_NOTICE =
  "This breakdown shows where money typically goes on a project of this size and finish level. Individual lines are typical allocations, not itemized pricing, and the actual split shifts with your selections and site conditions.";

/**
 * The client-facing counterpart, used where the scope renders WITHOUT dollars.
 *
 * Per-line dollar figures were removed from every lead-facing surface: the
 * numbers are proportional allocations of a validated total rather than priced
 * quantities, so printing "$11,880 cabinetry" next to a line both claimed a
 * precision the model does not have and handed a homeowner a negotiating
 * anchor for work nobody had walked yet. The company's own issued proposals
 * (EST-10089) list scope without per-line pricing for the same reason.
 *
 * What survives is more useful and less dangerous: the trades in scope and the
 * quantities the range was actually built from.
 */
export const TAKEOFF_SCOPE_NOTICE =
  "These are the trades and quantities your range was built from. Exact quantities are confirmed during your in-home visit, and the final proposal prices each item individually.";

/** Shares must sum to 1 per project or the takeoff cannot reconcile. */
export function shareSum(project: ProjectType): number {
  return getComponents(project).reduce((sum, c) => sum + c.share, 0);
}
