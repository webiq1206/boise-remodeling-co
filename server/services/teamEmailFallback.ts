import type { P5BridgeResult, P5TeamAlert } from "@/server/services/p5IntakeBridge";

/**
 * One team email per request (owner decision, 17 November 2026).
 *
 * A consultation request used to put two emails in the same shared inbox: this
 * site's own team email, and the "New lead" email p5homeco.com sends when the
 * request is forwarded to its intake. The p5 email is the one that stays. This
 * site's team email is the FALLBACK: it is sent only when p5 did not confirm
 * that its own email went.
 *
 * The rule, in one place for step 1 (app/api/consultation/route.ts) and step 2
 * (server/services/requestDetailsDelivery.ts):
 * - p5 answered alert "sent": the shared family inbox is left to p5. Any other
 *   admin recipient still gets this site's email.
 * - anything else ("failed", "none", "unknown", a bridge that threw or was
 *   never called): every recipient gets this site's email, exactly as before.
 * A lead must never end with zero team emails, so every doubt sends.
 *
 * This runs inside after(): it waits for the bridge, so it must never sit on
 * the visitor's path. The visitor response and the customer's email do not
 * wait for p5.
 */

/** hello@ at each of these is one mailbox: the inbox the p5 team email lands in. */
export const SHARED_FAMILY_INBOX_DOMAINS: readonly string[] = [
  "p5homeco.com",
  "boisecabinet.co",
  "boiseconstruction.co",
  "boiseremodeling.co",
  "boisehandyman.co",
  "boiseadu.co",
];

/** True for the shared family inbox, under any of its aliases and in any letter case. */
export function isSharedFamilyInbox(address: string | null | undefined): boolean {
  const raw = (address ?? "").trim();
  const named = raw.match(/<([^<>]+)>\s*$/);
  const email = (named ? named[1] : raw).trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return false;
  return email.slice(0, at) === "hello" && SHARED_FAMILY_INBOX_DOMAINS.includes(email.slice(at + 1));
}

/** Who still gets this site's team email once p5 has answered. Only "sent" removes anyone. */
export function siteTeamEmailRecipients(
  recipients: ReadonlyArray<string>,
  alert: P5TeamAlert,
): string[] {
  return alert === "sent" ? recipients.filter((to) => !isSharedFamilyInbox(to)) : [...recipients];
}

export type SiteTeamEmailOutcome = {
  /**
   * "sent": this site's email went to everyone it was owed to.
   * "failed": at least one of those sends failed.
   * "skipped": p5 confirmed its email and nobody else was on the list.
   */
  status: "sent" | "failed" | "skipped";
  /** What the decision was based on. */
  alert: P5TeamAlert;
  /** The recipients this site's email was accepted for. */
  sentTo: string[];
  error?: string;
};

type SendResult = { error?: unknown } | null | undefined | void;

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === "string" ? error : JSON.stringify(error);
}

/**
 * Waits for the bridge, then sends this site's team email to whoever is still owed one.
 * Never throws. `open` builds the email and its transport, and is called only when
 * there is someone to send to.
 */
export async function sendSiteTeamEmail(options: {
  /** The bridge call for this submission, or null when nothing was forwarded. */
  bridge: PromiseLike<P5BridgeResult> | null | undefined;
  recipients: () => Promise<ReadonlyArray<string>>;
  open: () => Promise<(to: string) => Promise<SendResult>>;
  /** Log prefix, e.g. "consultation". */
  label: string;
}): Promise<SiteTeamEmailOutcome> {
  let alert: P5TeamAlert = "unknown";
  try {
    const result = options.bridge ? await options.bridge : null;
    if (result?.alert === "sent" || result?.alert === "failed" || result?.alert === "none") {
      alert = result.alert;
    }
  } catch (error) {
    console.error(`[${options.label}] Bridge result unavailable, sending the team email:`, messageOf(error));
  }

  const sentTo: string[] = [];
  let failure: string | undefined;
  try {
    const recipients = siteTeamEmailRecipients(await options.recipients(), alert);
    if (recipients.length === 0) {
      console.info(`[${options.label}] Team email left to p5 (p5 confirmed its email was sent).`);
      return { status: "skipped", alert, sentTo };
    }
    const send = await options.open();
    for (const to of recipients) {
      try {
        const result = await send(to);
        if (result && result.error) throw result.error;
        sentTo.push(to);
      } catch (error) {
        failure = failure || messageOf(error);
        console.error(`[${options.label}] Team email to ${to} failed:`, messageOf(error));
      }
    }
  } catch (error) {
    failure = failure || messageOf(error);
    console.error(`[${options.label}] Team email failed:`, messageOf(error));
  }
  return failure
    ? { status: "failed", alert, sentTo, error: failure }
    : { status: "sent", alert, sentTo };
}
