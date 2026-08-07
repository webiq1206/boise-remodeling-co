/**
 * THE SINGLE SOURCE OF THE QUOTED RANGE.
 *
 * The calculator computes a range in the browser and both API routes recompute
 * it on the server and use the server's answer. If those two ever disagree the
 * homeowner sees one number on the page and a different one in their email, so
 * every caller goes through this one function rather than mapping selections to
 * scope on its own.
 *
 * DELIBERATELY NOT IN index.ts. The barrel re-exports every module in this
 * folder, and importing the resolver through it made the client bundle evaluate
 * modules in an order where RULES_BY_PROJECT was still undefined when the
 * calculator first rendered. The resolver then returned null, the calculator
 * fell back to the guide engine, and the site quietly kept quoting the old
 * numbers while every server-side test passed. Importing from the concrete
 * modules below removes the cycle entirely. Do not move this into the barrel.
 */
import { buildInternalEstimate, type QualityLevel, type ScopeSelections } from "./engine";
import { buildPlanningRange } from "./pricing";
import { buildAdminView } from "./outputs";
import { RULES_BY_PROJECT } from "./scopeRules";
import type { ProjectType } from "../estimateEngine";

/** The refinement shape both the calculator and the API routes hold. */
export interface ResolverRefinements {
  layoutChanges?: unknown;
  plumbingElectrical?: unknown;
  cabinetTier?: unknown;
  fixtureCount?: number | null;
  bathroomCount?: number | null;
  kitchenIncluded?: boolean | null;
  upgradeScope?: string[] | null;
}

function toSelections(
  finish: string,
  sqft: number,
  refinements: ResolverRefinements,
): ScopeSelections {
  return {
    quality: finish as QualityLevel,
    sqft,
    layoutChanges: (refinements.layoutChanges ?? null) as ScopeSelections["layoutChanges"],
    plumbingElectrical: (refinements.plumbingElectrical ?? null) as ScopeSelections["plumbingElectrical"],
    cabinetTier: (refinements.cabinetTier ?? null) as ScopeSelections["cabinetTier"],
    fixtureCount: refinements.fixtureCount ?? null,
    bathroomCount: refinements.bathroomCount ?? null,
    kitchenIncluded: refinements.kitchenIncluded ?? null,
    upgradeScope: refinements.upgradeScope ?? null,
    // The company does not sell or install appliances; see APPLIANCE_DISCLAIMER.
  };
}

/**
 * The customer-facing range.
 *
 * Returns null for a project with no rule set, letting the caller fall back to
 * the guide engine rather than throwing at a lead.
 */
export function resolveQuotedRange(
  project: ProjectType,
  finish: string,
  sqft: number,
  refinements: ResolverRefinements,
): { priceLow: number; priceHigh: number } | null {
  const rules = RULES_BY_PROJECT[project];
  if (!rules) return null;
  const selections = toSelections(finish, sqft, refinements);
  const internal = buildInternalEstimate(rules, selections, project);
  const range = buildPlanningRange(internal, project, selections.quality, sqft);
  return { priceLow: range.low, priceHigh: range.high };
}

/** The internal estimate and trade rollup behind a quoted number, for admin surfaces. */
export function resolveInternalEstimate(
  project: ProjectType,
  finish: string,
  sqft: number,
  refinements: ResolverRefinements,
) {
  const rules = RULES_BY_PROJECT[project];
  if (!rules) return null;
  const selections = toSelections(finish, sqft, refinements);
  const internal = buildInternalEstimate(rules, selections, project);
  const range = buildPlanningRange(internal, project, selections.quality, sqft);
  return { internal, range, admin: buildAdminView(internal, range) };
}
