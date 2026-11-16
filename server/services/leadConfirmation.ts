/**
 * The short lead confirmation: greeting, Schedule now, disclaimer.
 *
 * When the lead already saw an estimate (kind "estimate") the letter opens
 * with "Hey", invites changes before the disclaimer and ends with the family
 * P.S. after the sign-off. A plain request confirmation has none of that.
 *
 * Used when a form saves a lead and does not already send its own customer
 * letter (assistant chat, Facebook instant form, and the short-request step
 * that first records an email). A missing address is a no-op. A send failure
 * is logged and never thrown, so it cannot change the visitor's response.
 */

import { ESTIMATOR_BRAND } from "@/lib/p5/brand";
import {
  ESTIMATE_FAMILY_PS,
  estimatePostscriptHtml,
  scheduleBlockHtml,
  scheduleBlockText,
  type ScheduleIntent,
} from "@/lib/p5/scheduleEmail";
import {
  escapeHtml,
  formatFromAddress,
  getReplyToAddress,
  htmlToPlainText,
  wrapEmailHtml,
} from "@/server/services/emailLayout";
import { getUncachableEmailClient } from "@/server/services/emailTransport";
import { SITE_CONFIG, textReplyLineHtml } from "@/shared/siteConfig";

export function greetingName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

export function buildLeadConfirmation(input: {
  name: string | null;
  intent: ScheduleIntent;
  /** An estimate the lead already saw uses the estimate disclaimer. */
  kind?: "estimate" | "request";
}): { subject: string; html: string; text: string } {
  const first = greetingName(input.name);
  const brandName = ESTIMATOR_BRAND.name;
  const kind = input.kind ?? "request";
  const thanks =
    kind === "estimate"
      ? `Thanks for thinking of ${brandName}. Your estimate is saved.`
      : `Thanks for reaching out to ${brandName}. We have your request, and someone from the team will follow up shortly.`;
  const contact = `If you have questions, just reply to this email or call ${SITE_CONFIG.phone}.`;
  const signoff = `The ${brandName} team`;
  const block = scheduleBlockText({ kind, intent: input.intent });
  const greeting = kind === "estimate" ? `Hey ${first},` : `Hi ${first},`;
  const text = [greeting, "", thanks, "", block, "", contact, "", signoff, ...(kind === "estimate" ? ["", ESTIMATE_FAMILY_PS] : [])].join("\n");
  const html = wrapEmailHtml({
    title: "We have your request",
    content: `
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(thanks)}</p>
      ${scheduleBlockHtml({ kind, intent: input.intent, accent: ESTIMATOR_BRAND.accent, panel: true })}
      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${escapeHtml(contact)}</p>
      ${textReplyLineHtml()}
      <p style="margin:24px 0 0;font-size:16px;line-height:1.6;">${escapeHtml(signoff)}</p>
      ${kind === "estimate" ? estimatePostscriptHtml() : ""}
    `,
  });
  return {
    subject: `We have your request, ${first}`,
    html,
    text: text || htmlToPlainText(html),
  };
}

export async function sendLeadConfirmation(input: {
  email: string | null | undefined;
  name: string | null;
  intent: ScheduleIntent;
  kind?: "estimate" | "request";
}): Promise<void> {
  const email = (input.email ?? "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  try {
    const message = buildLeadConfirmation(input);
    const { client, fromEmail } = await getUncachableEmailClient();
    const result = await client.emails.send({
      from: formatFromAddress(fromEmail),
      replyTo: getReplyToAddress(),
      to: email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (result?.error) console.error("[lead-confirmation] not sent:", JSON.stringify(result.error));
  } catch (error) {
    console.error("[lead-confirmation] failed:", error instanceof Error ? error.message : error);
  }
}
