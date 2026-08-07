import {
  buildPropertyRows,
  buildSelectionRows,
  formatUsd,
  type VerifiedEstimate,
  type LeadContact,
  type PropertyEnrichment,
} from "@/server/services/consultationEmail";
import {
  takeoffForRange,
  formatQuantity,
  formatTakeoffAmount,
  TAKEOFF_BASIS_NOTICE,
  type UnitCostOverrides,
} from "@/shared/costCatalog";
import {
  buildEstimateDisclosure,
  NOT_A_QUOTE_NOTICE,
  ONSITE_REQUIRED_NOTICE,
  PROJECT_LABELS,
  FINISH_LABELS,
} from "@/shared/estimateEngine";

/**
 * The complete record of what a homeowner saw, selected, and was told, built
 * once and shared by the CRM forward so the stored record can never disagree
 * with the confirmation email.
 *
 * Everything here is derived from the same helpers the emails render from
 * (buildSelectionRows, buildEstimateDisclosure), rather than restated. If the
 * estimator's copy or scope changes, the CRM record follows automatically.
 */
export interface LeadEstimateRecord {
  /**
   * Pricing-alert kinds the route raised while verifying this estimate
   * (recompute mismatch, clamped sqft, zero or implausible total). Set by the
   * route, not here, because only the route saw the client's original numbers.
   * Rides the CRM passthrough so the team sees the price needed attention.
   */
  pricingAlerts?: string[];
  projectType: string;
  projectLabel: string;
  /** The layout/type card chosen, e.g. "L-Shape". */
  layout?: string;
  sizeSqft: number;
  finishLevel: string;
  finishLabel: string;
  /** The "what are you upgrading" chips ticked. */
  upgradesSelected: string[];
  priceLow: number;
  priceHigh: number;
  currency: "USD";
  formattedRange: string;
  confidence: string;
  typicalRoiPercent: number;
  /** Every pricing input, exactly as the homeowner saw it labelled. */
  pricingFactors: { label: string; value: string }[];
  includes: string[];
  excludes: string[];
  assumptions: string[];
  increasesCost: string[];
  decreasesCost: string[];
  optionalUpgrades: string[];
  /** The disclaimers shown on screen and in the email, verbatim. */
  disclaimers: string[];
  /**
   * Component breakdown of the range midpoint: what work, what quantity, what
   * it typically costs. Lets the team compare the estimate against a real bid
   * line by line instead of arguing about one total.
   */
  takeoff: {
    catalogVersion: string;
    /** False while any unit cost is still a derived allocation. */
    fullyMeasured: boolean;
    directCost: number;
    softCost: number;
    total: number;
    lines: {
      id: string;
      label: string;
      group: "direct" | "soft";
      quantity: number;
      unit: string;
      unitCost: number;
      cost: number;
      provenance: string;
    }[];
  };
}

export function buildLeadEstimateRecord(
  est: VerifiedEstimate,
  overrides?: UnitCostOverrides,
): LeadEstimateRecord {
  const disclosure = buildEstimateDisclosure({
    project: est.project,
    finish: est.finish,
    sqft: est.sqft,
    refinements: est.refinements,
  });

  const takeoff = takeoffForRange(
    est.project,
    est.finish,
    est.sqft,
    est.priceLow,
    est.priceHigh,
    overrides,
  );

  const rows = buildSelectionRows(
    est.project,
    est.finish,
    est.sqft,
    est.refinements,
    est.layoutLabel,
    est.upgradeLabels
  );

  return {
    projectType: est.project,
    projectLabel: PROJECT_LABELS[est.project].label,
    layout: est.layoutLabel,
    sizeSqft: est.sqft,
    finishLevel: est.finish,
    finishLabel: FINISH_LABELS[est.finish].label,
    upgradesSelected: est.upgradeLabels ?? [],
    priceLow: est.priceLow,
    priceHigh: est.priceHigh,
    currency: "USD",
    formattedRange: `${formatUsd(est.priceLow)} to ${formatUsd(est.priceHigh)}`,
    confidence: est.confidence,
    typicalRoiPercent: Math.round(est.roi),
    pricingFactors: rows,
    includes: disclosure.includes,
    excludes: disclosure.excludes,
    assumptions: disclosure.assumptions,
    increasesCost: disclosure.increases,
    decreasesCost: disclosure.decreases,
    optionalUpgrades: disclosure.upgrades,
    disclaimers: [NOT_A_QUOTE_NOTICE, ONSITE_REQUIRED_NOTICE, TAKEOFF_BASIS_NOTICE],
    takeoff: {
      catalogVersion: takeoff.catalogVersion,
      fullyMeasured: takeoff.fullyMeasured,
      directCost: takeoff.directCost,
      softCost: takeoff.softCost,
      total: takeoff.total,
      lines: takeoff.lines.map((line) => ({
        id: line.id,
        label: line.label,
        group: line.group,
        quantity: line.quantity,
        unit: line.unit,
        unitCost: line.unitCost,
        cost: line.cost,
        provenance: line.provenance,
      })),
    },
  };
}

