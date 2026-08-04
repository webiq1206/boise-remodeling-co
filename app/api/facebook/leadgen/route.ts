/**
 * Meta (Facebook) Lead Ads webhook.
 *
 * PUBLIC ENDPOINT: /api/facebook/leadgen
 *
 * Two jobs on one route:
 *
 *   GET   Meta's one-time subscription handshake. Meta calls with
 *         hub.mode=subscribe, hub.verify_token and hub.challenge; when the
 *         token matches FB_VERIFY_TOKEN the challenge is echoed back verbatim
 *         and Meta marks the webhook verified.
 *
 *   POST  Lead notifications. The payload only carries a leadgen_id, so each
 *         lead's full field data is fetched from the Graph API with the Page
 *         access token (requires the leads_retrieval permission), mapped into
 *         a consultation request and pushed through the exact same pipeline as
 *         an on-site estimate lead: DB row, CRM forward (the dashboard runs
 *         qualification scoring on arrival) and the instant admin email.
 *
 * Secrets (all read from the environment, never hardcoded):
 *   FB_VERIFY_TOKEN       any string you invent; must match what is typed into
 *                         the Meta developer console when subscribing
 *   FB_APP_SECRET         the Facebook App secret, used to verify the
 *                         X-Hub-Signature-256 header on every POST
 *   FB_PAGE_ACCESS_TOKEN  long-lived Page token with leads_retrieval
 *   FB_PAGE_ID            the Page running the ads; notifications for any
 *                         other page are logged and skipped
 *
 * Meta retries undelivered notifications aggressively, so the POST handler
 * always answers 200 once the signature checks out - a lead that fails
 * downstream is logged loudly rather than provoking an endless retry storm.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { consultationRequests } from "@/shared/schema";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { getUncachableEmailClient } from "@/server/services/emailTransport";
import {
  htmlToPlainText,
  getAdminRecipientEmails,
  formatFromAddress,
} from "@/server/services/emailLayout";
import {
  buildAdminEmailHtml,
  buildAdminSubject,
  formatLeadReplyTo,
} from "@/server/services/consultationEmail";
import { forwardToLeadDashboard } from "@/server/services/leadDashboardForward";

const GRAPH_VERSION = "v21.0";
const LOG = "[fb-leadgen]";

/** Which of the four secrets are present, with a clear warning for each gap. */
function readConfig() {
  const config = {
    verifyToken: process.env.FB_VERIFY_TOKEN || "",
    appSecret: process.env.FB_APP_SECRET || "",
    pageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || "",
    pageId: process.env.FB_PAGE_ID || "",
  };
  if (!config.verifyToken)
    console.warn(`${LOG} FB_VERIFY_TOKEN is not set; the Meta verification handshake cannot succeed until it is.`);
  if (!config.appSecret)
    console.warn(`${LOG} FB_APP_SECRET is not set; lead notifications cannot be signature-verified and will be rejected.`);
  if (!config.pageAccessToken)
    console.warn(`${LOG} FB_PAGE_ACCESS_TOKEN is not set; lead details cannot be fetched from the Graph API.`);
  if (!config.pageId)
    console.warn(`${LOG} FB_PAGE_ID is not set; page-id filtering is disabled and notifications from any page will be processed.`);
  return config;
}

/* ------------------------------------------------- GET: verification handshake */

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const { verifyToken } = readConfig();

  console.info(`${LOG} Verification handshake received (mode=${mode ?? "none"}).`);

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge !== null) {
    console.info(`${LOG} Verification handshake PASSED; echoing challenge back to Meta.`);
    // Meta expects the raw challenge string, not JSON.
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  console.warn(
    `${LOG} Verification handshake REJECTED: ${
      !verifyToken
        ? "FB_VERIFY_TOKEN is not set on this server"
        : mode !== "subscribe"
          ? `unexpected hub.mode "${mode ?? ""}"`
          : "hub.verify_token did not match FB_VERIFY_TOKEN"
    }.`,
  );
  return new NextResponse("Forbidden", { status: 403 });
}

/* -------------------------------------------------- POST: lead notifications */

/** Timing-safe X-Hub-Signature-256 check against the raw request body. */
function signatureIsValid(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const received = header.slice("sha256=".length);
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(received, "utf8"), Buffer.from(expected, "utf8"));
}

interface GraphFieldDatum {
  name: string;
  values?: string[];
}

interface GraphLead {
  id: string;
  created_time?: string;
  form_id?: string;
  field_data?: GraphFieldDatum[];
  error?: { message?: string; type?: string; code?: number };
}

/** Pull one value out of field_data by any of several Meta field names. */
function fieldValue(data: GraphFieldDatum[], ...names: string[]): string {
  for (const name of names) {
    const match = data.find((f) => f.name?.toLowerCase() === name);
    const value = match?.values?.[0];
    if (value) return value.trim();
  }
  return "";
}

