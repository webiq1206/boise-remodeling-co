/**
 * Line-item cost engine, public surface.
 *
 * Import from here rather than reaching into individual modules, so the wall
 * between the lead view and the internal estimate stays visible in one place.
 */
export * from "./lineItemCatalog";
export * from "./engine";
export * from "./scopeRules";
export * from "./pricing";
export * from "./outputs";
export * from "./resolve";
export * from "./budget";

import {
  buildInternalEstimate,
  type InternalEstimate,
  type QualityLevel,
  type ScopeSelections,
} from "./engine";
import { buildPlanningRange, type PlanningRange } from "./pricing";
import { buildAdminView, buildLeadView, type AdminView, type LeadSelectionRow, type LeadView } from "./outputs";
import { RULES_BY_PROJECT } from "./scopeRules";
import type { ProjectType } from "../estimateEngine";



export interface EstimateResult {
  lead: LeadView;
  admin: AdminView;
  range: PlanningRange;
  /**
   * The takeoff itself.
   *
   * Exposed for the disclosure builders, which decide what to say about an
   * estimate by reading its actual line items - whether the permit line is
   * there, whether demolition is in scope - rather than from a policy list.
   * NOT for any customer-facing surface: `buildLeadView` still receives only
   * the range and the selection rows, so the wall is where it always was.
   */
  internal: InternalEstimate;
}

/**
 * One call, both views.
 *
 * The lead view is built from the range and the selection rows only; it never
 * receives the internal estimate, so it cannot leak a cost even by accident.
 */
export function estimateProject(
  project: ProjectType,
  selections: ScopeSelections,
  leadSelectionRows: LeadSelectionRow[],
  /**
   * Extra half-width for thin information, from a disclosure builder.
   *
   * Widens only. Zero by default, so every existing caller prices exactly as
   * it did. See `buildPlanningRange` for why the floor is not ours to move.
   */
  bandPenalty = 0,
): EstimateResult {
  const rules = RULES_BY_PROJECT[project];
  if (!rules) throw new Error(`No scope rule set for project type "${project}"`);

  const internal = buildInternalEstimate(rules, selections, project);
  const range = buildPlanningRange(
    internal,
    project,
    selections.quality as QualityLevel,
    selections.sqft,
    bandPenalty,
  );

  return {
    lead: buildLeadView(range, leadSelectionRows),
    admin: buildAdminView(internal, range),
    range,
    internal,
  };
}
