import {
  escapeHtml,
  wrapEmailHtml,
  EMAIL_BRAND,
} from "@/server/services/emailLayout";
import { SITE_CONFIG, textReplyLineHtml } from "@/shared/siteConfig";
import {
  takeoffForRange,
  takeoffForClient,
  formatQuantity,  TAKEOFF_SCOPE_NOTICE,
  type UnitCostOverrides,
} from "@/shared/costCatalog";
import { resolveInternalEstimate } from "@/shared/costs/resolve";
import { assessBudget, budgetGuidance } from "@/shared/costs/budget";
import {
  getRefinementVisibility,
  getPlumbingElectricalLabel,
  buildEstimateDisclosure,
  NOT_A_QUOTE_NOTICE,
  ONSITE_REQUIRED_NOTICE,
  PROJECT_LABELS,
  FINISH_LABELS,
  type EstimateRefinements,
  type ProjectType,
  type FinishLevel,
} from "@/shared/estimateEngine";

/** The server-verified estimate, carrying everything the emails render. */
export interface VerifiedEstimate {
  project: ProjectType;
  finish: FinishLevel;
  sqft: number;
  priceLow: number;
  priceHigh: number;
  roi: number;
  confidence: string;
  refinements: EstimateRefinements;
  included: string[];
  /** The layout/type card the visitor picked, e.g. "L-Shape". */
  layoutLabel?: string;
  /** The upgrade chips they ticked, e.g. ["Cabinets", "Counters"]. */
  upgradeLabels?: string[];
  /** What the homeowner said they were working toward, if they told us. */
  statedBudget?: number | null;
}

/** The lead's submitted contact details + note. */
export interface LeadContact {
  name: string;
  phone: string;
  email: string;
  address: string;
  zip?: string;
  projectType: string;
  budget?: string;
  message?: string;
}

/** Optional county property enrichment shown to the internal team only. */
export interface PropertyEnrichment {
  county?: "ada" | "canyon";
  parcelId?: string;
  lotSizeSqFt?: number;
  lotSizeAcres?: number;
  zoning?: string;
  zoningCategory?: string;
  subdivision?: string;
  ownerName?: string;
  ownerOccupied?: boolean;
  assessedValue?: number;
  permittingAuthority?: string;
  jurisdiction?: string;
}

/**
 * Lead dashboard the internal team works out of. Overridable per environment so
 * a staging deploy does not point staff at production leads.
 *
 * This links to the dashboard root rather than a specific lead: the inserts in
 * the lead routes do not capture the generated row id, and the dashboard's URL
 * shape for an individual lead is not known here, so a deep link would be a
 * guess that could land on a 404. Swap in a per-lead URL once both are settled.
 */
export const LEADS_DASHBOARD_URL =
  process.env.NEXT_PUBLIC_LEADS_DASHBOARD_URL ?? "https://leads.boiseremodeling.co";

