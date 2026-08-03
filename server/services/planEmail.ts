import { escapeHtml, wrapEmailHtml, EMAIL_BRAND } from "@/server/services/emailLayout";
import { SITE_CONFIG } from "@/shared/siteConfig";
import type { AdminView, LeadView } from "@/shared/costs";
import type { PlanMeasurements } from "@/shared/plans/estimateInput";

/**
 * The two plan-estimate emails.
 *
 * THE WALL IS STRUCTURAL, NOT A HABIT. `buildPlanCustomerEmail` takes a LeadView
 * and never an AdminView or an InternalEstimate, so there is no path from it to
 * a cost, a margin, a contingency or a line item. It cannot leak one by
 * accident, because it is never handed one. The admin builder takes the whole
 * internal view and shows the economics, because that is its entire job.
 *
 * This is the third surface in this codebase built that way and the reason has
 * not changed: a disclosure wall enforced by discipline fails the first time
 * somebody adds a field in a hurry.
 */

const CELL = `padding:10px 0;border-bottom:1px solid ${EMAIL_BRAND.hairline};`;
const LABEL_CELL = `${CELL}color:${EMAIL_BRAND.textMuted};width:46%;`;
const VALUE_CELL = `${CELL}color:${EMAIL_BRAND.text};`;
const SECTION_TITLE = `font-size:13px;font-weight:400;color:${EMAIL_BRAND.textMuted};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.12em;`;

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Who sent the drawings and what property they describe. */
export interface PlanContact {
  name: string;
  email?: string;
  phone?: string;
  preferredContact: "email" | "phone" | "text";
  propertyAddress: string;
  projectType: string;
  finishLevel: string;
  timeline?: string;
  notes?: string;
}

function row(label: string, value: string): string {
  return `<tr><td style="${LABEL_CELL}">${escapeHtml(label)}</td><td style="${VALUE_CELL}">${escapeHtml(value)}</td></tr>`;
}

function list(items: string[]): string {
  return items
    .map(
      (i) =>
        `<li style="margin:0 0 6px;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.65;">${escapeHtml(i)}</li>`,
    )
    .join("");
}

/**
 * What we measured, restated so the customer can check it against their own
 * drawings. This is the part they are most likely to spot an error in, which is
 * exactly why it belongs in the email rather than only on a screen they have
 * already navigated away from.
 */
function measurementRows(m: PlanMeasurements | null, statedTotalSqFt: number): string {
  if (!m) {
    return row("Total area you gave us", `${statedTotalSqFt.toLocaleString("en-US")} sq ft`);
  }
  return [
    row("Total area you gave us", `${statedTotalSqFt.toLocaleString("en-US")} sq ft`),
    row("Measured from your drawings", `${Math.round(m.sqft).toLocaleString("en-US")} sq ft across ${m.measuredRooms} rooms`),
    row("Interior wall length", `${Math.round(m.interiorPerimeterFt).toLocaleString("en-US")} linear feet`),
    m.ceilingHeight !== null ? row("Ceiling height", `${m.ceilingHeight.toFixed(1)} feet`) : "",
    m.bathroomCount !== null ? row("Bathrooms in scope", String(m.bathroomCount)) : "",
  ].join("");
}

/**
 * The customer's copy.
 *
 * Takes the LEAD view only. The planning range, what we measured, and the
 * caveats. Anything we could not measure is named rather than dropped, on the
 * same rule the RE-10 flow learned the hard way: a customer who finds out at the
 * walkthrough that half their house was never in the number has been misled by
 * omission, and it does not matter that no sentence was false.
 */
