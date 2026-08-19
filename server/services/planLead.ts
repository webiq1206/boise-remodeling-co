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
import type { AdminView, LeadView } from "@/shared/costs";
import type { PlanMeasurements } from "@/shared/plans/estimateInput";
import {
  buildPlanAdminEmail,
  buildPlanAdminSubject,
  buildPlanCustomerEmail,
  buildPlanCustomerSubject,
  type PlanContact,
} from "@/server/services/planEmail";

/**
 * Delivering a plan-set lead: database, CRM, and both emails.
 *
 * Same destinations and the same reasons as the RE-10 flow. `consultationRequests`
 * plus the lead dashboard, NOT the `leads` table, which is the Lead Marketplace
 * that sells leads to other contractors - this page exists so Boise Remodeling
 * Co does the work. No schema migration: the plan specifics ride in `message`
 * and in the dashboard's passthrough `estimate` object, because adding columns
 * would need `db:push` against a live database.
 *
 * NOTHING HERE CAN FAIL THE REQUEST. The customer has their range on screen
 * before any of this runs.
 */

export interface PlanDeliveryInput {
  contact: PlanContact;
  /** Customer-safe. Handed to the customer email builder and to nothing else. */
  lead: LeadView;
  /** Internal. Never reaches the customer builder; see planEmail.ts. */
  admin: AdminView;
  measurements: PlanMeasurements | null;
  statedTotalSqFt: number;
  blockers: string[];
  notMeasured: string[];
  /** Work read off the drawings that is ours to price. */
  scopeItems: { category: string; description: string; sheet?: string | null }[];
  /** Work the drawings hand to someone else. Named on every surface. */
  excludedScope: { category: string; description: string; sheet?: string | null }[];
  /**
   * Budget placeholders the drawings set for selections nobody has made yet.
   * Real money, but the final figure moves - so they are listed apart from
   * confirmed scope rather than blended into it.
   */
  allowances?: { description: string; sheet?: string | null; statedAmount?: number | null }[];
  /** Work the drawings mark to be priced separately, NOT in the base bid. */
  alternates?: { description: string; sheet?: string | null }[];
  warnings: string[];
  /**
   * Page-level coverage and the extraction audit trail.
   *
   * INTERNAL ONLY, same as the RE-10 lead. This is how an estimator checks a
   * figure against a hundred-sheet set without opening it: which sheet a room
   * area came from, the text it was read out of, and which sheets we could not
   * read at all. Never shown to the customer.
   */
  coverageSummary?: string;
  auditTrail?: string;
  /** What the customer told us when the drawings did not say. */
  clarifications?: { question: string; answer: string }[];
  sheetsUsed: string[];
  documents: { filename: string; url: string }[];
}

