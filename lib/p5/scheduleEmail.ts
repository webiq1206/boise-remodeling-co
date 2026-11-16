/**
 * Lead confirmation copy and the Schedule now button.
 *
 * One booking page serves every brand. The URL cannot preselect a length, so
 * the sentence above the button tells the lead which option to choose:
 * 1 hour for a home walkthrough, 15 minutes for a phone consult.
 *
 * The button is a table, with Outlook VML beside it, so Gmail, Outlook and
 * iOS Mail all show a real button without depending on a stylesheet.
 *
 * Copied from the parent confirmation in p5-home-co (app/lib/leads/scheduleEmail.ts).
 * Brand facts stay with the caller. This module does not name a shop or showroom.
 *
 * After an estimate (owner request, 16 November 2026) the customer is also
 * invited to adjust it and asked one question, as a P.S., with the family
 * note for this brand. Those words are the ones approved for the family's
 * central estimator. They live here and nowhere else in this repository:
 * ESTIMATE_ADJUST_NOTE rides inside the estimate block, before the
 * disclaimer, and every customer email that embeds the estimate block ends
 * with ESTIMATE_FAMILY_PS (text) or estimatePostscriptHtml() (HTML), after
 * its sign-off. Request confirmations and team emails carry neither.
 */

/** HubSpot meetings page. Durations on the page are 15, 30, 60 and 120 minutes. */
export const SCHEDULE_URL = "https://meetings-na2.hubspot.com/client3";

export const BUTTON_CHARCOAL = "#383837";
export const BUTTON_WHITE = "#ffffff";
export const BUTTON_PAPER = "#fbfaf6";

export type ScheduleIntent = "walkthrough" | "consult";

export const ESTIMATE_DISCLAIMER =
  "We work hard to make that estimate as realistic as we can, but we can't give you a true bid until we walk the property. Depending on the scope and what we find, the bid may come in higher or lower than this first estimate. Either way, we'll work with you to get you what you want, within your budget.";

export const SHARED_DISCLAIMER =
  "We work hard to make any estimate we share as realistic as we can, but we can't give you a true bid until we walk the property. Depending on the scope and what we find, the bid may come in higher or lower than that first estimate. Either way, we'll work with you to get you what you want, within your budget.";

/** An estimate is easy to change, and the customer should hear that before the disclaimer. */
export const ESTIMATE_ADJUST_NOTE =
  "If something is missing, or you'd like to change the scope, the finishes or the timing, tell us. It's easy to adjust, and we'd rather get it right than have you guessing.";

/**
 * The last paragraph of every customer email about an estimate. Always a
 * question, never a pitch, and it names the family this brand belongs to.
 */
export const ESTIMATE_FAMILY_PS =
  "P.S. Anything else on your list? Boise Remodeling Co is part of P5 Home Co, the company behind Boise Construction Co, Boise Cabinet Co and Boise Handyman Co. So whether it's a few repairs, new cabinets, a full kitchen or bath remodel, an addition or a new home, tell us and we'll plan it alongside this project.";

export function scheduleIntentFor(input: { requestKind?: string | null; form?: string | null }): ScheduleIntent {
  const kind = (input.requestKind ?? "").trim().toLowerCase();
  const form = (input.form ?? "").trim().toLowerCase();
  if (kind === "callback" || form === "site chat" || form.includes("call you")) return "consult";
  return "walkthrough";
}

