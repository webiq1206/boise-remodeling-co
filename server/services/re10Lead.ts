import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";
import { getUncachableEmailClient } from "@/server/services/emailTransport";
import {
  htmlToPlainText,
  getAdminRecipientEmails,
  formatFromAddress,
  getReplyToAddress,
} from "@/server/services/emailLayout";
import { formatLeadReplyTo } from "@/server/services/consultationEmail";
import { forwardToLeadDashboard } from "@/server/services/leadDashboardForward";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { readLocalFile, isLocalUrl, extractLocalKey } from "@/lib/storage/blob";
import { TRADE_LABELS, type Re10Estimate } from "@/shared/costs/re10Repairs";
import {
  buildRe10AdminEmail,
  buildRe10AdminSubject,
  buildRe10CustomerEmail,
  buildRe10CustomerSubject,
  type Re10Contact,
} from "@/server/services/re10Email";

/**
 * Delivering an RE-10 lead: database, CRM, and both emails.
 *
 * WHICH CRM, AND WHY. This site has two lead stores that look similar and are
 * not. `leads` is the Lead Marketplace - leads get priced, admin-reviewed, and
 * bought by outside contractors through Stripe. An RE-10 belongs in neither
 * half of that: the whole page exists so Boise Remodeling Co does the work, so
 * selling the lead on would be the opposite of the point. `consultationRequests`
 * is where every estimator and consultation lead on this site already lands,
 * and the lead dashboard is where the team actually works them. An RE-10 goes
 * exactly where a kitchen estimate goes, and for the same reasons.
 *
 * NO SCHEMA MIGRATION. The RE-10 specifics - role, brokerage, deadline, the
 * repair list - are carried in `message` for the database row and in the
 * dashboard's passthrough `estimate` object for the CRM, which already accepts
 * arbitrary structure. Adding columns would need `db:push` against a live
 * database, which is not something to do as a side effect of shipping a
 * feature.
 *
 * NOTHING HERE CAN FAIL THE REQUEST. The homeowner has their range on screen
 * before any of this runs. A database outage, a bounced email or a CRM timeout
 * is our problem to find in the logs, not theirs to see as an error.
 */

export interface Re10DeliveryInput {
  contact: Re10Contact;
  estimate: Re10Estimate;
  /** Customer-safe view, already built by the route. */
  customerView: Parameters<typeof buildRe10CustomerEmail>[1];
  /** Uploaded originals, so the team has the actual RE-10. */
  documents: { filename: string; url: string }[];
  /**
   * Requests the extractor could not map to a priceable category.
   *
   * These are real repairs the document asked for. They are excluded from the
   * range, which makes putting them in front of the estimator more important
   * rather than less - the gap between the quoted range and the actual job is
   * exactly this list.
   */
  unmapped?: { verbatim: string; reason?: string }[];
  /** What the extractor noticed about the document itself. */
  documentNotes?: string[];
  /** Repairs the customer toggled OFF on the review screen. Named everywhere. */
  excluded?: { description: string }[];
  /** Files stored for the team but not machine-readable. */
  attachedOnly?: string[];
  /**
   * Pricing-alert kinds the route raised while computing this estimate
   * (clamped quantities, a zero or implausible total). Carried onto the CRM
   * record so the person working the lead sees the price needed attention.
   */
  pricingAlerts?: string[];
  /**
   * Page-by-page evidence of what was read, and the internal audit trail
   * showing where each extracted fact came from.
   *
   * INTERNAL ONLY. This is what an estimator needs to check a number against
   * the document without reading a hundred sheets themselves - which sheet a
   * quantity came from, the text it was read out of, and which pages we could
   * not read at all. It never goes to the customer.
   */
  coverageSummary?: string;
  auditTrail?: string;
}

