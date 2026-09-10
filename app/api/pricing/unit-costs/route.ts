/**
 * Public unit cost overrides for the on-screen estimator.
 *
 * The estimator computes entirely in the browser, so it cannot read the
 * database the admin pricing panel writes to. Without this endpoint the
 * homeowner sees derived allocations while the confirmation email and the CRM
 * show the real measured costs, which is exactly the kind of quiet
 * disagreement between surfaces this project keeps stamping out.
 *
 * On exposure: this publishes no more than the estimator already does. The
 * on-screen breakdown lists each line's quantity and cost, so anyone can
 * already divide 28 linear feet into the cabinetry line and recover the unit
 * cost. Serving the map directly changes convenience, not secrecy.
 *
 * Values only, no component metadata: the catalog itself already ships in the
 * client bundle.
 */

import { NextResponse } from "next/server";
import { COST_CATALOG_VERSION } from "@/shared/costCatalog";
import { readUnitCostOverrides } from "@/lib/unitCostOverrides";

export const dynamic = "force-dynamic";

export async function GET() {
  const overrides = await readUnitCostOverrides();

  return NextResponse.json(
    { catalogVersion: COST_CATALOG_VERSION, overrides },
    {
      headers: {
        // Short cache: pricing edits should reach visitors quickly, but this
        // must not be re-read on every keystroke in the estimator.
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}
