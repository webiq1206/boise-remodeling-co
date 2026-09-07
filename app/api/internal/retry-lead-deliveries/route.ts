import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { forwardToLeadDashboardAsync } from "@/server/services/leadDashboardForward";
import { getUncachableEmailClient } from "@/server/services/emailTransport";
import {
  formatFromAddress,
  getAdminRecipientEmails,
  htmlToPlainText,
} from "@/server/services/emailLayout";
import {
  buildAdminEmailHtml,
  buildAdminSubject,
  buildCustomerEmailHtml,
  buildCustomerSubject,
  formatLeadReplyTo,
} from "@/server/services/consultationEmail";
import { recordDeliveryStatus } from "@/server/services/inquiryAcceptance";

/**
 * Protected operational retry for safely stored lead deliveries.
 *
 * It never creates a consultation row and never emits analytics. CRM and email
 * failures remain marked in delivery_status until this endpoint confirms them.
 * Call with Authorization: Bearer LEAD_DASHBOARD_KEY from an approved scheduler
 * or internal operation.
 */
export async function POST(request: NextRequest) {
  const key = process.env.LEAD_DASHBOARD_KEY;
  if (!key || request.headers.get("authorization") !== `Bearer ${key}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!db) return NextResponse.json({ message: "Database unavailable" }, { status: 503 });

  const pending = await db
    .select()
    .from(consultationRequests)
    .where(sql`
      ${consultationRequests.deliveryStatus} IS NOT NULL
      AND (
        ${consultationRequests.deliveryStatus}->>'crm' = 'pending'
        OR ${consultationRequests.deliveryStatus}->>'adminEmail' = 'pending'
        OR ${consultationRequests.deliveryStatus}->>'customerEmail' = 'pending'
        OR
        ${consultationRequests.deliveryStatus}->>'crm' = 'failed'
        OR ${consultationRequests.deliveryStatus}->>'adminEmail' = 'failed'
        OR ${consultationRequests.deliveryStatus}->>'customerEmail' = 'failed'
      )
      AND (
        ${consultationRequests.deliveryLockedAt} IS NULL
        OR ${consultationRequests.deliveryLockedAt} < now() - interval '10 minutes'
      )
    `)
    .limit(25);

  let recovered = 0;
  for (const row of pending) {
    // Atomic lease: if another worker claimed this row after our select, this
    // update returns nothing and this worker skips it. A terminated worker's
    // lease expires after ten minutes, making the row recoverable again.
    const claimed = await db
      .update(consultationRequests)
      .set({
        deliveryLockedAt: new Date(),
        deliveryAttemptCount: sql`${consultationRequests.deliveryAttemptCount} + 1`,
      })
      .where(sql`
        ${consultationRequests.id} = ${row.id}
        AND (
          ${consultationRequests.deliveryLockedAt} IS NULL
          OR ${consultationRequests.deliveryLockedAt} < now() - interval '10 minutes'
        )
      `)
      .returning({ id: consultationRequests.id });
    if (claimed.length === 0) continue;

    const prior = row.deliveryStatus!;
    let crm = prior.crm;
    let adminEmail = prior.adminEmail;
    let customerEmail = prior.customerEmail;
    let lastError: string | undefined;
    const lead = {
      name: row.name,
      phone: row.phone,
      email: row.email,
      address: row.address || "",
      zip: row.zip || undefined,
      projectType: row.projectType,
      message: row.message || undefined,
    };

    if (crm === "failed" || crm === "pending") {
      const result = await forwardToLeadDashboardAsync({
        fullName: row.name,
        email: row.email,
        phone: row.phone || undefined,
        propertyAddress: row.address || undefined,
        city: row.city || undefined,
        zip: row.zip || undefined,
        projectTypes: row.projectType ? [row.projectType] : [],
        finalNotes: row.message || undefined,
        source: "boiseremodeling.co",
      });
      crm = result.sent ? "sent" : "failed";
      lastError = result.error;
    }

    if (
      adminEmail === "failed" ||
      adminEmail === "pending" ||
      customerEmail === "failed" ||
      customerEmail === "pending"
    ) {
      try {
        const { client, fromEmail } = await getUncachableEmailClient();
        const from = formatFromAddress(fromEmail);
        if (adminEmail === "failed" || adminEmail === "pending") {
          const html = buildAdminEmailHtml(lead, null, null);
          const recipients = await getAdminRecipientEmails(SITE_CONFIG.email);
          const results = await Promise.all(
            recipients.map((to) =>
              client.emails.send({
                from,
                ...(row.email ? { replyTo: formatLeadReplyTo(row.name, row.email) } : {}),
                to,
                subject: buildAdminSubject(lead, null),
                html,
                text: htmlToPlainText(html),
              }),
            ),
          );
          adminEmail = results.every((result) => !result?.error) ? "sent" : "failed";
        }
        if ((customerEmail === "failed" || customerEmail === "pending") && row.email) {
          const html = buildCustomerEmailHtml(lead, null);
          const result = await client.emails.send({
            from,
            to: row.email,
            subject: buildCustomerSubject(lead, null),
            html,
            text: htmlToPlainText(html),
          });
          customerEmail = result?.error ? "failed" : "sent";
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    await recordDeliveryStatus(row.id, {
      crm,
      adminEmail,
      customerEmail,
      ...(lastError ? { lastError: lastError.slice(0, 1000) } : {}),
    });
    if (crm !== "failed" && adminEmail !== "failed" && customerEmail !== "failed") {
      recovered++;
    }
  }

  return NextResponse.json({ checked: pending.length, recovered });
}