export function buildPlanCustomerEmail(
  contact: PlanContact,
  view: {
    lead: LeadView;
    measurements: PlanMeasurements | null;
    statedTotalSqFt: number;
    /** Empty when the drawings earned a plans-informed price. */
    blockers: string[];
    notMeasured: string[];
    scopeItems?: { category: string; description: string }[];
    excludedScope?: { category: string; description: string }[];
  },
): string {
  const firstName = contact.name.trim().split(/\s+/)[0] || contact.name;

  const measured = view.measurements
    ? `<p style="margin:0 0 18px;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.7;">
         We priced this from the measurements on your drawings rather than from a typical
         house of this size.
       </p>`
    : `<p style="margin:0 0 18px;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.7;">
         We read your drawings, but they did not carry enough measurement for us to price from
         them directly, so this range is built from the total area you gave us. It is a planning
         figure either way, and we will tighten it on site.
       </p>`;

  const blockers =
    view.blockers.length > 0
      ? `<div style="margin:0 0 24px;">
           <p style="${SECTION_TITLE}">Why we did not price from the drawings</p>
           <ul style="margin:0;padding-left:18px;">${list(view.blockers)}</ul>
         </div>`
      : "";

  const notMeasured =
    view.notMeasured.length > 0
      ? `<div style="margin:0 0 24px;">
           <p style="${SECTION_TITLE}">Not included in the measured area</p>
           <p style="margin:0 0 10px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.65;">
             These rooms are on your drawings but carry no printed area, so we did not measure
             them. Tell us their sizes and we will fold them in.
           </p>
           <ul style="margin:0;padding-left:18px;">${list(view.notMeasured)}</ul>
         </div>`
      : "";

  const body = `
    <p style="margin:0 0 18px;color:${EMAIL_BRAND.text};font-size:15px;line-height:1.7;">
      ${escapeHtml(firstName)}, here is your planning range.
    </p>

    <p style="margin:0 0 6px;color:${EMAIL_BRAND.text};font-size:28px;font-weight:300;letter-spacing:-0.01em;">
      ${escapeHtml(view.lead.range)}
    </p>
    <p style="margin:0 0 24px;color:${EMAIL_BRAND.textMuted};font-size:13px;">
      ${escapeHtml(contact.projectType)}, ${escapeHtml(contact.finishLevel)} finish
    </p>

    ${measured}

    <div style="margin:0 0 24px;">
      <p style="${SECTION_TITLE}">What we used</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
        ${row("Property", contact.propertyAddress)}
        ${measurementRows(view.measurements, view.statedTotalSqFt)}
      </table>
    </div>

    ${
      (view.scopeItems ?? []).length > 0
        ? `<div style="margin:0 0 24px;">
             <p style="${SECTION_TITLE}">What this covers</p>
             <ul style="margin:0;padding-left:18px;">${list(
               (view.scopeItems ?? []).map((i) => `${i.category}: ${i.description}`),
             )}</ul>
           </div>`
        : ""
    }
    ${
      (view.excludedScope ?? []).length > 0
        ? `<div style="margin:0 0 24px;">
             <p style="${SECTION_TITLE}">Not included, your drawings give it to someone else</p>
             <ul style="margin:0;padding-left:18px;">${list(
               (view.excludedScope ?? []).map((i) => i.description),
             )}</ul>
           </div>`
        : ""
    }
    ${notMeasured}
    ${blockers}

    <div style="margin:0 0 24px;">
      <p style="${SECTION_TITLE}">What this is</p>
      <ul style="margin:0;padding-left:18px;">${list(view.lead.disclaimers)}</ul>
    </div>

    <p style="margin:0;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.7;">
      Reply to this email or call ${escapeHtml(SITE_CONFIG.phone)} and we will book a walkthrough.
    </p>
  `;

  return wrapEmailHtml({ title: "Your planning range", content: body });
}

export interface PlanAdminExtras {
  documents: { filename: string; url: string }[];
  missingAttachments: string[];
  /** Everything the extractor flagged about the drawings themselves. */
  warnings: string[];
  sheetsUsed: string[];
}

/**
 * The team's copy.
 *
 * Takes the ADMIN view and shows the economics, the trade rollup and the
 * quality gates. An estimator picking this up needs to know whether the number
 * came from measured drawings or from a figure somebody typed, because that
 * decides how much of a walkthrough it still needs.
 */
