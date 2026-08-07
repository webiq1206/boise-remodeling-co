import { escapeHtml, wrapEmailHtml, EMAIL_BRAND } from "@/server/services/emailLayout";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { TRADE_LABELS, type Re10Estimate } from "@/shared/costs/re10Repairs";
import { RE10_PRICING_DISCLAIMER } from "@/shared/content/re10Content";

/**
 * The two RE-10 emails.
 *
 * THE WALL IS THE SAME ONE AS THE MAIN ESTIMATOR, AND IT IS STRUCTURAL. The
 * customer builder never receives the internal estimate - it takes only the
 * range, the categories and the caveats. It cannot leak a cost or a margin
 * because it is never handed one. The admin builder takes the whole estimate
 * and shows the economics, because that is its entire job.
 *
 * Reuses the site's existing email shell so an RE-10 confirmation looks like
 * every other email this company sends, rather than like a different product.
 */

const CELL = `padding:10px 0;border-bottom:1px solid ${EMAIL_BRAND.hairline};`;
const LABEL_CELL = `${CELL}color:${EMAIL_BRAND.textMuted};width:46%;`;
const VALUE_CELL = `${CELL}color:${EMAIL_BRAND.text};`;
const SECTION_TITLE = `font-size:13px;font-weight:400;color:${EMAIL_BRAND.textMuted};margin:0 0 12px;text-transform:uppercase;letter-spacing:0.12em;`;

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Who sent the RE-10 and what deal it belongs to. */
export interface Re10Contact {
  name: string;
  email?: string;
  phone?: string;
  preferredContact: "email" | "phone" | "text";
  role: string;
  brokerage?: string;
  propertyAddress: string;
  closingDate?: string;
  repairDeadline?: string;
  occupancy?: string;
  notes?: string;
}

const ROLE_LABELS: Record<string, string> = {
  "buyer-agent": "Buyer's agent",
  "seller-agent": "Seller's agent",
  coordinator: "Transaction coordinator",
  buyer: "Buyer",
  seller: "Seller",
  other: "Other",
};

function row(label: string, value: string): string {
  return `<tr><td style="${LABEL_CELL}">${escapeHtml(label)}</td><td style="${VALUE_CELL}">${escapeHtml(value)}</td></tr>`;
}

/** Transaction facts both emails restate, so nobody has to hunt for the date. */
function transactionRows(c: Re10Contact): string {
  return [
    row("Property", c.propertyAddress),
    c.repairDeadline ? row("Repair deadline", c.repairDeadline) : "",
    c.closingDate ? row("Closing date", c.closingDate) : "",
    c.occupancy && c.occupancy !== "unknown" ? row("Property is", c.occupancy) : "",
  ].join("");
}

/**
 * The homeowner's copy.
 *
 * Takes the price and the scope, never the estimate object. Items that need an
 * onsite visit are listed separately and plainly rather than folded into the
 * number, because an agent who discovers at the walkthrough that the foundation
 * was never in the price has been misled by omission.
 */