/** The words that tell the lead which length to pick on the shared booking page. */
export function durationChoice(intent: ScheduleIntent): string {
  return intent === "consult" ? "the 15 minute option for a phone consult" : "the 1 hour option for a home walkthrough";
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(value: string): string {
  const trimmed = value.trim();
  if (!/^https:\/\/[^\s"'<>]+$/.test(trimmed)) return SCHEDULE_URL;
  return trimmed;
}

function safeAccent(value: string | undefined): string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? (value as string) : "#7D9479";
}

/**
 * The P.S. as the closing HTML paragraph. The caller places it last, after
 * its sign-off. With no colour it inherits the email's own text colour, so
 * it reads on the charcoal letters and the light ones alike.
 */
export function estimatePostscriptHtml(options: { color?: string; fontSize?: number } = {}): string {
  const color = /^#[0-9a-fA-F]{6}$/.test(options.color ?? "") ? `color:${options.color};` : "";
  const size = Number.isFinite(options.fontSize) && (options.fontSize as number) >= 12 && (options.fontSize as number) <= 20 ? Math.round(options.fontSize as number) : 16;
  return `<p style="margin:24px 0 0;font-size:${size}px;line-height:1.6;${color}">${esc(ESTIMATE_FAMILY_PS)}</p>`;
}

/**
 * A full-width button. Primary is charcoal with white text and a brand
 * accent bar. Secondary is an outline on paper, shorter, so it reads as
 * the quieter action.
 */
export function bulletproofButton(options: {
  href: string;
  label: string;
  variant: "primary" | "secondary";
  accent?: string;
}): string {
  const href = esc(safeHref(options.href));
  const label = esc(options.label);
  const accent = safeAccent(options.accent);
  if (options.variant === "secondary") {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 18px;">
<tr>
<td align="center" bgcolor="${BUTTON_PAPER}" style="background-color:${BUTTON_PAPER};border:2px solid ${BUTTON_CHARCOAL};">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:520px;" arcsize="4%" strokecolor="${BUTTON_CHARCOAL}" fillcolor="${BUTTON_PAPER}">
<w:anchorlock/>
<center style="color:${BUTTON_CHARCOAL};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${href}" target="_blank" style="display:block;padding:12px 20px;background-color:${BUTTON_PAPER};color:${BUTTON_CHARCOAL};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;border:0;mso-hide:all;">${label}</a>
<!--<![endif]-->
</td>
</tr>
</table>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:8px 0 0;">
<tr>
<td align="center" bgcolor="${BUTTON_CHARCOAL}" style="background-color:${BUTTON_CHARCOAL};">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:56px;v-text-anchor:middle;width:520px;" arcsize="4%" strokecolor="${BUTTON_CHARCOAL}" fillcolor="${BUTTON_CHARCOAL}">
<w:anchorlock/>
<center style="color:${BUTTON_WHITE};font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;">${label}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${href}" target="_blank" style="display:block;padding:16px 24px;background-color:${BUTTON_CHARCOAL};color:${BUTTON_WHITE};font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:24px;text-align:center;text-decoration:none;border:0;mso-hide:all;">${label}</a>
<!--<![endif]-->
</td>
</tr>
<tr>
<td bgcolor="${accent}" style="background-color:${accent};height:4px;font-size:0;line-height:0;">&nbsp;</td>
</tr>
</table>`;
}

export type ScheduleBlockInput = {
  kind: "estimate" | "request";
  intent?: ScheduleIntent;
  accent?: string;
  /**
   * This site's consultation, plans and repair emails sit on a charcoal
   * ground. The button is the same charcoal, so it needs a paper panel or
   * it disappears. Light emails (the saved-estimate letter, intake) leave
   * this off.
   */
  panel?: boolean;
  secondary?: { href: string; label: string };
};

function nextSentence(input: ScheduleBlockInput): string {
  if (input.kind === "estimate") {
    return "The next step is a home walkthrough, so we can see the property and turn this estimate into a true bid. On the scheduling page, choose the 1 hour option.";
  }
  return `If you would like to get on the calendar now, use the button below and choose ${durationChoice(input.intent ?? "walkthrough")}.`;
}

function disclaimerFor(kind: ScheduleBlockInput["kind"]): string {
  return kind === "estimate" ? ESTIMATE_DISCLAIMER : SHARED_DISCLAIMER;
}

/** Plain-text block. The booking URL is written out in full. */
export function scheduleBlockText(input: ScheduleBlockInput): string {
  const lines = [nextSentence(input), "", `Schedule now: ${SCHEDULE_URL}`, ""];
  if (input.secondary) lines.push(`${input.secondary.label}: ${safeHref(input.secondary.href)}`, "");
  if (input.kind === "estimate") lines.push(ESTIMATE_ADJUST_NOTE, "");
  lines.push(disclaimerFor(input.kind));
  return lines.join("\n");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BUTTON_CHARCOAL};">${esc(text)}</p>`;
}

/**
 * HTML block: the duration sentence, the charcoal button, the URL, the
 * disclaimer. The estimate variant invites changes just before the disclaimer.
 */
export function scheduleBlockHtml(input: ScheduleBlockInput): string {
  const accent = input.accent;
  const inner = [
    paragraph(nextSentence(input)),
    bulletproofButton({ href: SCHEDULE_URL, label: "Schedule now", variant: "primary", accent }),
    `<p style="margin:12px 0 16px;font-size:13px;line-height:1.5;color:${BUTTON_CHARCOAL};">Schedule now: <a href="${esc(SCHEDULE_URL)}" style="color:${BUTTON_CHARCOAL};">${esc(SCHEDULE_URL)}</a></p>`,
    input.secondary
      ? `<div style="height:4px;line-height:4px;font-size:0;">&nbsp;</div>${bulletproofButton({ href: input.secondary.href, label: input.secondary.label, variant: "secondary" })}`
      : "",
    input.kind === "estimate" ? paragraph(ESTIMATE_ADJUST_NOTE) : "",
    paragraph(disclaimerFor(input.kind)),
  ].join("");
  if (!input.panel) return inner;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 20px;">
<tr>
<td bgcolor="${BUTTON_PAPER}" style="background-color:${BUTTON_PAPER};padding:20px 18px;color:${BUTTON_CHARCOAL};">
${inner}
</td>
</tr>
</table>`;
}
