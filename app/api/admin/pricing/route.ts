/**
 * Admin pricing API.
 *
 * Lets the team replace a derived component unit cost with a real one without
 * a deploy, which is the whole point: every unit cost in the catalog starts as
 * an allocation of a validated category total, and each real number that
 * arrives should be able to take its place immediately.
 *
 * Category totals (PRICE_MATRIX) are deliberately NOT editable here. Those are
 * the validated figures the whole model rests on, and they should move through
 * the calibration procedure in ESTIMATOR-CALIBRATION.md against a real closed
 * job, not through a text box. The ADU base moved 26 percent on the strength
 * of one delivered project; that is the discipline worth protecting.
 */

import { getSession, getUserFromDb } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteSettings } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  COST_CATALOG_VERSION,
  buildTakeoff,
  getComponents,
  isValidOverrideValue,
  OVERRIDE_MIN_UNIT_COST,
  OVERRIDE_MAX_UNIT_COST,
  type UnitCostOverrides,
} from "@/shared/costCatalog";
import {
  calculateEstimate,
  EMPTY_REFINEMENTS,
  getAvailableFinishLevels,
  getProjectSizeConfig,
  PROJECT_LABELS,
  type ProjectType,
} from "@/shared/estimateEngine";

export const UNIT_COST_SETTINGS_KEY = "pricing.unitCostOverrides";

const PROJECTS: ProjectType[] = [
  "kitchen",
  "bathroom",
  "whole-home",
  "addition",
  "adu",
  "basement",
];

async function requireAdmin() {
  const session = await getSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await getUserFromDb(session.userId);
  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!db) {
    return { error: NextResponse.json({ error: "Database unavailable" }, { status: 503 }) };
  }
  return { userId: session.userId };
}

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

/** The full pricing model, with what each component currently costs and why. */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const overrides = await readUnitCostOverrides();

  const projects = PROJECTS.map((project) => {
    const sizeConfig = getProjectSizeConfig(project);
    const finishes = getAvailableFinishLevels(project);
    // Priced at the baseline size and entry finish so every derived unit cost
    // is shown against the same reference the catalog was allocated from.
    const entry = calculateEstimate({
      project,
      finish: finishes[0],
      sqft: sizeConfig.baselineSqft,
      refinements: EMPTY_REFINEMENTS,
    });
    const takeoff = buildTakeoff(
      project,
      finishes[0],
      sizeConfig.baselineSqft,
      (entry.priceLow + entry.priceHigh) / 2,
      overrides
    );

    return {
      project,
      label: PROJECT_LABELS[project].label,
      baselineSqft: sizeConfig.baselineSqft,
      entryFinish: finishes[0],
      entryRange: { low: entry.priceLow, high: entry.priceHigh },
      components: getComponents(project).map((component) => {
        const line = takeoff.lines.find((l) => l.id === component.id);
        return {
          id: component.id,
          label: component.label,
          group: component.group,
          unit: component.unit,
          share: component.share,
          quantity: line?.quantity ?? 0,
          unitCost: line?.unitCost ?? 0,
          cost: line?.cost ?? 0,
          provenance: line?.provenance ?? "derived",
          overridden: overrides[component.id] !== undefined,
        };
      }),
      total: takeoff.total,
    };
  });

  return NextResponse.json({
    catalogVersion: COST_CATALOG_VERSION,
    overrides,
    projects,
    note:
      "Unit costs shown as 'derived' are allocations of a validated category total, not measured prices. Setting a real unit cost replaces that allocation everywhere the estimator, emails, and CRM render a breakdown.",
  });
}

/**
 * Set or clear one component's real unit cost.
 *
 * Body: { componentId: string, unitCost: number | null }
 * A null unitCost removes the override and returns the line to derived.
 */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  let body: { componentId?: unknown; unitCost?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const componentId = typeof body.componentId === "string" ? body.componentId.trim() : "";
  if (!componentId) {
    return NextResponse.json({ error: "componentId is required" }, { status: 400 });
  }

  // Only ids the catalog actually defines, so a typo cannot quietly persist a
  // value that never applies to anything.
  const known = new Set(PROJECTS.flatMap((p) => getComponents(p).map((c) => c.id)));
  if (!known.has(componentId)) {
    return NextResponse.json(
      { error: `Unknown componentId "${componentId}"` },
      { status: 400 }
    );
  }

  const overrides = await readUnitCostOverrides();

  if (body.unitCost === null) {
    delete overrides[componentId];
  } else {
    const unitCost = Number(body.unitCost);
    if (!isValidOverrideValue(unitCost)) {
      return NextResponse.json(
        {
          error:
            `unitCost must be a number between ${OVERRIDE_MIN_UNIT_COST} and ${OVERRIDE_MAX_UNIT_COST}, ` +
            "or null to clear. Zero is not accepted: it removes the component's cost while keeping its line, " +
            "which misstates the whole breakdown.",
        },
        { status: 400 }
      );
    }
    overrides[componentId] = unitCost;
  }

  const value = JSON.stringify(overrides);
  const existing = await db!
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.key, UNIT_COST_SETTINGS_KEY));

  if (existing.length > 0) {
    await db!
      .update(siteSettings)
      .set({ value, updatedAt: new Date(), updatedBy: guard.userId })
      .where(eq(siteSettings.key, UNIT_COST_SETTINGS_KEY));
  } else {
    await db!.insert(siteSettings).values({
      key: UNIT_COST_SETTINGS_KEY,
      value,
      updatedAt: new Date(),
      updatedBy: guard.userId,
    });
  }

  return NextResponse.json({ ok: true, overrides });
}
