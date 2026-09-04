/**
 * Reconciliation gate for the bottom-up cost model.
 *
 * The engine now prices from this build-up (owner ruled the old PRICE_MATRIX
 * cells wrong, 2026-09-03), so this is no longer a gate on switching over - it
 * is a drift monitor. It sums every project x finish tier from installed unit
 * costs and reports how far each sits from the retired matrix cell, which is
 * kept only as a historical reference point. Large NEW movement here means
 * someone changed a unit cost; that should be deliberate.
 *
 * Run: npx tsx scripts/verify-bottom-up-costs.ts
 */
import { INSTALLED_UNIT_COSTS, DIRECT_COST_SHARE, FINISH_ORDER } from "../shared/costs/installedUnitCosts";
import { getComponents } from "../shared/costCatalog";
import { PRICE_MATRIX, PROJECT_SIZE_CONFIG } from "../shared/estimateEngine";
import type { FinishLevel, ProjectType } from "../shared/estimateEngine";

const TOLERANCE = 0.15;

function quantityFor(basis: { kind: string; factor?: number; divisor?: number }, sqft: number): number {
  if (basis.kind === "per-sqft") return Math.max(1, Math.round(sqft * (basis.factor ?? 0)));
  if (basis.kind === "per-sqft-count") return Math.max(1, Math.ceil(sqft / (basis.divisor ?? 1)));
  return 1;
}

let checked = 0, outside = 0, missing = 0;
const rows: string[] = [];

for (const project of Object.keys(INSTALLED_UNIT_COSTS) as ProjectType[]) {
  const sqft = PROJECT_SIZE_CONFIG[project].baselineSqft;
  for (const finish of FINISH_ORDER) {
    const cell = PRICE_MATRIX[project]?.[finish as FinishLevel];
    if (!cell) continue;
    let direct = 0;
    for (const c of getComponents(project)) {
      if (c.group !== "direct") continue;
      const unit = INSTALLED_UNIT_COSTS[project][c.id];
      if (!unit) { missing++; rows.push(`  MISSING unit cost: ${project}/${c.id}`); continue; }
      direct += quantityFor(c.quantity as never, sqft) * unit[FINISH_ORDER.indexOf(finish)];
    }
    const total = direct / DIRECT_COST_SHARE;
    const mid = (cell.low + cell.high) / 2;
    const delta = (total - mid) / mid;
    checked++;
    const flag = Math.abs(delta) <= TOLERANCE ? "ok  " : (outside++, "diff");
    rows.push(
      `  ${flag} ${project.padEnd(12)}${finish.padEnd(11)}` +
      `built ${Math.round(total).toLocaleString().padStart(9)}   ` +
      `matrix ${Math.round(mid).toLocaleString().padStart(9)}   ` +
      `${(delta * 100).toFixed(1).padStart(6)}%   $${Math.round(total / sqft)}/sqft`
    );
  }
}

console.log(rows.join("\n"));
console.log(`\n${checked} combinations checked, ${outside} outside ±${TOLERANCE * 100}%, ${missing} missing unit costs.`);
if (missing > 0) { console.error("Every direct component needs an installed unit cost."); process.exit(1); }
console.log(
  `\n${outside} combination(s) differ from the retired matrix by more than ` +
    `${TOLERANCE * 100}%. That is expected where the matrix cell was wrong; ` +
    "investigate only if this number moves unexpectedly."
);
