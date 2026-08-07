import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";
import { getUncachableEmailClient } from "@/server/services/emailTransport";
import {
  formatFromAddress,
  getAdminRecipientEmails,
  getReplyToAddress,
  htmlToPlainText,
} from "@/server/services/emailLayout";
import { forwardToLeadDashboard } from "@/server/services/leadDashboardForward";
import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * Delivery for leads captured in the estimating assistant.
 *
 * Same three destinations as every other lead on the site - the
 * `consultationRequests` table, the CRM dashboard, the admin inbox - and the
 * same posture as `deliverRe10Lead`: nothing here can fail the conversation.
 * The customer has already been told the team will follow up; an outage on
 * any leg is ours to find in the logs.
 *
 * The estimate block comes from server-side session state written when a
 * pricing tool actually ran, never from model output, so the numbers on the
 * lead are the numbers an engine computed.
 */

export interface AssistantLeadInput {
  name: string;
  email?: string;
  phone?: string;
  preferredContact: "email" | "phone" | "text";
  projectSummary: string;
  timeline?: string;
  propertyAddress?: string;
  zip?: string;
  conversationSummary: string;
  estimate: {
    kind: "remodel" | "repairs";
    label: string;
    priceLow: number;
    priceHigh: number;
    detail: string;
  } | null;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildNotes(input: AssistantLeadInput): string {
  const lines = [
    "LEAD FROM THE ESTIMATING ASSISTANT (chat)",
    `Project: ${input.projectSummary}`,
    input.timeline ? `Timeline: ${input.timeline}` : "",
    input.propertyAddress ? `Property: ${input.propertyAddress}` : "",
    "",
    input.estimate
      ? `ENGINE-PRICED IN CHAT: ${input.estimate.label} - ${input.estimate.detail}`
      : "No estimate was priced in this conversation.",
    "",
    "CONVERSATION RECAP",
    input.conversationSummary,
  ];
  return lines.filter((l) => l !== null).join("\n").replace(/\n{3,}/g, "\n\n");
}

export async function deliverAssistantLead(
  input: AssistantLeadInput,
): Promise<{ ok: boolean }> {
  const notes = buildNotes(input);
  let stored = false;

  if (db) {
    try {
      await db.insert(consultationRequests).values({
        name: input.name,
        phone: input.phone || "",
        email: input.email || "",
        zip: input.zip || "",
        address: input.propertyAddress || "",
        projectType: input.projectSummary.slice(0, 120),
        message: notes,
        estimateProject: input.estimate ? input.estimate.kind : null,
        estimateLow: input.estimate ? String(input.estimate.priceLow) : null,
        estimateHigh: input.estimate ? String(input.estimate.priceHigh) : null,
      });
      stored = true;
    } catch (err) {
      console.error("[assistantLead] DB insert failed:", err);
    }
  }

  forwardToLeadDashboard({
    fullName: input.name,
    email:
      input.email ||
      `no-email+${encodeURIComponent(input.phone || input.name)}@boiseremodeling.co`,
    phone: input.phone || undefined,
    propertyAddress: input.propertyAddress || undefined,
    zip: input.zip || undefined,
    projectTypes: [input.projectSummary.slice(0, 80)],
    projectScope: input.estimate
      ? `${input.estimate.label} - ${usd(input.estimate.priceLow)}${
          input.estimate.priceHigh !== input.estimate.priceLow
            ? ` to ${usd(input.estimate.priceHigh)}`
            : " firm"
        }`
      : undefined,
    projectGoals: input.timeline ? `Timeline: ${input.timeline}` : undefined,
    estimateSummary: notes,
    estimateLow: input.estimate?.priceLow,
    estimateHigh: input.estimate?.priceHigh,
    estimateRange: input.estimate
      ? `${usd(input.estimate.priceLow)} to ${usd(input.estimate.priceHigh)}`
      : undefined,
    source: "boiseremodeling.co/assistant",
  });

  let emailed = false;
  try {
    const { client, fromEmail } = await getUncachableEmailClient();
    const isNoop = (client as unknown as { __noop?: boolean }).__noop === true;
    if (!isNoop) {
      const from = formatFromAddress(fromEmail);
      const html =
        `<h2 style="margin:0 0 12px;">Assistant chat lead: ${esc(input.name)}</h2>` +
        `<p style="margin:0 0 12px;">Preferred contact: ${esc(input.preferredContact)}` +
        (input.email ? ` &middot; ${esc(input.email)}` : "") +
        (input.phone ? ` &middot; ${esc(input.phone)}` : "") +
        `</p>` +
        `<pre style="font-family:inherit;white-space:pre-wrap;margin:0;">${esc(notes)}</pre>`;
      const adminEmails = await getAdminRecipientEmails(SITE_CONFIG.email);
      for (const adminEmail of adminEmails) {
        const result = await client.emails.send({
          from,
          replyTo: input.email ? `${input.name} <${input.email}>` : getReplyToAddress(),
          to: adminEmail,
          subject: `Assistant lead: ${input.name}${
            input.estimate ? ` (${usd(input.estimate.priceLow)}${input.estimate.priceHigh !== input.estimate.priceLow ? `-${usd(input.estimate.priceHigh)}` : ""})` : ""
          }`,
          html,
          text: htmlToPlainText(html),
        });
        if (result?.error) {
          console.error(`[assistantLead] Admin email to ${adminEmail} failed:`, JSON.stringify(result.error));
        } else {
          emailed = true;
        }
      }
    }
  } catch (err) {
    console.error("[assistantLead] Email send failed:", err);
  }

  // The lead "took" if ANY leg landed; with all three down there is nothing
  // to follow up from and the assistant must fall back to phone and email.
  const forwarded = Boolean(process.env.LEAD_DASHBOARD_KEY);
  return { ok: stored || emailed || forwarded };
}