export interface PlanDeliveryResult {
  customerEmailed: boolean;
  adminEmailed: boolean;
  stored: boolean;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function absoluteDocUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return `${SITE_CONFIG.siteUrl.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Attach the drawings rather than link them.
 *
 * The same lesson the RE-10 flow paid for: without a blob token the store writes
 * to an ephemeral container, so a link on a lead is dead by the next deploy and
 * the team opens a lead about drawings nobody can read. Plan sets are large, so
 * this is more likely to be the only copy anyone has, not less.
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
      console.error("[planLead] could not attach drawing:", doc.filename, err);
      missing.push(doc.filename);
    }
  }
  return { attachments, missing };
}

/**
 * The readable summary for the CRM, written for someone opening the lead cold.
 *
 * Leads with the provenance, because "we measured this off their drawings" and
 * "they told us it was about 2,000 square feet" need completely different
 * amounts of walkthrough, and that is the first thing an estimator has to know.
 */
function buildPlanNotes(input: PlanDeliveryInput): string {
  const { contact, admin, measurements: m } = input;
  const lines: string[] = [
    `PLAN SET ESTIMATE`,
    `Property: ${contact.propertyAddress}`,
    `Project: ${contact.projectType}, ${contact.finishLevel} finish`,
    contact.timeline ? `Timeline: ${contact.timeline}` : "",
    ``,
    m
      ? `MEASURED FROM THE DRAWINGS: ${Math.round(m.sqft).toLocaleString("en-US")} sq ft over ${m.measuredRooms} rooms, ` +
        `${Math.round(m.interiorPerimeterFt).toLocaleString("en-US")} LF interior wall` +
        (m.ceilingHeight !== null ? `, ${m.ceilingHeight.toFixed(1)} ft ceilings` : "") +
        (m.bathroomCount !== null ? `, ${m.bathroomCount} bathrooms` : "")
      : `NOT MEASURED FROM THE DRAWINGS. Priced from the customer's stated area only.`,
    `Customer stated total: ${input.statedTotalSqFt.toLocaleString("en-US")} sq ft`,
    ``,
    `QUOTED ${usd(admin.range.low)} to ${usd(admin.range.high)} (centre ${usd(admin.customerPrice)})`,
    `${admin.marginLabel}. Internal ${usd(admin.totalInternalCost)}, gross profit ${usd(admin.grossProfit)}.`,
  ];

  if (input.blockers.length > 0) {
    lines.push(``, `GATES THE DRAWINGS DID NOT CLEAR`);
    for (const b of input.blockers) lines.push(`  ${b}`);
  }
  // Above the documents on purpose: this is the gap between what we measured
  // and the house they actually own.
  if (input.notMeasured.length > 0) {
    lines.push(``, `ROOMS WITH NO PRINTED AREA - NOT IN THE MEASURED FIGURE (${input.notMeasured.length})`);
    for (const n of input.notMeasured) lines.push(`  ${n}`);
  }
  if (input.scopeItems.length > 0) {
    lines.push(``, `SCOPE READ OFF THE DRAWINGS (${input.scopeItems.length})`);
    for (const s of input.scopeItems) {
      lines.push(`  [${s.category}] ${s.description}${s.sheet ? ` (${s.sheet})` : ""}`);
    }
  }
  // Above the warnings, because an estimator who prices the greenhouse has made
  // a more expensive mistake than one who missed a note.
  if (input.excludedScope.length > 0) {
    lines.push(``, `NOT OURS - THE DRAWINGS GIVE IT TO SOMEONE ELSE (${input.excludedScope.length})`);
    for (const s of input.excludedScope) {
      lines.push(`  [${s.category}] ${s.description}${s.sheet ? ` (${s.sheet})` : ""}`);
    }
  }
  if (input.warnings.length > 0) {
    lines.push(``, `WHAT THE EXTRACTOR NOTICED`);
    for (const w of input.warnings) lines.push(`  ${w}`);
  }
  if (input.sheetsUsed.length > 0) lines.push(``, `SHEETS READ: ${input.sheetsUsed.join(", ")}`);
  if (input.documents.length > 0) {
    lines.push(``, `DRAWINGS`);
    for (const d of input.documents) lines.push(`  ${d.filename}: ${absoluteDocUrl(d.url)}`);
  }
  if (contact.notes) lines.push(``, `THEIR NOTE`, `  ${contact.notes}`);

  if (input.allowances && input.allowances.length > 0) {
    lines.push(``, `ALLOWANCES STATED ON THE DRAWINGS (placeholders, not confirmed scope)`);
    for (const a of input.allowances) {
      lines.push(
        `  ${a.description}${a.statedAmount ? ` - $${Math.round(a.statedAmount).toLocaleString("en-US")} stated` : ""}${a.sheet ? ` (${a.sheet})` : ""}`,
      );
    }
  }

  if (input.alternates && input.alternates.length > 0) {
    lines.push(``, `ALTERNATES AND OPTIONS - NOT IN THE BASE NUMBER`);
    for (const a of input.alternates) lines.push(`  ${a.description}${a.sheet ? ` (${a.sheet})` : ""}`);
  }

  /* High in the notes: these are answers to things the drawings left out, so
     they belong beside the measurements rather than buried under them. */
  if (input.clarifications && input.clarifications.length > 0) {
    lines.push(``, `ANSWERED BY THE CUSTOMER`);
    for (const c of input.clarifications) lines.push(`  Q: ${c.question}`, `  A: ${c.answer}`);
  }

  if (input.coverageSummary) {
    lines.push(``, `DOCUMENT COVERAGE`, `  ${input.coverageSummary}`);
  }
  /* The audit trail last: long, and the estimator's tool rather than the
     reader's. Everything above says what this lead is; this says where each
     number came from. */
  if (input.auditTrail) lines.push(``, input.auditTrail);

  return lines.filter((l) => l !== undefined).join("\n");
}

/** The structured record the CRM stores as JSON. Internal, so it carries economics. */
function buildPlanCrmRecord(input: PlanDeliveryInput) {
  const { contact, admin, measurements: m } = input;
  return {
    kind: "plan-set-estimate" as const,
    property: { address: contact.propertyAddress },
    project: {
      type: contact.projectType,
      finishLevel: contact.finishLevel,
      timeline: contact.timeline ?? null,
      preferredContact: contact.preferredContact,
    },
    measurements: m
      ? {
          source: "drawings" as const,
          sqft: Math.round(m.sqft),
          interiorPerimeterFt: Math.round(m.interiorPerimeterFt),
          ceilingHeight: m.ceilingHeight,
          bathroomCount: m.bathroomCount,
          measuredRooms: m.measuredRooms,
          notes: m.notes,
        }
      : { source: "customer-stated" as const, sqft: input.statedTotalSqFt },
    statedTotalSqFt: input.statedTotalSqFt,
    quoted: { low: admin.range.low, high: admin.range.high, centre: Math.round(admin.customerPrice) },
    economics: {
      directCost: Math.round(admin.directCost),
      contingency: Math.round(admin.contingency),
      totalInternalCost: Math.round(admin.totalInternalCost),
      grossProfit: Math.round(admin.grossProfit),
      marginLabel: admin.marginLabel,
      marginTrimmed: admin.marginTrimmed,
    },
    trades: admin.trades.map((t) => ({
      division: t.division,
      scopeSummary: t.scopeSummary,
      internalCost: Math.round(t.internalCost),
      customerAmount: Math.round(t.customerAmount),
    })),
    scopeItems: input.scopeItems,
    excludedScope: input.excludedScope,
    scopeRatings: m ? { layoutChanges: m.layoutChanges, plumbingElectrical: m.plumbingElectrical } : null,
    blockers: input.blockers,
    notMeasured: input.notMeasured,
    extractorWarnings: input.warnings,
    sheetsUsed: input.sheetsUsed,
    documents: input.documents,
  };
}