export function buildRe10CustomerEmail(
  contact: Re10Contact,
  view: {
    price: number;
    validDays: number;
    categories: { trade: string; itemCount: number; items: { description: string; quantityAssumed: boolean; quantity?: number; unit?: string }[] }[];
    needsOnsite: { description: string; why: string }[];
    /** Repairs the customer removed on the review screen. Named, not vanished. */
    excluded?: { description: string }[];
    uncertainty: string[];
    assumptions: string[];
  },
): string {
  const firstName = contact.name.trim().split(/\s+/)[0] || contact.name;

  const categories = view.categories
    .map(
      (c) =>
        `<div style="margin:0 0 14px;">
          <p style="margin:0 0 4px;color:${EMAIL_BRAND.text};font-size:14px;">${escapeHtml(
            TRADE_LABELS[c.trade as keyof typeof TRADE_LABELS] ?? c.trade,
          )} <span style="color:${EMAIL_BRAND.textMuted};">(${c.itemCount} ${c.itemCount === 1 ? "item" : "items"})</span></p>
          <ul style="margin:0;padding-left:18px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">
            ${c.items.map((i) => `<li>${escapeHtml(i.description)}${i.quantityAssumed && i.quantity ? ` (priced for ${i.quantity} ${escapeHtml(String(i.unit ?? ""))})` : ""}</li>`).join("")}
          </ul>
        </div>`,
    )
    .join("");

  const onsite =
    view.needsOnsite.length > 0
      ? `<div style="margin:28px 0;border:1px solid ${EMAIL_BRAND.hairline};border-radius:6px;padding:18px;">
          <p style="${SECTION_TITLE}">Not included: needs an onsite look</p>
          <p style="margin:0 0 10px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">These are not in the price above. We would rather tell you that now than have it appear at the walkthrough.</p>
          <ul style="margin:0;padding-left:18px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">
            ${view.needsOnsite.map((n) => `<li><span style="color:${EMAIL_BRAND.text};">${escapeHtml(n.description)}</span> - ${escapeHtml(n.why)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const excluded =
    (view.excluded?.length ?? 0) > 0
      ? `<div style="margin:28px 0;border:1px solid ${EMAIL_BRAND.hairline};border-radius:6px;padding:18px;">
          <p style="${SECTION_TITLE}">Removed at your request</p>
          <p style="margin:0 0 10px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">You took these off the list before pricing, so they are not in the number above. Add any of them back and we will re-price.</p>
          <ul style="margin:0;padding-left:18px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">
            ${(view.excluded ?? []).map((x) => `<li>${escapeHtml(x.description)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const narrowing =
    view.uncertainty.length > 0
      ? `<div style="margin:28px 0;">
          <p style="${SECTION_TITLE}">What could change this price</p>
          <ul style="margin:0;padding-left:18px;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">
            ${view.uncertainty.map((u) => `<li>${escapeHtml(u)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const content = `
    <p class="greeting" style="font-size:18px;color:${EMAIL_BRAND.text};margin:0 0 20px;">Thanks, ${escapeHtml(firstName)}. Here is the price for the repairs on the RE-10 you sent.</p>

    <div style="background:${EMAIL_BRAND.raised};border-left:3px solid ${EMAIL_BRAND.accent};padding:24px;margin:24px 0;border-radius:4px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:${EMAIL_BRAND.textMuted};">Price for the repairs below</p>
      <p style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:30px;line-height:1.15;color:${EMAIL_BRAND.text};">${usd(view.price)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:${EMAIL_BRAND.textMuted};">Held for ${view.validDays} days.</p>
    </div>

    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">This transaction</p>
      <table style="width:100%;border-collapse:collapse;">${transactionRows(contact)}</table>
    </div>

    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What this price covers</p>
      ${categories}
    </div>

    ${onsite}
    ${excluded}
    ${narrowing}

    <div style="margin:28px 0;">
      <p style="${SECTION_TITLE}">What we assumed</p>
      <p style="margin:0;color:${EMAIL_BRAND.textMuted};font-size:13px;line-height:1.6;">${escapeHtml(view.assumptions.join(". "))}.</p>
    </div>

    <div style="background:#2a2a1c;border-left:3px solid #c9a227;padding:18px;margin:24px 0;border-radius:4px;">
      <p style="margin:0;color:#e8dca6;font-size:13px;line-height:1.55;">${escapeHtml(RE10_PRICING_DISCLAIMER)}</p>
    </div>

    <p style="color:${EMAIL_BRAND.text};line-height:1.6;">Next step is a short onsite visit to confirm the scope, price the items listed below as needing a look, and get you on the schedule. Reply here or call <a href="${SITE_CONFIG.phoneHref}" style="color:${EMAIL_BRAND.accent};">${escapeHtml(SITE_CONFIG.phone)}</a> and we will get it scheduled against your deadline.</p>
    <p style="margin-top:24px;color:${EMAIL_BRAND.text};">The Boise Remodeling Co team</p>
  `;

  return wrapEmailHtml({
    title: "Your RE-10 repair price",
    subtitle: escapeHtml(contact.propertyAddress),
    content,
  });
}

/**
 * The team's copy.
 *
 * Gets the whole estimate: costs, minimums, margin, the worthwhile call, and
 * every warning. The first line an estimator needs is not the price, it is
 * whether the deadline is survivable, so the transaction block leads.
 */
/**
 * Extra context the estimate object cannot carry.
 *
 * `unmapped` is the gap between what we quoted and what the document asked
 * for, so it belongs in the internal copy even though - especially though -
 * it is absent from the price.
 */
export interface Re10AdminExtras {
  /** Files travelling with this email. */
  attached?: string[];
  /** Files we could NOT attach, named so nobody assumes they are here. */
  missingDocuments?: string[];
  unmapped?: { verbatim: string; reason?: string }[];
  documentNotes?: string[];
  /** Repairs the customer removed on the review screen. */
  excluded?: { description: string }[];
}

export function buildRe10AdminEmail(
  contact: Re10Contact,
  est: Re10Estimate,
  extras: Re10AdminExtras = {},
): string {
  const excludedBlock =
    extras.excluded && extras.excluded.length > 0
      ? `<div style="margin:20px 0;padding:12px 14px;border:1px solid ${EMAIL_BRAND.hairline};">
          <p style="${SECTION_TITLE}">Removed by the customer on review (${extras.excluded.length})</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${extras.excluded.map((x) => `<li style="margin:4px 0;color:${EMAIL_BRAND.text};">${escapeHtml(x.description)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const unmappedBlock =
    extras.unmapped && extras.unmapped.length > 0
      ? `<div style="margin:20px 0;padding:12px 14px;border:1px solid #b45309;background:#fffbeb;">
          <p style="${SECTION_TITLE}color:#92400e;">Asked for, NOT in the range (${extras.unmapped.length})</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${extras.unmapped.map((u) => `<li style="margin:4px 0;color:${EMAIL_BRAND.text};">${escapeHtml(u.verbatim)}${u.reason ? ` <span style="color:${EMAIL_BRAND.textMuted};">- ${escapeHtml(u.reason)}</span>` : ""}</li>`).join("")}
          </ul>
        </div>`
      : "";

  // What actually travelled with this email, and what did not. The upload
  // store is ephemeral without a blob token, so "we have your RE-10" has to be
  // a statement about this inbox rather than about a link.
  const docsBlock =
    (extras.attached?.length ?? 0) + (extras.missingDocuments?.length ?? 0) > 0
      ? `<div style="margin:20px 0;">
          <p style="${SECTION_TITLE}">Documents</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${(extras.attached ?? []).map((n) => `<li style="margin:4px 0;color:${EMAIL_BRAND.text};">${escapeHtml(n)} <span style="color:${EMAIL_BRAND.textMuted};">- attached to this email</span></li>`).join("")}
            ${(extras.missingDocuments ?? []).map((n) => `<li style="margin:4px 0;color:#b45309;">${escapeHtml(n)} - COULD NOT BE ATTACHED. Ask the sender to resend it.</li>`).join("")}
          </ul>
        </div>`
      : "";

  const notesBlock =
    extras.documentNotes && extras.documentNotes.length > 0
      ? `<div style="margin:20px 0;">
          <p style="${SECTION_TITLE}">What we noticed in the document</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${extras.documentNotes.map((n) => `<li style="margin:4px 0;color:${EMAIL_BRAND.textMuted};">${escapeHtml(n)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const trades = est.trades
    .map(
      (t) =>
        `<tr>
          <td style="${LABEL_CELL}color:${EMAIL_BRAND.text};width:auto;">${escapeHtml(t.label)}<br><span style="color:${EMAIL_BRAND.textMuted};font-size:12px;">${t.repairs.length} ${t.repairs.length === 1 ? "item" : "items"} &middot; ${escapeHtml(t.crew)} crew</span></td>
          <td style="${VALUE_CELL}text-align:right;white-space:nowrap;color:${EMAIL_BRAND.textMuted};">${usd(t.adjustedCost + t.mobilization)}</td>
          <td style="${VALUE_CELL}text-align:right;white-space:nowrap;">${usd(t.customerAmount)}</td>
        </tr>`,
    )
    .join("");

  const items = est.priced
    .map(
      (p) =>
        `<li style="margin:4px 0;color:${EMAIL_BRAND.textMuted};">${escapeHtml(p.input.description)} <span style="color:${EMAIL_BRAND.text};">[${escapeHtml(p.recipe.label)}, ${p.quantity}${p.quantityAssumed ? " assumed" : ""}]</span></li>`,
    )
    .join("");

  const review =
    est.review.length > 0
      ? `<div style="margin:20px 0;">
          <p style="${SECTION_TITLE}">Not priced - needs onsite</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${est.review.map((r) => `<li style="margin:4px 0;color:${EMAIL_BRAND.textMuted};">${escapeHtml(r.input.description)} - ${escapeHtml(r.text)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const warnings =
    est.warnings.length > 0
      ? `<div style="margin:20px 0;">
          <p style="${SECTION_TITLE}">Notes</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;">
            ${est.warnings.map((w) => `<li style="margin:4px 0;color:${w.severity === "warn" ? "#D98A3A" : EMAIL_BRAND.textMuted};">${escapeHtml(w.message)}</li>`).join("")}
          </ul>
        </div>`
      : "";

  const contactRows = [
    row("Name", contact.name),
    row("Role", ROLE_LABELS[contact.role] ?? contact.role),
    contact.brokerage ? row("Brokerage", contact.brokerage) : "",
    contact.email ? row("Email", contact.email) : "",
    contact.phone ? row("Phone", contact.phone) : "",
    row("Prefers", contact.preferredContact),
  ].join("");

  const content = `
    <p class="greeting" style="font-size:18px;color:${EMAIL_BRAND.text};margin:0 0 20px;">RE-10 repair estimate: ${escapeHtml(contact.propertyAddress)}</p>

    <div style="background:${EMAIL_BRAND.raised};border-left:3px solid ${EMAIL_BRAND.accent};padding:20px;margin:24px 0;border-radius:4px;">
      <p style="margin:0 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:0.14em;color:${EMAIL_BRAND.textMuted};">Quoted range</p>
      <p style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:26px;line-height:1.15;color:${EMAIL_BRAND.text};">${usd(est.low)} to ${usd(est.high)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:${EMAIL_BRAND.textMuted};">
        ${(est.realisedMargin * 100).toFixed(1)}% realised margin &middot; ${est.confidence} confidence
        ${est.worthwhile ? "" : ` &middot; <span style="color:#D98A3A;">below the worthwhile threshold</span>`}
      </p>
    </div>

    <div style="margin:24px 0;">
      <p style="${SECTION_TITLE}">Transaction</p>
      <table style="width:100%;border-collapse:collapse;">${transactionRows(contact)}</table>
    </div>

    <div style="margin:24px 0;">
      <p style="${SECTION_TITLE}">Contact</p>
      <table style="width:100%;border-collapse:collapse;">${contactRows}</table>
    </div>

    ${contact.notes ? `<div style="margin:24px 0;"><p style="${SECTION_TITLE}">Their note</p><p style="margin:0;color:${EMAIL_BRAND.text};font-size:14px;line-height:1.6;">${escapeHtml(contact.notes)}</p></div>` : ""}

    <div style="margin:24px 0;border:1px solid ${EMAIL_BRAND.hairline};border-radius:6px;padding:18px;">
      <p style="${SECTION_TITLE}">Internal breakdown (not shown to the lead)</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:4px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};">Trade</td>
          <td style="padding:4px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};text-align:right;">Our cost</td>
          <td style="padding:4px 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:${EMAIL_BRAND.textMuted};text-align:right;">Customer</td>
        </tr>
        ${trades}
        <tr><td colspan="3" style="border-top:1px solid ${EMAIL_BRAND.hairline};padding-top:10px;"></td></tr>
        <tr><td style="${LABEL_CELL}">Direct cost</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.directCost)}</td></tr>
        <tr><td style="${LABEL_CELL}">Labour-floor top-up</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.minimumsApplied)}</td></tr>
        <tr><td style="${LABEL_CELL}">Mobilization</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.mobilization)}</td></tr>
        <tr><td style="${LABEL_CELL}">Coordination</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.coordination)}</td></tr>
        <tr><td style="${LABEL_CELL}">Contingency</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.contingency)}</td></tr>
        <tr><td style="${LABEL_CELL}">Total cost</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.totalInternalCost)}</td></tr>
        <tr><td style="${LABEL_CELL}">Gross profit</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.grossProfit)}</td></tr>
        ${est.minimumPriceApplied > 0 ? `<tr><td style="${LABEL_CELL}">Minimum visit top-up</td><td colspan="2" style="${VALUE_CELL}text-align:right;">${usd(est.minimumPriceApplied)}</td></tr>` : ""}
      </table>
      ${est.marginUplifts.length > 0 ? `<p style="margin:12px 0 0;font-size:12px;color:${EMAIL_BRAND.textMuted};">Uplifts: ${est.marginUplifts.map((u) => escapeHtml(u)).join(" ")}</p>` : ""}
    </div>

    <div style="margin:24px 0;">
      <p style="${SECTION_TITLE}">Repairs priced</p>
      <ul style="margin:0;padding-left:18px;font-size:13px;">${items}</ul>
    </div>

    ${review}
    ${unmappedBlock}
    ${excludedBlock}
    ${docsBlock}
    ${notesBlock}
    ${warnings}
  `;

  return wrapEmailHtml({
    title: `RE-10: ${contact.propertyAddress}`,
    subtitle: `${usd(est.low)} to ${usd(est.high)}`,
    content,
  });
}

export function buildRe10CustomerSubject(contact: Re10Contact): string {
  return `Your RE-10 repair range - ${contact.propertyAddress}`;
}

export function buildRe10AdminSubject(contact: Re10Contact, est: Re10Estimate): string {
  const urgency = contact.repairDeadline ? ` (due ${contact.repairDeadline})` : "";
  return `RE-10 ${usd(est.low)}-${usd(est.high)} - ${contact.propertyAddress}${urgency}`;
}