export function formatUsd(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

/** Only quotes/backslashes/newlines break a Reply-To header; strip them. */
export function formatLeadReplyTo(name: string, email: string): string {
  const clean = name.replace(/[\r\n"\\]/g, "").trim();
  return clean ? `"${clean}" <${email}>` : email;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function telHrefOf(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/**
 * Human-readable label/value pairs for every selection the visitor made in the
 * estimator, in the order they appear in the tool. Only fields that apply to the
 * chosen project and that the visitor actually set are included.
 */
export function buildSelectionRows(
  project: ProjectType,
  finish: FinishLevel,
  sqft: number,
  r: EstimateRefinements,
  /** The layout/type card the visitor picked, e.g. "L-Shape". */
  layoutLabel?: string,
  /** The "what are you upgrading" chips they ticked, e.g. ["Cabinets"]. */
  upgradeLabels?: string[]
): { label: string; value: string }[] {
  const visibility = getRefinementVisibility(project);
  const isNewConstruction = project === "addition" || project === "adu";

  // Ordered to mirror the estimator itself, so the email reads back exactly the
  // sequence of choices the visitor made and nothing they picked is missing.
  const rows: { label: string; value: string }[] = [
    { label: "Project type", value: PROJECT_LABELS[project].label },
  ];

  if (layoutLabel) rows.push({ label: "Layout / type", value: layoutLabel });

  rows.push({ label: "Approx. size", value: `${sqft.toLocaleString("en-US")} sq ft` });

  rows.push({
    label: "Upgrading",
    value:
      upgradeLabels && upgradeLabels.length > 0
        ? upgradeLabels.join(", ")
        : "None selected",
  });

  rows.push({ label: "Finish level", value: FINISH_LABELS[finish].label });

  if (visibility.layoutChanges && r.layoutChanges) {
    const map: Record<string, string> = {
      none: "No layout changes",
      moderate: "Moderate (non-structural walls)",
      major: "Major (structural walls, engineered)",
    };
    rows.push({ label: "Layout changes", value: map[r.layoutChanges] });
  }

  if (visibility.plumbingElectrical && r.plumbingElectrical) {
    const remodel: Record<string, string> = {
      cosmetic: "Staying put (nothing moves location)",
      partial: "Some moves (a few lines or circuits relocate)",
      full: "Full rework (systems relocated or replaced)",
    };
    const newBuild: Record<string, string> = {
      cosmetic: "Standard (tie into existing home)",
      partial: "Extended (longer runs or panel work)",
      full: "Full new systems throughout",
    };
    const value = (isNewConstruction ? newBuild : remodel)[r.plumbingElectrical];
    rows.push({ label: getPlumbingElectricalLabel(project), value });
  }

  if (visibility.cabinetTier && r.cabinetTier) {
    const map: Record<string, string> = {
      standard: "Standard stock cabinetry",
      "semi-custom": "Semi-custom cabinetry",
      custom: "Fully custom cabinetry",
    };
    rows.push({ label: "Cabinetry", value: map[r.cabinetTier] });
  }

  if (visibility.fixtureCount && r.fixtureCount != null) {
    rows.push({
      label: "Plumbing fixtures",
      value: `${r.fixtureCount} ${r.fixtureCount === 1 ? "fixture" : "fixtures"}`,
    });
  }

  if (visibility.bathroomCount && r.bathroomCount != null) {
    rows.push({
      label: "Bathrooms in scope",
      value: `${r.bathroomCount} ${r.bathroomCount === 1 ? "bathroom" : "bathrooms"}`,
    });
  }

  if (visibility.kitchenIncluded && r.kitchenIncluded != null) {
    rows.push({
      label: "Kitchen",
      value: r.kitchenIncluded ? "Included in the project" : "Not included",
    });
  }

  if (visibility.stories && r.stories != null) {
    rows.push({ label: "Stories", value: r.stories > 1 ? "Two-story" : "Single-story" });
  }

  if (visibility.aduConfiguration && r.aduConfig) {
    rows.push({
      label: "ADU configuration",
      value: r.aduConfig === "attached" ? "Attached unit" : "Detached unit",
    });
  }

  return rows;
}

const CELL = `padding:11px 0;border-bottom:1px solid ${EMAIL_BRAND.hairline};`;
const LABEL_CELL = `${CELL}color:${EMAIL_BRAND.textMuted};width:46%;`;
const VALUE_CELL = `${CELL}color:${EMAIL_BRAND.text};`;
const SECTION_TITLE = `font-size:13px;font-weight:400;color:${EMAIL_BRAND.textMuted};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.12em;`;

function renderSelectionRows(rows: { label: string; value: string }[]): string {
  return rows
    .map(
      (r) =>
        `<tr><td style="${LABEL_CELL}">${escapeHtml(r.label)}</td><td style="${VALUE_CELL}">${escapeHtml(r.value)}</td></tr>`
    )
    .join("");
}

/** Neutral bulleted list for assumptions, cost drivers, and upgrades. */
function renderPlainList(items: string[], fontSize = 14): string {
  return `<ul style="margin:0;padding-left:18px;">${items
    .map(
      (item) =>
        `<li style="color:${EMAIL_BRAND.text};font-size:${fontSize}px;line-height:1.5;margin:0 0 7px;">${escapeHtml(item)}</li>`
    )
    .join('')}</ul>`;
}

/** Exclusions, marked so they cannot be mistaken for included scope. */
function renderExcludedList(items: string[]): string {
  return items
    .map(
      (item) =>
        `<tr><td style="vertical-align:top;color:${EMAIL_BRAND.textMuted};padding:5px 10px 5px 0;font-size:14px;line-height:1.5;">&times;</td><td style="color:${EMAIL_BRAND.textMuted};padding:5px 0;font-size:14px;line-height:1.5;">${escapeHtml(item)}</td></tr>`
    )
    .join('\n');
}

function renderIncludedList(items: string[]): string {
  return items
    .map(
      (item) =>
        `<tr><td style="vertical-align:top;color:${EMAIL_BRAND.accent};padding:5px 10px 5px 0;font-size:14px;line-height:1.5;">&#10003;</td><td style="color:${EMAIL_BRAND.text};padding:5px 0;font-size:14px;line-height:1.5;">${escapeHtml(item)}</td></tr>`
    )
    .join("");
}

/**
 * The complete, self-contained estimate summary shared by BOTH emails: the
 * planning range, every selection the visitor made, what a project like this
 * typically includes, and the planning-estimate disclaimer. A recipient never
 * needs to log in to understand the estimate.
 */
/**
 * The scope lines a homeowner sees, as plain labels.
 *
 * Shared with the "also included" line so the two cannot repeat each other.
 */
function takeoffLabelsFor(est: VerifiedEstimate, overrides: UnitCostOverrides | undefined): string[] {
  return takeoffForClient(
    takeoffForRange(est.project, est.finish, est.sqft, est.priceLow, est.priceHigh, overrides),
  )
    .lines.filter((l) => l.cost > 0)
    .map((l) => l.label);
}

/**
 * Drop anything the trade list above already told them.
 *
 * "Permits" and "Demolition and disposal" appear verbatim in both lists, and
 * "Semi-custom cabinetry" restates "Cabinetry" while adding the grade - so the
 * match is on the leading noun, and the entry that carries extra information
 * survives. What is left is the genuinely new material: design, the single
 * point of contact, the warranty, and the finish grades.
 */
function dropDuplicatesOf(includes: string[], takeoffLabels: string[]): string[] {
  // Word order differs between the two lists - "Tile backsplash" against
  // "Backsplash tile" - so substring matching misses. Compare the set of
  // meaningful words instead.
  const NOISE = new Set([
    "and", "or", "the", "a", "an", "of", "for", "with", "from", "to", "in", "on",
    // Grade adjectives. The finish level at the top of the email already states
    // the grade, so "Semi-custom cabinetry" next to "Cabinetry" is one trade
    // listed twice for one adjective.
    "new", "updated", "standard", "semicustom", "custom", "premium", "quality", "entry",
  ]);
  const words = (s: string) =>
    s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !NOISE.has(w));

  const pool = new Set(takeoffLabels.flatMap(words));
  return includes.filter((inc) => {
    const w = words(inc);
    // Keep anything with no meaningful words left to judge on.
    if (w.length === 0) return true;
    return !w.every((token) => pool.has(token));
  });
}

function renderTakeoffHtml(est: VerifiedEstimate, overrides: UnitCostOverrides | undefined): string {
  // PM and overhead are folded proportionally into the visible lines, so the
  // homeowner never sees them itemized and the total is unchanged either way.
  const takeoff = takeoffForClient(
    takeoffForRange(est.project, est.finish, est.sqft, est.priceLow, est.priceHigh, overrides),
  );

  // Scope and quantities, never a dollar figure per line. See
  // TAKEOFF_SCOPE_NOTICE for why.
  const rows = takeoff.lines
    .filter((line) => line.cost > 0)
    .map((line) => {
      const qty = formatQuantity(line);
      const label = qty
        ? `${escapeHtml(line.label)} <span style="color:${EMAIL_BRAND.textMuted};">(${escapeHtml(qty)})</span>`
        : escapeHtml(line.label);
      return `<tr><td style="${LABEL_CELL}color:${EMAIL_BRAND.text};width:auto;">${label}</td></tr>`;
    })
    .join("");

  return `
    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What this range covers</p>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <p style="margin:12px 0 0;font-size:12px;line-height:1.55;color:${EMAIL_BRAND.textMuted};">${escapeHtml(TAKEOFF_SCOPE_NOTICE)}</p>
    </div>
  `;
}

/**
 * The internal cost breakdown, admin only.
 *
 * Parent trades with the quantity that drove them, what they cost us, and what
 * the homeowner is being charged for them. Child line items are deliberately
 * NOT rendered: there are thirty to fifty of them and an email is a briefing,
 * not an audit trail. They stay retrievable in the pricing panel.
 *
 * Returns an empty string when the project has no rule set, so a new project
 * type degrades to the old sections rather than erroring on a live lead.
 */
function renderTradeRollupHtml(est: VerifiedEstimate): string {
  const resolved = resolveInternalEstimate(est.project, est.finish, est.sqft, est.refinements);
  if (!resolved) return "";
  const { admin } = resolved;

  const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

  const rows = admin.trades
    .map(
      (t) =>
        `<tr><td style="${LABEL_CELL}color:${EMAIL_BRAND.text};width:auto;">${escapeHtml(t.division)}<br><span style="color:${EMAIL_BRAND.textMuted};font-size:12px;">${escapeHtml(t.scopeSummary)}</span></td>` +
        `<td style="${VALUE_CELL}text-align:right;white-space:nowrap;color:${EMAIL_BRAND.textMuted};">${money(t.internalCost)}</td>` +
        `<td style="${VALUE_CELL}text-align:right;white-space:nowrap;">${money(t.customerAmount)}</td></tr>`,
    )
    .join("");

  const warnings = admin.warnings
    .map(
      (w) =>
        `<li style="margin:4px 0;color:${w.severity === "warn" ? "#D98A3A" : EMAIL_BRAND.textMuted};">${escapeHtml(w.message)}</li>`,
    )
    .join("");

  const assumptions = admin.assumptions
    .slice(0, 8)
    .map((a) => `<li style="margin:3px 0;color:${EMAIL_BRAND.textMuted};">${escapeHtml(a)}</li>`)
    .join("");

  return `
    <div style="margin:28px 0;border:1px solid ${EMAIL_BRAND.hairline};border-radius:6px;padding:18px;">
      <p style="${SECTION_TITLE}">Internal breakdown (not shown to the lead)</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};">Trade</td>
          <td style="padding:4px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};text-align:right;">Our cost</td>
          <td style="padding:4px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};text-align:right;">Customer</td>
        </tr>
        ${rows}
        <tr><td colspan="3" style="border-top:1px solid ${EMAIL_BRAND.hairline};padding-top:10px;"></td></tr>
        <tr><td style="${LABEL_CELL}">Direct cost</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${money(admin.directCost)}</td></tr>
        <tr><td style="${LABEL_CELL}">Contingency</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${money(admin.contingency)}</td></tr>
        <tr><td style="${LABEL_CELL}">Total internal cost</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${money(admin.totalInternalCost)}</td></tr>
        <tr><td style="${LABEL_CELL}">Gross profit</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${money(admin.grossProfit)}</td></tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:${EMAIL_BRAND.text};">
        ${escapeHtml(admin.marginLabel)}<br>
        <span style="color:${EMAIL_BRAND.textMuted};">Quoted range ${escapeHtml(admin.rangeLabel)}</span>
      </p>
      ${warnings ? `<p style="margin:12px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};">Needs review</p><ul style="margin:0;padding-left:18px;font-size:13px;">${warnings}</ul>` : ""}
      ${assumptions ? `<p style="margin:12px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};">Assumptions</p><ul style="margin:0;padding-left:18px;font-size:12px;">${assumptions}</ul>` : ""}
    </div>
  `;
}

/**
 * The budget comparison, rendered for whichever audience is reading.
 *
 * The homeowner gets the constructive version: where their target sits, what is
 * driving the cost, and the smallest change that would reach it. The admin gets
 * the same comparison plus what was actually offered, so the first call starts
 * from where the pressure is rather than discovering it live.
 *
 * Returns empty when no budget was given. Silence is correct: this feature only
 * exists because the homeowner volunteered a number.
 */
function renderBudgetHtml(est: VerifiedEstimate, audience: "admin" | "client"): string {
  if (!est.statedBudget || est.statedBudget <= 0) return "";
  const resolved = resolveInternalEstimate(est.project, est.finish, est.sqft, est.refinements);
  if (!resolved) return "";

  const a = assessBudget(
    est.project,
    { quality: est.finish as never, sqft: est.sqft, ...est.refinements } as never,
    { low: est.priceLow, high: est.priceHigh },
    est.statedBudget,
    resolved.admin.trades.slice(0, 2).map((t) => t.division),
  );
  const guidance = budgetGuidance(a);

  const alternatives =
    a.options.length > 1
      ? `<ul style="margin:10px 0 0;padding-left:18px;color:${EMAIL_BRAND.textMuted};font-size:13px;">` +
        a.options
          .slice(1)
          .map((o) => `<li style="margin:4px 0;">Or ${escapeHtml(o.label)}: ${formatUsd(o.low)} to ${formatUsd(o.high)}</li>`)
          .join("") +
        `</ul>`
      : "";

  // Said only when the range lands above what they have, which is the one place
  // it needs saying. Attached to the solved comparison rather than floating as
  // its own paragraph, so the reassurance arrives with the options rather than
  // instead of them.
  const reassurance =
    audience === "client" && a.state === "below"
      ? `<p style="margin:12px 0 0;color:${EMAIL_BRAND.text};font-size:13.5px;line-height:1.6;">` +
        `We will focus on the features that matter most to you, talk through phasing the work in stages, ` +
        `and explore options that stretch your investment further. Our job is to find the best path forward ` +
        `for your home, never to tell you your budget is not enough.</p>`
      : "";

  const adminExtra =
    audience === "admin"
      ? `<p style="margin:12px 0 0;font-size:12px;color:${EMAIL_BRAND.textMuted};">` +
        `Stated budget ${formatUsd(est.statedBudget)} against ${formatUsd(est.priceLow)} to ${formatUsd(est.priceHigh)}. ` +
        `${a.options.length} alternative${a.options.length === 1 ? "" : "s"} shown to the lead.` +
        `</p>`
      : "";

  return `
    <div style="margin:28px 0;background:${EMAIL_BRAND.raised};border-left:3px solid ${EMAIL_BRAND.accent};padding:20px;border-radius:4px;">
      <p style="${SECTION_TITLE}">${audience === "admin" ? "Their budget" : "About your budget"}</p>
      <p style="margin:0;color:${EMAIL_BRAND.text};font-size:15px;line-height:1.6;">${escapeHtml(a.headline)}</p>
      ${a.driver ? `<p style="margin:8px 0 0;color:${EMAIL_BRAND.textMuted};font-size:13.5px;line-height:1.6;">${escapeHtml(a.driver)}</p>` : ""}
      ${guidance ? `<p style="margin:12px 0 0;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.6;">${escapeHtml(guidance)}</p>` : ""}
      ${alternatives}
      ${reassurance}
      <p style="margin:14px 0 0;font-size:12px;line-height:1.55;color:${EMAIL_BRAND.textMuted};">${escapeHtml(a.basisNote)}</p>
      ${adminExtra}
    </div>
  `;
}

export function buildEstimateSectionsHtml(
  est: VerifiedEstimate,
  overrides?: UnitCostOverrides,
  audience: "admin" | "client" = "client",
): string {
  const rangeText = `${formatUsd(est.priceLow)} to ${formatUsd(est.priceHigh)}`;
  const rows = buildSelectionRows(
    est.project,
    est.finish,
    est.sqft,
    est.refinements,
    est.layoutLabel,
    est.upgradeLabels,
  );
  const roiNote = est.roi ? ` &middot; Typical resale ROI ~${Math.round(est.roi)}%` : "";
  const disclosure = buildEstimateDisclosure({
    project: est.project,
    finish: est.finish,
    sqft: est.sqft,
    refinements: est.refinements,
  });
  const alsoIncluded = dropDuplicatesOf(disclosure.includes, takeoffLabelsFor(est, overrides));

  return `
    <div style="background:${EMAIL_BRAND.raised};border-left:3px solid ${EMAIL_BRAND.accent};padding:24px;margin:24px 0;border-radius:4px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:${EMAIL_BRAND.textMuted};">Planning range</p>
      <p style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:30px;line-height:1.15;color:${EMAIL_BRAND.text};">${rangeText}</p>
      <p style="margin:10px 0 0;font-size:13px;color:${EMAIL_BRAND.textMuted};">${escapeHtml(est.confidence)}${roiNote}</p>
    </div>

    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">Your selections</p>
      <table style="width:100%;border-collapse:collapse;">
        ${renderSelectionRows(rows)}
      </table>
    </div>

    ${/* Client only. The admin email used to carry this AND the trade rollup
          below, which are two pricing formats for the same job: an allocation
          of the total across typical trades, and the actual line-item engine
          output. Two sets of numbers for one estimate is worse than either
          alone, because the reader has to work out which one to trust. The
          engine is the source of truth, so the allocation goes.

          It stays for the client, where it is not a pricing format at all:
          they see the trades and quantities with no dollar figures, which is
          the one place this view still earns its space. */ ""}
    ${audience === "client" ? renderTakeoffHtml(est, overrides) : ""}
    ${
      audience === "client" && alsoIncluded.length
        ? `<div style="margin:-16px 0 28px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.textMuted};">
        <span style="color:${EMAIL_BRAND.text};">Also included:</span> ${escapeHtml(alsoIncluded.join(", "))}.
      </p>
    </div>`
        : ""
    }
    ${renderBudgetHtml(est, audience)}
    ${audience === "admin" ? renderTradeRollupHtml(est) : ""}

    ${/* The itemized "what this range covers" checklist used to live here as a
          second table, immediately under the trade-and-quantity list that has
          the same heading. The two overlapped almost entirely - cabinetry,
          countertops, backsplash, plumbing and electrical appeared in both -
          so a homeowner read the same scope twice in different words.

          Everything the trade list does not already say is kept, as one line
          rather than a second table: the finish-level specifics that tell them
          which grade was assumed, and the service commitments that are not
          trades at all. Nothing is dropped, it is just said once. */ ""}
    ${
      audience === "admin"
        ? `<div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What this range covers</p>
      <table style="width:100%;border-collapse:collapse;">
        ${renderIncludedList(disclosure.includes)}
      </table>
    </div>`
        : ""
    }

    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What it does not cover</p>
      <table style="width:100%;border-collapse:collapse;">
        ${renderExcludedList(disclosure.excludes)}
      </table>
    </div>

    ${/* Assumptions read as fine print, so they are set as fine print: one
          compact paragraph rather than a seventh bulleted block. Every
          assumption is still here word for word - a homeowner who wants to
          check what we took for granted can, and nothing has been dropped to
          make the email shorter. The admin keeps the scannable list. */ ""}
    ${
      audience === "client"
        ? `<div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What we assumed</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.textMuted};">${escapeHtml(disclosure.assumptions.join(". "))}.</p>
    </div>`
        : `<div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What we assumed</p>
      ${renderPlainList(disclosure.assumptions)}
    </div>`
    }

    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What could move the final number</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="vertical-align:top;padding:0 12px 0 0;width:50%;">
            <p style="margin:0 0 8px;font-size:12px;color:${EMAIL_BRAND.textMuted};">Upward</p>
            ${renderPlainList(disclosure.increases, 13)}
          </td>
          <td style="vertical-align:top;padding:0;width:50%;">
            <p style="margin:0 0 8px;font-size:12px;color:${EMAIL_BRAND.textMuted};">Downward</p>
            ${renderPlainList(disclosure.decreases, 13)}
          </td>
        </tr>
      </table>
    </div>

    ${
      audience === "client"
        ? `<div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">Optional upgrades that add cost</p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:${EMAIL_BRAND.textMuted};">${escapeHtml(disclosure.upgrades.join(", "))}.</p>
    </div>`
        : `<div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">Optional upgrades that add cost</p>
      ${renderPlainList(disclosure.upgrades)}
    </div>`
    }

    <div style="background:#2a2a1c;border-left:3px solid #c9a227;padding:18px;margin:24px 0;border-radius:4px;">
      <p style="margin:0 0 10px;color:#e8dca6;font-size:13px;line-height:1.55;"><strong>${escapeHtml(NOT_A_QUOTE_NOTICE)}</strong></p>
      <p style="margin:0;color:#e8dca6;font-size:13px;line-height:1.55;">${escapeHtml(ONSITE_REQUIRED_NOTICE)}</p>
    </div>
  `;
}

function buildPropertyBlock(profile: PropertyEnrichment | null | undefined): string {
  if (!profile) return "";
  const rows = buildPropertyRows(profile);
  if (rows.length === 0) return "";
  return `<div style="background:${EMAIL_BRAND.raised};border-radius:4px;padding:18px;margin:24px 0;">
      <p style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:${EMAIL_BRAND.textMuted};">County parcel record</p>
      ${rows
        .map(
          ([label, value]) =>
            `<p style="margin:4px 0;color:${EMAIL_BRAND.text};">${escapeHtml(label)}: ${escapeHtml(value)}</p>`
        )
        .join("\n      ")}
    </div>`;
}

/**
 * Shared by the HTML email and the CRM note so the team reads the same figures
 * in both places. Every row here is published by the county. Home square
 * footage, bed and bath counts, and year built are absent on purpose: the
 * parcel layers do not carry them, and inventing them once put a city-average
 * guess in front of the sales team labelled as a record.
 */
export function buildPropertyRows(
  profile: PropertyEnrichment
): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const usd = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

  if (profile.parcelId) rows.push(["Parcel", profile.parcelId]);
  if (profile.zoning) {
    rows.push([
      "Zoning",
      profile.zoningCategory ? `${profile.zoning} (${profile.zoningCategory})` : profile.zoning,
    ]);
  }

  if (profile.lotSizeAcres) {
    const acres = profile.lotSizeAcres.toFixed(2);
    rows.push([
      "Lot",
      profile.lotSizeSqFt
        ? `${acres} acres (${profile.lotSizeSqFt.toLocaleString("en-US")} sq ft)`
        : `${acres} acres`,
    ]);
  } else if (profile.lotSizeSqFt) {
    rows.push(["Lot", `${profile.lotSizeSqFt.toLocaleString("en-US")} sq ft`]);
  }

  if (profile.assessedValue) rows.push(["Assessed value", usd(profile.assessedValue)]);
  if (profile.ownerName) rows.push(["Owner of record", profile.ownerName]);
  if (profile.ownerOccupied !== undefined) {
    rows.push([
      "Occupancy",
      profile.ownerOccupied
        ? "Owner occupied (homeowner's exemption on file)"
        : "No homeowner's exemption, likely a rental or second home",
    ]);
  }
  if (profile.subdivision) rows.push(["Subdivision", profile.subdivision]);
  if (profile.permittingAuthority) rows.push(["Permits", profile.permittingAuthority]);

  return rows;
}

/**
 * Internal-team email. Contains everything the lead receives PLUS full contact
 * details, the lead's note, property enrichment, and one-click reply/call
 * affordances. The send layer sets Reply-To to the lead (see formatLeadReplyTo).
 */
export function buildAdminEmailHtml(
  lead: LeadContact,
  estimate: VerifiedEstimate | null,
  profile?: PropertyEnrichment | null,
  overrides?: UnitCostOverrides
): string {
  const firstName = firstNameOf(lead.name);
  const telHref = telHrefOf(lead.phone);
  const projectLabel = estimate ? PROJECT_LABELS[estimate.project].label : lead.projectType;
  const mailtoSubject = encodeURIComponent(`Re: your ${projectLabel} project | Boise Remodeling Co`);

  return wrapEmailHtml({
    title: "New Consultation Request",
    subtitle: `${lead.name}${estimate ? " · estimate attached" : ""}`,
    content: `
      <p style="margin:0 0 20px;font-size:15px;color:${EMAIL_BRAND.text};line-height:1.6;">
        New lead from the website${estimate ? " with a completed estimate" : ""}. Everything you need to follow up is below, no CRM login required.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
        <tr>
          <td style="padding-right:10px;">
            <a href="mailto:${escapeHtml(lead.email)}?subject=${mailtoSubject}" style="display:inline-block;background:${EMAIL_BRAND.text};color:${EMAIL_BRAND.bg};padding:12px 24px;text-decoration:none;border-radius:6px;font-size:14px;">Reply to ${escapeHtml(firstName)}</a>
          </td>
          <td>
            <a href="${escapeHtml(telHref)}" style="display:inline-block;background:transparent;color:${EMAIL_BRAND.text};border:1px solid ${EMAIL_BRAND.accent};padding:11px 24px;text-decoration:none;border-radius:6px;font-size:14px;">Call ${escapeHtml(lead.phone)}</a>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding-top:10px;">
            <a href="${escapeHtml(LEADS_DASHBOARD_URL)}" style="display:inline-block;background:transparent;color:${EMAIL_BRAND.textMuted};border:1px solid ${EMAIL_BRAND.hairline};padding:11px 24px;text-decoration:none;border-radius:6px;font-size:14px;">View in lead dashboard</a>
          </td>
        </tr>
      </table>

      <div style="margin:0 0 8px;">
        <p style="${SECTION_TITLE}">Lead contact</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="${LABEL_CELL}">Name</td><td style="${VALUE_CELL}">${escapeHtml(lead.name)}</td></tr>
          <tr><td style="${LABEL_CELL}">Phone</td><td style="${CELL}"><a href="${escapeHtml(telHref)}" style="color:${EMAIL_BRAND.accent};text-decoration:none;">${escapeHtml(lead.phone)}</a></td></tr>
          <tr><td style="${LABEL_CELL}">Email</td><td style="${CELL}"><a href="mailto:${escapeHtml(lead.email)}" style="color:${EMAIL_BRAND.accent};text-decoration:none;">${escapeHtml(lead.email)}</a></td></tr>
          <tr><td style="${LABEL_CELL}">Address</td><td style="${VALUE_CELL}">${lead.address ? `${escapeHtml(lead.address)}${lead.zip ? ` ${escapeHtml(lead.zip)}` : ""}` : "Not provided"}</td></tr>
          <tr><td style="${LABEL_CELL}">Project</td><td style="${VALUE_CELL}">${escapeHtml(projectLabel)}</td></tr>
          ${lead.budget ? `<tr><td style="${LABEL_CELL}">Desired budget</td><td style="${VALUE_CELL};font-weight:600;">${escapeHtml(lead.budget)}</td></tr>` : ""}
        </table>
      </div>

      ${
        estimate
          ? buildEstimateSectionsHtml(estimate, overrides, "admin")
          : `<p style="margin:24px 0;color:${EMAIL_BRAND.textMuted};">No planning range was attached to this request.</p>`
      }

      ${buildPropertyBlock(profile)}

      <div style="background:${EMAIL_BRAND.raised};border-left:3px solid ${EMAIL_BRAND.accent};padding:20px;margin:24px 0;border-radius:4px;">
        <p style="margin:0 0 8px;font-weight:400;color:${EMAIL_BRAND.text};">Notes from the lead</p>
        <p style="margin:0;color:${EMAIL_BRAND.text};line-height:1.6;white-space:pre-wrap;">${escapeHtml(lead.message || "(none provided)")}</p>
      </div>

      <p style="font-size:12px;color:${EMAIL_BRAND.textMuted};margin-top:16px;">Reply to this email to respond directly to ${escapeHtml(firstName)}. Submitted via ${escapeHtml(SITE_CONFIG.siteUrl)}.</p>
    `,
  });
}

/**
 * Lead-facing email. Includes the complete estimate and every selection so the
 * customer has it in writing without ever logging in. Falls back to a warm
 * acknowledgement when no planning range was attached.
 */
export function buildCustomerEmailHtml(
  lead: LeadContact,
  estimate: VerifiedEstimate | null,
  overrides?: UnitCostOverrides
): string {
  const firstName = firstNameOf(lead.name);
  const projectLabel = estimate ? PROJECT_LABELS[estimate.project].label : lead.projectType;

  // Only when there is no computed comparison to show. Once the estimator has a
  // real number it renders the solved version - where their budget actually
  // lands and what would change it - and restating the same figure in a second
  // paragraph reads as though nobody joined the two up. This stays for the
  // consultation form, where someone can give a budget with no estimate behind
  // it and generic reassurance is the honest most we can offer.
  const budgetNote =
    lead.budget && !estimate?.statedBudget
    ? `<p style="margin:16px 0;color:${EMAIL_BRAND.text};line-height:1.6;">Your stated project budget is <strong>${escapeHtml(lead.budget)}</strong>. We will do everything we can to recommend solutions that fit within that budget while helping you achieve the goals you have shared. If your ideal scope runs beyond it, we will focus on the features that matter most to you, talk through phasing the work in stages, and explore materials and design options that stretch your investment further. Our job is to find the best path forward for your home, never to tell you your budget is not enough.</p>`
    : "";

  const content = estimate
    ? `
      <p class="greeting" style="font-size:18px;color:${EMAIL_BRAND.text};margin:0 0 20px;">Thanks, ${escapeHtml(firstName)}. Here is the planning range you built.</p>
      ${buildEstimateSectionsHtml(estimate, overrides)}
      ${budgetNote}
      <p style="color:${EMAIL_BRAND.text};line-height:1.6;">We will reach out within one business day to book your free in-home visit, where we confirm the scope and give you a firm number. Until then, reply here or call <a href="${SITE_CONFIG.phoneHref}" style="color:${EMAIL_BRAND.accent};">${escapeHtml(SITE_CONFIG.phone)}</a> with any questions.</p>
      ${textReplyLineHtml()}
      <p style="margin-top:24px;color:${EMAIL_BRAND.text};">The Boise Remodeling Co team</p>
    `
    : `
      <p class="greeting" style="font-size:18px;color:${EMAIL_BRAND.text};margin:0 0 20px;">We received your consultation request and will reach out within one business day to schedule your free in-home visit.</p>
      ${textReplyLineHtml()}
      <p style="color:${EMAIL_BRAND.text};line-height:1.6;">In the meantime, feel free to call us at <a href="${SITE_CONFIG.phoneHref}" style="color:${EMAIL_BRAND.accent};">${escapeHtml(SITE_CONFIG.phone)}</a>, <a href="${SITE_CONFIG.phoneSmsHref}" style="color:${EMAIL_BRAND.accent};">send us a text</a>, or reply to this email with any questions.</p>
      <p style="margin-top:24px;color:${EMAIL_BRAND.text};">The Boise Remodeling Co team</p>
    `;

  return wrapEmailHtml({
    title: estimate ? `Your ${projectLabel} planning range` : `Thanks, ${escapeHtml(lead.name)}!`,
    subtitle: estimate ? "Saved so you have it in writing" : "We received your consultation request",
    content,
  });
}

export function buildAdminSubject(lead: LeadContact, estimate: VerifiedEstimate | null): string {
  const projectLabel = estimate ? PROJECT_LABELS[estimate.project].label : lead.projectType;
  return estimate
    ? `New lead: ${lead.name} · ${projectLabel} · ${formatUsd(estimate.priceLow)} to ${formatUsd(estimate.priceHigh)}`
    : `New consultation request: ${lead.name}`;
}

export function buildCustomerSubject(lead: LeadContact, estimate: VerifiedEstimate | null): string {
  const projectLabel = estimate ? PROJECT_LABELS[estimate.project].label : lead.projectType;
  return estimate
    ? `Your ${projectLabel} planning range | Boise Remodeling Co`
    : "We received your request | Boise Remodeling Co";
}