/**
 * A budget band for the CRM that is never empty.
 *
 * The gate asks for a budget but allows it to be skipped, and the consultation
 * form does not ask at all, so the column was blank on most leads. When the
 * homeowner did not state one, the estimator's own band is the best available
 * signal, marked "(est.)" so nobody on the team mistakes a computed range for
 * something the homeowner actually said. The distinction is also spelled out in
 * the estimate summary, which records "Stated budget: Not provided".
 */
export function resolveBudgetRange(
  statedBudget: string | undefined,
  est: VerifiedEstimate | null
): string | undefined {
  if (statedBudget && statedBudget.trim()) return statedBudget.trim();
  if (!est) return undefined;
  return `${formatUsd(est.priceLow)} - ${formatUsd(est.priceHigh)} (est.)`;
}

/**
 * The county parcel record as structured data for the CRM.
 *
 * Carries both named fields (so the dashboard can query or filter on zoning,
 * lot size and owner occupancy) and the exact label/value rows the admin email
 * renders, so the CRM and the email can never show different figures. Only
 * fields the county actually published are present: Canyon has no assessed
 * value, owner or subdivision, and zoning there covers Nampa city limits only.
 */
export interface LeadPropertyRecord {
  county?: string;
  jurisdiction?: string;
  parcelId?: string;
  zoning?: string;
  zoningCategory?: string;
  lotSizeAcres?: number;
  lotSizeSqFt?: number;
  assessedValue?: number;
  ownerName?: string;
  ownerOccupied?: boolean;
  subdivision?: string;
  permittingAuthority?: string;
  /** Ready to render, identical to the admin email's parcel block. */
  rows: { label: string; value: string }[];
}

export function buildLeadPropertyRecord(
  profile: PropertyEnrichment | null | undefined
): LeadPropertyRecord | undefined {
  if (!profile) return undefined;
  const rows = buildPropertyRows(profile).map(([label, value]) => ({ label, value }));
  if (rows.length === 0) return undefined;

  const record: LeadPropertyRecord = {
    county: profile.county === "ada" ? "Ada County" : profile.county === "canyon" ? "Canyon County" : undefined,
    jurisdiction: profile.jurisdiction,
    parcelId: profile.parcelId,
    zoning: profile.zoning,
    zoningCategory: profile.zoningCategory,
    lotSizeAcres: profile.lotSizeAcres,
    lotSizeSqFt: profile.lotSizeSqFt,
    assessedValue: profile.assessedValue,
    ownerName: profile.ownerName,
    ownerOccupied: profile.ownerOccupied,
    subdivision: profile.subdivision,
    permittingAuthority: profile.permittingAuthority,
    rows,
  };

  // Drop undefined keys so the dashboard never stores empty columns for a
  // county that simply does not publish that field.
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as LeadPropertyRecord;
}

/**
 * Dashboard intake fields the estimator can answer honestly.
 *
 * The dashboard accepts 37 fields; the estimator legitimately fills 21. The
 * remaining 16 belong to its own Part 2 questionnaire (site status, plans
 * status, decision maker, priority factors and so on) and this tool never asks
 * them. They stay empty on purpose: a guessed answer in a structured field is
 * worse than a blank one, because the team cannot tell the difference.
 *
 * smsOptIn is deliberately never set. It is a consent record, and asserting
 * consent nobody gave is a TCPA problem, not a data-completeness win.
 */
export function buildCrmIntakeFields(est: VerifiedEstimate | null): {
  additionAttached?: string;
  targetHomeSizeRange?: string;
} {
  if (!est) return {};
  const out: { additionAttached?: string; targetHomeSizeRange?: string } = {};

  // Only ADU actually asks attached vs detached, so only ADU answers it.
  if (est.project === "adu" && est.refinements.aduConfig) {
    out.additionAttached = est.refinements.aduConfig === "attached" ? "yes" : "no";
  }

  /*
   * Only for new construction. On an addition or ADU the project square
   * footage IS the size of the space being built, which is what this field
   * means. On a kitchen or bath it is the area of one room, and reporting that
   * as the target home size would be actively misleading.
   */
  if (est.project === "adu" || est.project === "addition") {
    out.targetHomeSizeRange = `${est.sqft.toLocaleString("en-US")} sq ft`;
  }

  return out;
}

