import { getUncachableEmailClient } from "@/server/services/emailTransport";
import {
  EMAIL_BRAND,
  escapeHtml,
  formatFromAddress,
  getAdminRecipientEmails,
  htmlToPlainText,
  wrapEmailHtml,
} from "@/server/services/emailLayout";
import { LEADS_DASHBOARD_URL, formatLeadReplyTo } from "@/server/services/consultationEmail";
import { dashboardEmail, forwardToLeadDashboardAsync } from "@/server/services/leadDashboardForward";
import { forwardConsultationToP5Intake } from "@/server/services/p5IntakeBridge";
import type { StoredShortRequest } from "@/server/services/requestDetailsMerge";
import type { RequestFileRecord } from "@/shared/requestDetails";
import { formatFileSize } from "@/shared/requestFiles";
import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * Step 2 (and files) reach every destination the lead reached at step 1:
 * - the internal email, as a short follow-up "Details added: {name}";
 * - the lead dashboard, as a post with the same contact and the DETAILS ADDED block as its notes
 *   (its receiver has no update route; see the note on DASHBOARD_DUPLICATE_WAIT_MS);
 * - p5 intake (and so HubSpot), as submission_kind "details" with the same external_id.
 * Each one fails alone and is logged; none can change what the visitor is told.
 */

export interface DetailsDeliveryInput {
  request: StoredShortRequest;
  block: string;
  timing: string;
  projectType: string;
  files: RequestFileRecord[];
}

/**
 * The dashboard answers 409 to a second lead for the same email within about a minute, and step 2
 * usually arrives inside that minute. One retry after the window keeps the details from being
 * dropped there. The database row, the email and p5 already have them either way.
 */
export const DASHBOARD_DUPLICATE_WAIT_MS = 61_000;

export function buildDetailsEmailHtml(input: DetailsDeliveryInput): string {
  const { request, block, files } = input;
  const tel = `tel:${request.phone.replace(/[^\d+]/g, "")}`;
  const body = block.replace(/^DETAILS ADDED \(ref [0-9a-f]+\)\n?/, "");
  const fileRows = files
    .map(
      (file) =>
        `<li style="margin:0 0 6px;"><a href="${escapeHtml(file.url)}" style="color:${EMAIL_BRAND.accent};">${escapeHtml(file.name)}</a> <span style="color:${EMAIL_BRAND.textMuted};">(${escapeHtml(formatFileSize(file.size))})</span></li>`,
    )
    .join("");
  return wrapEmailHtml({
    title: "Details added",
    subtitle: request.name,
    content: `
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:${EMAIL_BRAND.text};">
        ${escapeHtml(request.name)} added to the request they sent from the website. Same lead as the earlier email.
      </p>
      <p style="margin:0 0 18px;font-size:15px;"><a href="${escapeHtml(tel)}" style="color:${EMAIL_BRAND.accent};">Call ${escapeHtml(request.phone)}</a>${request.email ? ` &middot; <a href="mailto:${escapeHtml(request.email)}" style="color:${EMAIL_BRAND.accent};">${escapeHtml(request.email)}</a>` : ""}</p>
      <div style="background:${EMAIL_BRAND.raised};border-left:3px solid ${EMAIL_BRAND.accent};padding:20px;margin:0 0 18px;border-radius:4px;">
        <p style="margin:0;white-space:pre-wrap;line-height:1.6;color:${EMAIL_BRAND.text};">${escapeHtml(files.length ? body.replace(/\nPhotos and files \(\d+\):[\s\S]*$/, "") : body)}</p>
        ${fileRows ? `<p style="margin:14px 0 6px;color:${EMAIL_BRAND.text};">Photos and files</p><ul style="margin:0;padding-left:18px;">${fileRows}</ul>` : ""}
      </div>
      <p style="font-size:13px;margin:0;"><a href="${escapeHtml(LEADS_DASHBOARD_URL)}" style="color:${EMAIL_BRAND.textMuted};">View in lead dashboard</a></p>
    `,
  });
}

async function sendDetailsEmail(input: DetailsDeliveryInput): Promise<void> {
  try {
    const { client, fromEmail } = await getUncachableEmailClient();
    const html = buildDetailsEmailHtml(input);
    const recipients = await getAdminRecipientEmails(SITE_CONFIG.email);
    for (const to of recipients) {
      const result = await client.emails.send({
        from: formatFromAddress(fromEmail),
        ...(input.request.email ? { replyTo: formatLeadReplyTo(input.request.name, input.request.email) } : {}),
        to,
        subject: `Details added: ${input.request.name}`,
        html,
        text: htmlToPlainText(html),
      });
      if (result?.error) console.error("[request-details] Email failed:", JSON.stringify(result.error));
    }
  } catch (error) {
    console.error("[request-details] Email failed:", error instanceof Error ? error.message : error);
  }
}

export function dashboardDetailsPayload(input: DetailsDeliveryInput) {
  const { request } = input;
  return {
    fullName: request.name,
    email: dashboardEmail(request.email, request.phone, request.name),
    phone: request.phone,
    propertyAddress: request.address || undefined,
    city: request.city || undefined,
    zip: request.zip || undefined,
    projectTypes: request.projectType ? [request.projectType] : [],
    timeline: input.timing || undefined,
    finalNotes: `Same request as the earlier lead from ${request.name}.\n\n${input.block}`,
    estimate: { submissionKind: "details" as const, requestRef: request.inquiryId },
    source: "boiseremodeling.co details",
  };
}

async function sendDashboard(input: DetailsDeliveryInput, waitMs: number): Promise<void> {
  const payload = dashboardDetailsPayload(input);
  const first = await forwardToLeadDashboardAsync(payload);
  if (!first.duplicate) return;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const retry = await forwardToLeadDashboardAsync(payload);
  if (retry.duplicate) console.warn("[request-details] Dashboard kept only the first lead; details are in the row, email and p5.");
}

export function deliverRequestDetails(
  input: DetailsDeliveryInput,
  options: { dashboardWaitMs?: number } = {},
): Promise<void> {
  const p5 = forwardConsultationToP5Intake({
    name: input.request.name,
    email: input.request.email || null,
    phone: input.request.phone,
    address: input.request.address,
    city: input.request.city,
    zip: input.request.zip,
    projectType: input.projectType || null,
    message: `Details added\n\n${input.block}`,
    inquiryId: input.request.inquiryId,
    timeline: input.timing || null,
    files: input.files,
    submissionKind: "details",
  });
  return Promise.all([
    p5,
    sendDashboard(input, options.dashboardWaitMs ?? DASHBOARD_DUPLICATE_WAIT_MS),
    sendDetailsEmail(input),
  ]).then(() => undefined);
}