export interface Re10DeliveryResult {
  customerEmailed: boolean;
  adminEmailed: boolean;
  stored: boolean;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/**
 * Document links have to survive leaving the building.
 *
 * The blob store returns a root-relative path on the local driver. That is a
 * fine link inside the app and a dead one inside an email or a CRM record,
 * where there is no page to be relative to.
 */
function absoluteDocUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Put the actual RE-10 in the team's inbox, not a link to it.
 *
 * FOUND LIVE: an RE-10 uploaded half an hour earlier returned 404. Without a
 * BLOB_READ_WRITE_TOKEN the store writes to the container filesystem, and this
 * app runs on ephemeral containers - so every uploaded document dies at the
 * next deploy or scale-to-zero, and the "here is the RE-10" link on the lead
 * goes with it. The team would open a lead about a document nobody can read.
 *
 * An attachment cannot rot. The bytes are pulled at delivery time, minutes
 * after the upload, while they are still there, and from then on they live in
 * an inbox instead of in a container. Setting the blob token is still the right
 * durable fix for the link; this makes the lead survive without it.
 *
 * Failure is reported, never silent: a document we could not attach is named
 * in the email so nobody assumes it was included.
 */
async function collectAttachments(
  documents: { filename: string; url: string }[],
): Promise<{ attachments: { filename: string; content: Buffer }[]; missing: string[] }> {
  const attachments: { filename: string; content: Buffer }[] = [];
  const missing: string[] = [];
  for (const doc of documents) {
    if (!isLocalUrl(doc.url)) continue; // A real blob URL outlives us; link it.
    try {
      const content = await readLocalFile(extractLocalKey(doc.url));
      if (content) attachments.push({ filename: doc.filename, content });
      else missing.push(doc.filename);
    } catch (err) {
      console.error("[re10Lead] could not attach document:", doc.filename, err);
      missing.push(doc.filename);
    }
  }
  return { attachments, missing };
}

/**
 * A readable summary for the CRM's notes field.
 *
 * Written for a person opening the lead cold: what property, what deadline,
 * what was asked for, and what we could not price. The structured record rides
 * alongside in `estimate`; this is the part someone reads.
 */
function buildRe10Notes(input: Re10DeliveryInput): string {
  const { contact, estimate } = input;
  const lines: string[] = [
    // First line of the notes, above even the price, because a lead whose
    // price needed attention should not read like a normal one.
    ...(input.pricingAlerts && input.pricingAlerts.length > 0
      ? [`*** PRICING ALERTS: ${input.pricingAlerts.join(", ")} - check the logs before quoting further ***`, ``]
      : []),
    `RE-10 REPAIR ESTIMATE`,
    `Property: ${contact.propertyAddress}`,
    contact.repairDeadline ? `Repair deadline: ${contact.repairDeadline}` : "",
    contact.closingDate ? `Closing: ${contact.closingDate}` : "",
    contact.occupancy && contact.occupancy !== "unknown" ? `Property is ${contact.occupancy}` : "",
    ``,
    `QUOTED FIRM: ${usd(estimate.quotedPrice)}, held ${estimate.quoteValidDays} days (${estimate.confidence} confidence; internal band ${usd(estimate.low)}-${usd(estimate.high)})`,
    `${estimate.priced.length} repairs priced, ${estimate.review.length} need an onsite look`,
    ``,
    `REPAIRS PRICED`,
    ...estimate.trades.map(
      (t) =>
        `  ${TRADE_LABELS[t.trade]}: ${t.repairs.map((p) => p.input.description).join("; ")}`,
    ),
  ];

  if (input.coverageSummary) {
    lines.push(``, `DOCUMENT COVERAGE`, `  ${input.coverageSummary}`);
  }

  if (estimate.review.length > 0) {
    lines.push(``, `NEEDS ONSITE`);
    for (const r of estimate.review) lines.push(`  ${r.input.description} - ${r.text}`);
  }

  // Loud, and above the documents, because this is the difference between the
  // number we quoted and the job we were actually asked to do.
  if (input.unmapped && input.unmapped.length > 0) {
    lines.push(``, `NOT IN THE RANGE - NO CATEGORY MATCHED (${input.unmapped.length})`);
    for (const u of input.unmapped) lines.push(`  ${u.verbatim}${u.reason ? ` - ${u.reason}` : ""}`);
  }

  if (input.excluded && input.excluded.length > 0) {
    lines.push(``, `REMOVED BY THE CUSTOMER ON REVIEW (${input.excluded.length})`);
    for (const x of input.excluded) lines.push(`  ${x.description}`);
  }

  if (input.attachedOnly && input.attachedOnly.length > 0) {
    lines.push(``, `STORED BUT NOT MACHINE-READABLE (${input.attachedOnly.length})`);
    for (const f of input.attachedOnly) lines.push(`  ${f}`);
  }

  if (input.documentNotes && input.documentNotes.length > 0) {
    lines.push(``, `WHAT WE NOTICED IN THE DOCUMENT`);
    for (const n of input.documentNotes) lines.push(`  ${n}`);
  }

  if (input.documents.length > 0) {
    lines.push(``, `DOCUMENTS`);
    for (const d of input.documents) lines.push(`  ${d.filename}: ${absoluteDocUrl(d.url)}`);
  }

  if (contact.notes) lines.push(``, `THEIR NOTE`, `  ${contact.notes}`);

  /* The audit trail last: it is long, and it is the estimator's tool rather
     than the reader's. Everything above answers "what is this lead"; this
     answers "where did that number come from". */
  if (input.auditTrail) lines.push(``, input.auditTrail);

  return lines.filter((l) => l !== undefined).join("\n");
}

/**
 * The structured record the CRM stores as JSON.
 *
 * Carries the internal economics deliberately: this goes to the team's
 * dashboard, not to the lead, and an estimator picking the job up needs to know
 * the margin and whether it cleared the worthwhile threshold before they commit
 * a crew to somebody else's closing date.
 */
function buildRe10CrmRecord(input: Re10DeliveryInput) {
  const { contact, estimate } = input;
  return {
    kind: "re10-repair-estimate" as const,
    pricingAlerts: input.pricingAlerts ?? [],
    property: {
      address: contact.propertyAddress,
      occupancy: contact.occupancy ?? "unknown",
      closingDate: contact.closingDate ?? null,
      repairDeadline: contact.repairDeadline ?? null,
    },
    representation: {
      role: contact.role,
      brokerage: contact.brokerage ?? null,
      preferredContact: contact.preferredContact,
    },
    quoted: {
      price: estimate.quotedPrice,
      validDays: estimate.quoteValidDays,
      low: estimate.low,
      high: estimate.high,
      confidence: estimate.confidence,
      bandWidth: estimate.bandWidth,
    },
    economics: {
      directCost: Math.round(estimate.directCost),
      mobilization: Math.round(estimate.mobilization),
      coordination: Math.round(estimate.coordination),
      contingency: Math.round(estimate.contingency),
      totalInternalCost: Math.round(estimate.totalInternalCost),
      sellingPrice: Math.round(estimate.sellingPrice),
      grossProfit: Math.round(estimate.grossProfit),
      realisedMargin: Number(estimate.realisedMargin.toFixed(4)),
      marginUplifts: estimate.marginUplifts,
      worthwhile: estimate.worthwhile,
    },
    trades: estimate.trades.map((t) => ({
      trade: t.trade,
      label: t.label,
      crew: t.crew,
      itemCount: t.repairs.length,
      internalCost: Math.round(t.adjustedCost + t.mobilization),
      customerAmount: Math.round(t.customerAmount),
      items: t.repairs.map((p) => ({
        description: p.input.description,
        kind: p.input.kind,
        quantity: p.quantity,
        quantityAssumed: p.quantityAssumed,
        location: p.input.location ?? null,
        sourceRef: p.input.sourceRef ?? null,
      })),
    })),
    needsOnsite: estimate.review.map((r) => ({
      description: r.input.description,
      reason: r.reason,
      explanation: r.text,
    })),
    notInRange: (input.unmapped ?? []).map((u) => ({
      description: u.verbatim,
      reason: u.reason ?? null,
    })),
    documentNotes: input.documentNotes ?? [],
    assumptions: estimate.assumptions,
    uncertainty: estimate.uncertainty,
    warnings: estimate.warnings,
    documents: input.documents,
  };
}

export async function deliverRe10Lead(input: Re10DeliveryInput): Promise<Re10DeliveryResult> {
  const { contact, estimate } = input;
  const result: Re10DeliveryResult = { customerEmailed: false, adminEmailed: false, stored: false };
  const notes = buildRe10Notes(input);

  /* 1. Database, on the same table every other site lead uses. */
  if (db) {
    try {
      await db.insert(consultationRequests).values({
        name: contact.name,
        phone: contact.phone || "",
        email: contact.email || "",
        zip: "",
        address: contact.propertyAddress,
        projectType: "RE-10 repairs",
        message: notes,
        estimateProject: "re-10",
        estimateLow: String(estimate.quotedPrice),
        estimateHigh: String(estimate.quotedPrice),
        estimateConfidence: estimate.confidence,
      });
      result.stored = true;
    } catch (err) {
      console.error("[re10Lead] DB insert failed:", err);
    }
  }

  /* 2. The CRM the team actually works leads in. Fire-and-forget by design. */
  forwardToLeadDashboard({
    fullName: contact.name,
    // The dashboard requires an email. Someone who chose phone or text has not
    // given one, and dropping the lead over that would be worse than a
    // placeholder that is obviously a placeholder.
    email: contact.email || `no-email+${encodeURIComponent(contact.phone || contact.name)}@boiseremodeling.co`,
    phone: contact.phone || undefined,
    propertyAddress: contact.propertyAddress,
    projectTypes: ["RE-10 repairs"],
    projectScope: `RE-10 repair list - ${usd(estimate.quotedPrice)} firm (${estimate.priced.length} priced, ${estimate.review.length} need onsite)`,
    projectGoals: contact.repairDeadline
      ? `Repairs complete by ${contact.repairDeadline}`
      : "Inspection repairs before closing",
    finalNotes: contact.notes || undefined,
    estimateSummary: notes,
    estimateLow: estimate.quotedPrice,
    estimateHigh: estimate.quotedPrice,
    estimateRange: usd(estimate.quotedPrice),
    // Passthrough: the dashboard stores this whole object as JSON rather than
    // stripping fields it does not recognise.
    estimate: buildRe10CrmRecord(input) as never,
    source: "boiseremodeling.co/re-10-repairs-boise",
  });

  /* 3. Both emails. */
  try {
    const { client, fromEmail } = await getUncachableEmailClient();
    const from = formatFromAddress(fromEmail);

    // The transport substitutes a no-op client outside production when Resend
    // is unconfigured, and that stub reports `{ error: null }` - success. Taken
    // at face value this flag would claim "we emailed you a copy" on an
    // environment that sends nothing, which is exactly the lie the flag exists
    // to prevent. The stub marks itself; honour the mark.
    const isNoop = (client as unknown as { __noop?: boolean }).__noop === true;
    if (isNoop) {
      console.warn("[re10Lead] email transport is a no-op here; reporting nothing as sent.");
    }

    const { attachments, missing } = await collectAttachments(input.documents);
    const adminHtml = buildRe10AdminEmail(contact, estimate, {
      unmapped: input.unmapped,
      documentNotes: input.documentNotes,
      excluded: input.excluded,
      attached: attachments.map((a) => a.filename),
      missingDocuments: missing,
    });
    for (const to of await getAdminRecipientEmails(SITE_CONFIG.email)) {
      const sent = await client.emails.send({
        from,
        replyTo: contact.email ? formatLeadReplyTo(contact.name, contact.email) : getReplyToAddress(),
        to,
        subject: buildRe10AdminSubject(contact, estimate),
        html: adminHtml,
        text: htmlToPlainText(adminHtml),
        // The RE-10 itself, so the lead is workable even after the upload
        // store has been recycled out from under the link.
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (sent?.error) console.error(`[re10Lead] admin email to ${to} failed:`, JSON.stringify(sent.error));
      else if (!isNoop) result.adminEmailed = true;
    }

    // Only when there is somewhere to send it. Someone who chose phone contact
    // has not given an address, and inventing one would bounce.
    if (contact.email) {
      const customerHtml = buildRe10CustomerEmail(contact, input.customerView);
      const sent = await client.emails.send({
        from,
        replyTo: getReplyToAddress(),
        to: contact.email,
        subject: buildRe10CustomerSubject(contact),
        html: customerHtml,
        text: htmlToPlainText(customerHtml),
      });
      if (sent?.error) console.error("[re10Lead] customer email failed:", JSON.stringify(sent.error));
      else if (!isNoop) result.customerEmailed = true;
    }
  } catch (err) {
    console.error("[re10Lead] email send failed:", err);
  }

  return result;
}