/** Concise statement of what the homeowner wants done, for the goals field. */
export function buildProjectGoals(est: VerifiedEstimate | null): string | undefined {
  if (!est) return undefined;
  const bits = [
    `${PROJECT_LABELS[est.project].label}${est.layoutLabel ? ` (${est.layoutLabel})` : ""}`,
    `${est.sqft.toLocaleString("en-US")} sq ft`,
    `${FINISH_LABELS[est.finish].label} finish`,
  ];
  if (est.upgradeLabels?.length) bits.push(`Upgrading: ${est.upgradeLabels.join(", ")}`);
  return bits.join(" | ");
}

function section(title: string, lines: string[]): string {
  if (lines.length === 0) return "";
  return `${title}\n${lines.map((l) => `  ${l}`).join("\n")}\n`;
}

/**
 * A plain-text rendering of the whole record.
 *
 * The CRM's field schema is not known from this repository, so structured
 * fields it does not recognise may be dropped. This string is the guarantee:
 * whatever else happens, one notes field carries the complete record in a
 * consistent, readable, searchable shape. Section headings are stable and
 * uppercase so they can be searched or parsed later.
 */
export function buildLeadNotes(
  lead: LeadContact,
  est: VerifiedEstimate | null,
  profile?: PropertyEnrichment | null,
  overrides?: UnitCostOverrides,
): string {
  const parts: string[] = [];

  parts.push(
    section("CONTACT", [
      `Name: ${lead.name}`,
      `Phone: ${lead.phone}`,
      `Email: ${lead.email}`,
      `Address: ${lead.address || "Not provided"}${lead.zip ? ` ${lead.zip}` : ""}`,
      `Stated budget: ${lead.budget || "Not provided"}`,
    ])
  );

  if (est) {
    const r = buildLeadEstimateRecord(est, overrides);
    parts.push(
      section("ESTIMATE SHOWN TO HOMEOWNER", [
        `Planning range: ${r.formattedRange}`,
        `Detail level: ${r.confidence}`,
        `Typical resale ROI: ~${r.typicalRoiPercent}%`,
      ])
    );
    parts.push(
      section(
        "SELECTIONS",
        r.pricingFactors.map((f) => `${f.label}: ${f.value}`)
      )
    );
    parts.push(section("WHAT THE RANGE COVERS", r.includes));
    parts.push(section("WHAT IT DOES NOT COVER", r.excludes));
    parts.push(section("ASSUMPTIONS USED", r.assumptions));
    parts.push(section("COULD INCREASE THE FINAL COST", r.increasesCost));
    parts.push(section("COULD DECREASE THE FINAL COST", r.decreasesCost));
    parts.push(section("OPTIONAL UPGRADES PRESENTED", r.optionalUpgrades));
    parts.push(
      section(
        "WHERE THE MONEY TYPICALLY GOES",
        r.takeoff.lines
          .filter((line) => line.cost > 0)
          .map((line) => {
            const qty = formatQuantity({ quantity: line.quantity, unit: line.unit as any });
            return `${line.label}${qty ? ` (${qty})` : ""}: ${formatTakeoffAmount(line.cost)}`;
          })
          .concat([
            `Direct work: ${formatUsd(r.takeoff.directCost)}`,
            `Running the job: ${formatUsd(r.takeoff.softCost)}`,
            `Total: ${formatUsd(r.takeoff.total)}  [catalog ${r.takeoff.catalogVersion}, ${r.takeoff.fullyMeasured ? "measured" : "derived allocation"}]`,
          ]),
      ),
    );
    parts.push(section("DISCLAIMERS SHOWN", r.disclaimers));
  } else {
    parts.push(section("ESTIMATE SHOWN TO HOMEOWNER", ["No planning range was attached."]));
  }

  if (lead.message) {
    parts.push(section("NOTES FROM THE HOMEOWNER", [lead.message]));
  }

  if (profile) {
    const enrichment = buildPropertyRows(profile).map(
      ([label, value]) => `${label}: ${value}`
    );
    if (enrichment.length > 0) {
      parts.push(section("COUNTY PARCEL RECORD", enrichment));
    }
  }

  return parts.filter(Boolean).join("\n").trimEnd();
}