/** The standard Meta contact fields; anything else on the form is a custom answer. */
const STANDARD_FIELDS = new Set([
  "first_name",
  "last_name",
  "full_name",
  "email",
  "phone_number",
  "phone",
  "street_address",
  "city",
  "state",
  "zip_code",
  "post_code",
]);

async function processLead(leadgenId: string, formId: string | undefined, config: ReturnType<typeof readConfig>) {
  /* De-duplicate BEFORE the Graph fetch: Meta redelivers notifications it
     thinks failed, and the second delivery must be a cheap no-op. */
  if (db) {
    try {
      const existing = await db
        .select({ id: consultationRequests.id })
        .from(consultationRequests)
        .where(eq(consultationRequests.fbLeadId, leadgenId))
        .limit(1);
      if (existing.length > 0) {
        console.info(`${LOG} Lead ${leadgenId} already stored (row ${existing[0].id}); skipping duplicate delivery.`);
        return;
      }
    } catch (lookupErr) {
      // A failed lookup must not drop the lead: proceed, and let the unique
      // index on fb_lead_id reject an actual duplicate at insert time.
      console.error(`${LOG} Dedupe lookup for lead ${leadgenId} failed; proceeding to insert:`, lookupErr);
    }
  }

  if (!config.pageAccessToken) {
    console.error(`${LOG} Cannot fetch lead ${leadgenId}: FB_PAGE_ACCESS_TOKEN is not set.`);
    return;
  }

  console.info(`${LOG} Fetching lead ${leadgenId} from the Graph API...`);
  // Token travels in the Authorization header, never the URL: query-string
  // credentials end up in proxy and observability logs.
  const url =
    `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(leadgenId)}` +
    `?fields=id,created_time,form_id,field_data`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.pageAccessToken}` },
  });
  const lead = (await response.json()) as GraphLead;

  if (!response.ok || lead.error) {
    console.error(
      `${LOG} Graph API fetch for lead ${leadgenId} FAILED (${response.status}): ${
        lead.error?.message ?? "unknown error"
      }. Check that FB_PAGE_ACCESS_TOKEN is valid and has the leads_retrieval permission.`,
    );
    return;
  }

  const data = lead.field_data ?? [];
  const firstName = fieldValue(data, "first_name");
  const lastName = fieldValue(data, "last_name");
  const fullName =
    fieldValue(data, "full_name") || [firstName, lastName].filter(Boolean).join(" ") || "Facebook Lead";
  const email = fieldValue(data, "email");
  const phone = fieldValue(data, "phone_number", "phone");
  const city = fieldValue(data, "city");
  const state = fieldValue(data, "state");
  const zip = fieldValue(data, "zip_code", "post_code");
  const address = fieldValue(data, "street_address");

  /* Every non-standard question on the Instant Form, kept verbatim so a custom
     "what project are you planning?" answer is never lost. */
  const customAnswers = data
    .filter((f) => f.name && !STANDARD_FIELDS.has(f.name.toLowerCase()) && f.values?.[0])
    .map((f) => `${f.name.replace(/_/g, " ")}: ${f.values![0]}`);

  const formLabel = lead.form_id || formId || "unknown form";
  const noteLines = [
    "Submitted via Facebook Lead Ad (Instant Form)",
    `Meta lead id: ${lead.id}`,
    `Form: ${formLabel}`,
    ...(lead.created_time ? [`Submitted: ${lead.created_time}`] : []),
    ...customAnswers,
  ];
  const message = noteLines.join(" | ");

  if (!email && !phone) {
    console.warn(`${LOG} Lead ${leadgenId} carries neither email nor phone; storing anyway for manual review.`);
  }

  /* 1 - Database row, same table as every on-site lead. The insert doubles as
     an atomic idempotency claim: ON CONFLICT DO NOTHING against the unique
     fb_lead_id index means exactly one delivery wins the row, and only the
     winner sends the CRM forward and the team email. A redelivered or
     concurrent duplicate claims nothing and stops here. */
  if (db) {
    try {
      const claimed = await db
        .insert(consultationRequests)
        .values({
          name: fullName,
          phone: phone || "",
          email: email || "",
          zip: zip || "",
          address: address || "",
          city: city || null,
          projectType: "facebook-lead-ad",
          message,
          fbLeadId: lead.id,
        })
        .onConflictDoNothing({
          target: consultationRequests.fbLeadId,
          where: sql`fb_lead_id IS NOT NULL`,
        })
        .returning({ id: consultationRequests.id });
      if (claimed.length === 0) {
        console.info(`${LOG} Lead ${leadgenId} was already claimed by another delivery; skipping notifications.`);
        return;
      }
      console.info(`${LOG} Lead ${leadgenId} stored (${fullName}${email ? `, ${email}` : ""}).`);
    } catch (dbErr) {
      // Without a stored row there is no idempotency claim; notifying anyway
      // risks a duplicate email on redelivery, which beats losing the lead.
      console.error(`${LOG} DB insert for lead ${leadgenId} failed; forwarding without a stored row:`, dbErr);
    }
  } else {
    console.warn(`${LOG} Database unavailable; lead ${leadgenId} NOT stored locally (CRM forward still attempted).`);
  }

  /* 2 - CRM forward: the same path the estimate form uses, where the dashboard
     runs its qualification scoring and pipeline placement. */
  forwardToLeadDashboard({
    fullName,
    email: email || "",
    phone: phone || undefined,
    propertyAddress: address || undefined,
    city: city || undefined,
    state: state || undefined,
    zip: zip || undefined,
    projectTypes: [],
    finalNotes: customAnswers.length > 0 ? customAnswers.join("\n") : undefined,
    projectScope: `Facebook Lead Ad (form ${formLabel})`,
    source: "Facebook Lead Ad",
  });

  /* 3 - Instant team notification, through the same admin email path. No
     customer email: that template presents an estimate this lead never saw. */
  try {
    const { client, fromEmail } = await getUncachableEmailClient();
    const from = formatFromAddress(fromEmail);
    const adminLead = {
      name: fullName,
      phone: phone || "(not provided)",
      email: email || "(not provided)",
      address: address || "",
      zip: zip || undefined,
      projectType: `Facebook Lead Ad${customAnswers.length ? ` - ${customAnswers.join("; ")}` : ""}`,
      budget: undefined,
    };
    const adminHtml = buildAdminEmailHtml(adminLead, null, null);
    const adminEmails = await getAdminRecipientEmails(SITE_CONFIG.email);
    for (const adminEmail of adminEmails) {
      const result = await client.emails.send({
        from,
        ...(email ? { replyTo: formatLeadReplyTo(fullName, email) } : {}),
        to: adminEmail,
        subject: buildAdminSubject(adminLead, null),
        html: adminHtml,
        text: htmlToPlainText(adminHtml),
      });
      if (result?.error) {
        console.error(`${LOG} Admin email to ${adminEmail} for lead ${leadgenId} failed:`, JSON.stringify(result.error));
      }
    }
    console.info(`${LOG} Lead ${leadgenId} team notification sent.`);
  } catch (emailErr) {
    console.error(`${LOG} Team notification for lead ${leadgenId} failed:`, emailErr);
  }
}

interface WebhookChange {
  field?: string;
  value?: { leadgen_id?: string; page_id?: string; form_id?: string };
}

interface WebhookBody {
  object?: string;
  entry?: Array<{ id?: string; changes?: WebhookChange[] }>;
}

export async function POST(request: NextRequest) {
  const config = readConfig();
  const rawBody = await request.text();

  /* Signature check first, against the raw bytes. A request that fails it is
     not from Meta and gets a 403; everything after this point answers 200. */
  if (!config.appSecret) {
    console.error(`${LOG} Signature check FAILED: FB_APP_SECRET is not set, so no request can be verified.`);
    return new NextResponse("Forbidden", { status: 403 });
  }
  const signatureHeader = request.headers.get("x-hub-signature-256");
  if (!signatureIsValid(rawBody, signatureHeader, config.appSecret)) {
    console.warn(
      `${LOG} Signature check FAILED (header ${signatureHeader ? "present but invalid" : "missing"}); request rejected.`,
    );
    return new NextResponse("Forbidden", { status: 403 });
  }
  console.info(`${LOG} Signature check passed.`);

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    console.warn(`${LOG} Signed request carried unparseable JSON; acknowledging without processing.`);
    return NextResponse.json({ received: true });
  }

  /* Collect every leadgen event across entries; a single delivery can batch
     several. Anything that is not a leadgen change is acknowledged and ignored. */
  const events: Array<{ leadgenId: string; formId?: string; pageId?: string }> = [];
  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      if (!leadgenId) continue;
      events.push({ leadgenId, formId: change.value?.form_id, pageId: change.value?.page_id ?? entry.id });
    }
  }
  console.info(`${LOG} Notification received: ${events.length} leadgen event(s).`);

  for (const event of events) {
    if (config.pageId && event.pageId && event.pageId !== config.pageId) {
      console.warn(
        `${LOG} Lead ${event.leadgenId} belongs to page ${event.pageId}, not the configured FB_PAGE_ID; skipped.`,
      );
      continue;
    }
    try {
      await processLead(event.leadgenId, event.formId, config);
    } catch (err) {
      // Never let one bad lead 500 the batch: Meta would redeliver everything.
      console.error(`${LOG} Processing lead ${event.leadgenId} failed:`, err);
    }
  }

  return NextResponse.json({ received: true });
}
