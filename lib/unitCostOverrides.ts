import {db} from "./db";
import {siteSettings} from "@/shared/schema";
import {eq} from "drizzle-orm";
import {isValidOverrideValue,type UnitCostOverrides} from "@/shared/costCatalog";
export const UNIT_COST_SETTINGS_KEY="pricing.unitCostOverrides";

export async function readUnitCostOverrides(): Promise<UnitCostOverrides> {
  if (!db) return {};
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, UNIT_COST_SETTINGS_KEY));
    if (rows.length === 0) return {};
    const parsed = JSON.parse(rows[0].value) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: UnitCostOverrides = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidOverrideValue(value)) out[id] = value;
    }
    return out;
  } catch {
    // A malformed blob must not take pricing down; fall back to derived costs.
    return {};
  }
}