export function buildPlanAdminEmail(
  contact: PlanContact,
  admin: AdminView,
  view: {
    measurements: PlanMeasurements | null;
    statedTotalSqFt: number;
    blockers: string[];
    notMeasured: string[];
  },
  extras: PlanAdminExtras,
): string {
  const trades = admin.trades
    .map(
      (t) =>
        `<tr>
           <td style="${CELL}color:${EMAIL_BRAND.text};">${escapeHtml(t.division)}<br>
             <span style="color:${EMAIL_BRAND.textMuted};font-size:12px;">${escapeHtml(t.scopeSummary)}</span></td>
           <td style="${CELL}color:${EMAIL_BRAND.textMuted};text-align:right;">${usd(t.internalCost)}</td>
           <td style="${CELL}color:${EMAIL_BRAND.text};text-align:right;">${usd(t.customerAmount)}</td>
         </tr>`,
    )
    .join("");

  const provenance = view.measurements
    ? `Priced from MEASURED drawings: ${Math.round(view.measurements.sqft).toLocaleString("en-US")} sq ft over ` +
      `${view.measurements.measuredRooms} rooms, ${Math.round(view.measurements.interiorPerimeterFt).toLocaleString("en-US")} LF interior wall` +
      (view.measurements.ceilingHeight !== null ? `, ${view.measurements.ceilingHeight.toFixed(1)} ft ceilings` : "")
    : "Priced from the customer's stated area only. The drawings did not clear the quality gates.";

  const body = `
    <p style="margin:0 0 6px;color:${EMAIL_BRAND.text};font-size:15px;">
      ${escapeHtml(contact.name)} sent plans for ${escapeHtml(contact.propertyAddress)}
    </p>
    <p style="margin:0 0 20px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">
      ${escapeHtml(provenance)}
    </p>

    <div style="margin:0 0 24px;">
      <p style="${SECTION_TITLE}">Contact</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
        ${contact.email ? row("Email", contact.email) : ""}
        ${contact.phone ? row("Phone", contact.phone) : ""}
        ${row("Prefers", contact.preferredContact)}
        ${row("Project", `${contact.projectType}, ${contact.finishLevel}`)}
        ${contact.timeline ? row("Timeline", contact.timeline) : ""}
        ${row("Stated total", `${view.statedTotalSqFt.toLocaleString("en-US")} sq ft`)}
      </table>
    </div>

    <div style="margin:0 0 24px;">
      <p style="${SECTION_TITLE}">Quoted ${escapeHtml(admin.rangeLabel)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="${LABEL_CELL}">Trade</td>
          <td style="${LABEL_CELL}text-align:right;width:27%;">Internal</td>
          <td style="${LABEL_CELL}text-align:right;width:27%;">Customer</td>
        </tr>
        ${trades}
      </table>
      <p style="margin:12px 0 0;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.7;">
        Direct ${usd(admin.directCost)} plus contingency ${usd(admin.contingency)} equals
        ${usd(admin.totalInternalCost)}. ${escapeHtml(admin.marginLabel)}.
        Gross profit ${usd(admin.grossProfit)}.
      </p>
    </div>

    ${
      view.blockers.length > 0
        ? `<div style="margin:0 0 24px;">
             <p style="${SECTION_TITLE}">Gates the drawings did not clear</p>
             <ul style="margin:0;padding-left:18px;">${list(view.blockers)}</ul>
           </div>`
        : ""
    }
    ${
      view.notMeasured.length > 0
        ? `<div style="margin:0 0 24px;">
             <p style="${SECTION_TITLE}">Rooms with no printed area</p>
             <ul style="margin:0;padding-left:18px;">${list(view.notMeasured)}</ul>
           </div>`
        : ""
    }
    ${
      extras.warnings.length > 0
        ? `<div style="margin:0 0 24px;">
             <p style="${SECTION_TITLE}">What the extractor noticed</p>
             <ul style="margin:0;padding-left:18px;">${list(extras.warnings)}</ul>
           </div>`
        : ""
    }
    ${
      admin.warnings.length > 0
        ? `<div style="margin:0 0 24px;">
             <p style="${SECTION_TITLE}">Estimator warnings</p>
             <ul style="margin:0;padding-left:18px;">${list(admin.warnings.map((w) => w.message))}</ul>
           </div>`
        : ""
    }
    ${
      extras.sheetsUsed.length > 0
        ? `<p style="margin:0 0 18px;color:${EMAIL_BRAND.textMuted};font-size:13px;">
             Sheets read: ${escapeHtml(extras.sheetsUsed.join(", "))}
           </p>`
        : ""
    }
    ${
      extras.missingAttachments.length > 0
        ? `<p style="margin:0 0 18px;color:${EMAIL_BRAND.text};font-size:13px;">
             Could NOT attach: ${escapeHtml(extras.missingAttachments.join(", "))}. The upload store no longer has them.
           </p>`
        : ""
    }
    ${contact.notes ? `<div style="margin:0 0 24px;"><p style="${SECTION_TITLE}">Their note</p><p style="margin:0;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.7;">${escapeHtml(contact.notes)}</p></div>` : ""}
  `;

  return wrapEmailHtml({ title: "New plan estimate", content: body });
}

export function buildPlanCustomerSubject(contact: PlanContact): string {
  return `Your planning range for ${contact.propertyAddress}`;
}

export function buildPlanAdminSubject(contact: PlanContact, range: string): string {
  return `Plans: ${contact.propertyAddress} - ${range}`;
}
