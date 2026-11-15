/**
 * The local installed-cost table is retired. This check only confirms the
 * table can no longer supply a dollar, and that the cost book still prices
 * every homepage project.
 */
import assert from "node:assert/strict";
import { INSTALLED_UNIT_COSTS } from "../shared/costs/installedUnitCosts";
import { planningTotal } from "../shared/planningBookPrice";
import { PROJECT_SIZE_CONFIG, getAvailableFinishLevels } from "../shared/estimateEngine";
import type { ProjectType } from "../shared/estimateEngine";

for (const project of Object.keys(INSTALLED_UNIT_COSTS) as ProjectType[]) {
  assert.equal(Object.keys(INSTALLED_UNIT_COSTS[project]).length, 0, project);
  const sqft = PROJECT_SIZE_CONFIG[project].baselineSqft;
  for (const finish of getAvailableFinishLevels(project)) {
    const total = planningTotal(project, finish, sqft);
    assert.ok(total > 0, `${project}/${finish}`);
  }
}
console.log("retired unit-cost table is empty; cost book prices every project");
