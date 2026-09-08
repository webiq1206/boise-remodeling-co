/**
 * The two staff emails for estimator recovery. Both carry every non-sensitive
 * fact about the session and say plainly when there is no contact information.
 */
import { SITE_CONFIG } from "@/shared/siteConfig";
import type { EstimatorSession } from "@/shared/schema";
import { EMAIL_BRAND, SITE_BASE_URL, escapeHtml, wrapEmailHtml } from "./emailLayout";

const FLOW_LABELS: Record<string, string> = {
  estimate: "Project estimator",
  re10: "RE-10 repair estimator",
  plans: "Estimate from plans",
  consultation: "Consultation form",
  quote: "Quote form",
};

function flowLabel(flow: string): string {
  return FLOW_LABELS[flow] ?? flow;
}

function fmt(date: Date | null | undefined): string {
  if (!date) return "n/a";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Boise" }).format(date);
}

function minutes(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function yesNo(v: boolean): string {
  return v ? "Yes" : "No";
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 10px 6px 0;color:${EMAIL_BRAND.textMuted};font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:13px;color:${EMAIL_BRAND.text};">${value}</td></tr>`;
}

function selectionsTable(session: EstimatorSession): string {
  const entries = Object.entries(session.selections ?? {});
  if (!entries.length) return `<p style="font-size:13px;color:${EMAIL_BRAND.textMuted};">No selections recorded.</p>`;
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${entries
    .map(([k, v]) => row(k.replace(/_/g, " "), escapeHtml(v === null ? "n/a" : String(v))))
    .join("")}</table>`;
}

function contactBlock(session: EstimatorSession): string {
  if (!session.contactPhone && !session.contactEmail && !session.contactName) {
    return `<p style="margin:0;font-size:13px;color:${EMAIL_BRAND.text};"><strong>No contact information was provided.</strong> This is an anonymous partial completion; it tells you where the flow lost someone, not who.</p>`;
  }
  const digits = (session.contactPhone ?? "").replace(/\D/g, "");
  const tel = digits.length === 10 ? `tel:+1${digits}` : `tel:${digits}`;
  const pretty = digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : session.contactPhone ?? "";
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    ${session.contactName ? row("Name", escapeHtml(session.contactName)) : ""}
    ${session.contactPhone ? row("Phone", `<a href="${tel}" style="color:${EMAIL_BRAND.text};">${escapeHtml(pretty)}</a>`) : ""}
    ${session.contactEmail ? row("Email", escapeHtml(session.contactEmail)) : ""}
    ${session.callbackNote ? row("Note", escapeHtml(session.callbackNote)) : ""}
  </table>`;
}

function sessionFacts(session: EstimatorSession): string {
  const errors = session.validationErrors?.length ? escapeHtml(session.validationErrors.join(", ")) : "None";
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    ${row("Website", escapeHtml(`${SITE_CONFIG.name} (${SITE_BASE_URL.replace(/^https?:\/\//, "")})`))}
    ${row("Form", escapeHtml(flowLabel(session.flow)))}
    ${row("Page", `<a href="${SITE_BASE_URL}${escapeHtml(session.pagePath)}" style="color:${EMAIL_BRAND.text};">${escapeHtml(session.pagePath)}</a>`)}
    ${row("Started", escapeHtml(fmt(session.startedAt)))}
    ${row("Last activity", escapeHtml(fmt(session.lastActivityAt)))}
    ${row("Device", escapeHtml(session.device))}
    ${row("Session id", `<code style="font-size:12px;">${escapeHtml(session.id)}</code>`)}
    ${row("Current step", escapeHtml(session.currentStep ?? "n/a"))}
    ${row("Last completed step", escapeHtml(session.lastCompletedStep ?? "none"))}
    ${row("Progress", escapeHtml(`${session.completionPercent}% (step ${session.currentStepIndex + 1} of ${session.totalSteps || "?"})`))}
    ${row("Time in flow", escapeHtml(minutes(session.timeSpentSeconds)))}
    ${row("Validation errors", errors)}
    ${row("Exit method", escapeHtml(session.exitMethod === "unknown" ? "Unknown" : session.exitMethod.replace(/_/g, " ")))}
    ${row("Recovery prompt shown", yesNo(session.promptShown))}
    ${row("Clicked to call", yesNo(session.clickedCall))}
    ${row("Clicked to text", yesNo(session.clickedText))}
    ${row("Requested a callback", yesNo(session.requestedCallback))}
    ${row("Dismissed the prompt", yesNo(session.dismissedPrompt))}
  </table>`;
}

export function buildAbandonmentEmail(session: EstimatorSession): { subject: string; html: string } {
  const anonymous = !session.contactPhone && !session.contactEmail;
  const subject = `[Partial] ${anonymous ? "Anonymous" : "Identified"} ${flowLabel(session.flow)} drop-off at ${session.currentStep ?? "unknown step"} (${session.completionPercent}%)`;
  const content = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">A visitor started the <strong>${escapeHtml(flowLabel(session.flow))}</strong> on ${escapeHtml(SITE_CONFIG.name)} and stopped without submitting. This is a partial completion, not a lead. One summary is sent per session.</p>
    <h2 style="margin:0 0 8px;font-size:15px;">Contact</h2>
    ${contactBlock(session)}
    <h2 style="margin:22px 0 8px;font-size:15px;">Session</h2>
    ${sessionFacts(session)}
    <h2 style="margin:22px 0 8px;font-size:15px;">Selections so far</h2>
    ${selectionsTable(session)}
    <p style="margin:22px 0 0;font-size:12px;color:${EMAIL_BRAND.textMuted};">A click to call or text shows intent only; it does not confirm a conversation happened. Exit method is reported as unknown when the browser gave no signal.</p>`;
  return { subject, html: wrapEmailHtml({ title: "Partial completion", subtitle: escapeHtml(flowLabel(session.flow)), content }) };
}

export function buildCallbackEmail(session: EstimatorSession): { subject: string; html: string } {
  const digits = (session.contactPhone ?? "").replace(/\D/g, "");
  const pretty = digits.length === 10 ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` : session.contactPhone ?? "";
  const subject = `Callback requested: ${session.contactName ? `${session.contactName}, ` : ""}${pretty} (${flowLabel(session.flow)})`;
  const content = `
    <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">A visitor who was leaving the <strong>${escapeHtml(flowLabel(session.flow))}</strong> asked for a call back instead. Call them at the number below; they were told to expect a call within one business day.</p>
    <h2 style="margin:0 0 8px;font-size:15px;">Contact</h2>
    ${contactBlock(session)}
    <h2 style="margin:22px 0 8px;font-size:15px;">Where they were</h2>
    ${sessionFacts(session)}
    <h2 style="margin:22px 0 8px;font-size:15px;">Selections so far</h2>
    ${selectionsTable(session)}`;
  return { subject, html: wrapEmailHtml({ title: "Callback requested", subtitle: escapeHtml(flowLabel(session.flow)), content }) };
}
