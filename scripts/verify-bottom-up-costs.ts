/**
 * Reconciliation gate for the bottom-up cost model.
 *
 * Sums every project x finish tier from installed unit costs and compares the
 * result against the PRICE_MATRIX midpoint the site prices from today. The
 * matrix is NOT the source of truth here - it is a sanity bound. A combination
 * inside TOLERANCE means the build-up agrees with pricing that came off real
 * jobs; one outside it means the two disagree and a human has to say which is
 * right before the engine is switched over.
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
    const flag = Math.abs(delta) <= TOLERANCE ? "ok  " : (outside++, "WIDE");
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
console.log(outside > 0
  ? `\n${outside} need owner calibration before the engine is switched to the build-up.`
  : "\nAll combinations reconcile; the build-up is ready to drive the price.");