export async function deliverPlanLead(input: PlanDeliveryInput): Promise<PlanDeliveryResult> {
  const { contact, admin } = input;
  const result: PlanDeliveryResult = { customerEmailed: false, adminEmailed: false, stored: false };
  const notes = buildPlanNotes(input);
  const rangeLabel = `${usd(admin.range.low)} to ${usd(admin.range.high)}`;

  /* 1. Database, on the same table every other site lead uses. */
  if (db) {
    try {
      await db.insert(consultationRequests).values({
        name: contact.name,
        phone: contact.phone || "",
        email: contact.email || "",
        zip: "",
        address: contact.propertyAddress,
        projectType: `Plans: ${contact.projectType}`,
        message: notes,
        estimateProject: "plans",
        estimateLow: String(admin.range.low),
        estimateHigh: String(admin.range.high),
        estimateConfidence: input.measurements ? "high" : "medium",
      });
      result.stored = true;
    } catch (err) {
      console.error("[planLead] DB insert failed:", err);
    }
  }

  /* 2. The CRM the team actually works leads in. Fire-and-forget by design. */
  forwardToLeadDashboard({
    fullName: contact.name,
    // The dashboard requires an email. A placeholder that is obviously a
    // placeholder beats dropping a lead over a missing field.
    email: contact.email || `no-email+${encodeURIComponent(contact.phone || contact.name)}@boiseremodeling.co`,
    phone: contact.phone || undefined,
    propertyAddress: contact.propertyAddress,
    projectTypes: [contact.projectType],
    projectScope: input.measurements
      ? `Plan set, measured: ${Math.round(input.measurements.sqft).toLocaleString("en-US")} sq ft over ${input.measurements.measuredRooms} rooms`
      : `Plan set, not measurable: priced from a stated ${input.statedTotalSqFt.toLocaleString("en-US")} sq ft`,
    projectGoals: contact.timeline || "Remodel priced from drawings",
    finalNotes: contact.notes || undefined,
    estimateSummary: notes,
    estimateLow: admin.range.low,
    estimateHigh: admin.range.high,
    estimateRange: rangeLabel,
    estimate: buildPlanCrmRecord(input) as never,
    source: "boiseremodeling.co/remodel-plans-boise",
  });

  /* 3. Both emails. */
  try {
    const { client, fromEmail } = await getUncachableEmailClient();
    const from = formatFromAddress(fromEmail);

    // The transport substitutes a no-op client outside production when Resend
    // is unconfigured, and that stub reports success. Taken at face value the
    // flag would claim "we emailed you a copy" on an environment that sends
    // nothing, which is the exact lie the flag exists to prevent.
    const isNoop = (client as unknown as { __noop?: boolean }).__noop === true;
    if (isNoop) console.warn("[planLead] email transport is a no-op here; reporting nothing as sent.");

    const { attachments, missing } = await collectAttachments(input.documents);
    const adminHtml = buildPlanAdminEmail(contact, admin, input, {
      documents: input.documents,
      missingAttachments: missing,
      warnings: input.warnings,
      sheetsUsed: input.sheetsUsed,
    });
    for (const to of await getAdminRecipientEmails(SITE_CONFIG.email)) {
      const sent = await client.emails.send({
        from,
        replyTo: contact.email ? formatLeadReplyTo(contact.name, contact.email) : getReplyToAddress(),
        to,
        subject: buildPlanAdminSubject(contact, rangeLabel),
        html: adminHtml,
        text: htmlToPlainText(adminHtml),
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (sent?.error) console.error(`[planLead] admin email to ${to} failed:`, JSON.stringify(sent.error));
      else if (!isNoop) result.adminEmailed = true;
    }

    if (contact.email) {
      // The customer builder is handed the LEAD view and nothing else. There is
      // no argument position here through which a cost could reach it.
      const customerHtml = buildPlanCustomerEmail(contact, {
        lead: input.lead,
        measurements: input.measurements,
        statedTotalSqFt: input.statedTotalSqFt,
        blockers: input.blockers,
        notMeasured: input.notMeasured,
      });
      const sent = await client.emails.send({
        from,
        replyTo: getReplyToAddress(),
        to: contact.email,
        subject: buildPlanCustomerSubject(contact),
        html: customerHtml,
        text: htmlToPlainText(customerHtml),
      });
      if (sent?.error) console.error("[planLead] customer email failed:", JSON.stringify(sent.error));
      else if (!isNoop) result.customerEmailed = true;
    }
  } catch (err) {
    console.error("[planLead] email send failed:", err);
  }

  return result;
}
