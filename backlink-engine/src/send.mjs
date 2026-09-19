#!/usr/bin/env node
/**
 * Guarded send hook. This is the ONLY place the engine can perform an outward
 * action, and it is locked down by design so nothing goes out unsupervised:
 *
 *   A message is sent ONLY IF ALL are true:
 *     1. process.env.BACKLINK_SEND_ENABLED === "true"   (global kill-switch, off by default)
 *     2. process.env.RESEND_API_KEY is present
 *     3. the queue item has status === "approved"        (a human approved it)
 *     4. the item is an email with a real `to` and no missingInputs
 *
 * Anything not meeting all four is a DRY-RUN (logged, not sent). Self-serve
 * citation packets are never "sent" - a human submits those forms.
 *
 * Usage:  node src/send.mjs            # dry-run report of what WOULD send
 *         BACKLINK_SEND_ENABLED=true node src/send.mjs   # send approved items
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

if (process.env.BACKLINK_SEND_ENABLED === "true") {
  console.error("Legacy backlink dispatch is paused. Use the supported outreach workflow with suppression and unsubscribe handling.");
  process.exit(1);
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = join(ROOT, "outreach/queue.json");
const queue = existsSync(QUEUE) ? JSON.parse(readFileSync(QUEUE, "utf8")) : [];

const SEND = process.env.BACKLINK_SEND_ENABLED === "true";
const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.OUTREACH_FROM || "Boise Remodeling Co <hello@boiseremodeling.co>";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function sendable(it) {
  // Requires a real email in `to` - the opportunity `contact` field is often a
  // hint ("nari.org membership"), so a human must set a valid recipient at
  // approval time. A non-email `to` is never sent.
  return it.type === "email" && it.status === "approved" && EMAIL_RE.test(String(it.to || "")) && (!it.missingInputs || it.missingInputs.length === 0);
}

async function resendEmail(it) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: it.to, subject: it.subject, text: it.body }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

let sent = 0, skipped = 0, dry = 0;
for (const it of queue) {
  if (!sendable(it)) { skipped++; continue; }
  if (!SEND || !KEY) { console.log(`  DRY-RUN would send -> ${it.to} : ${it.subject}`); dry++; continue; }
  try {
    const r = await resendEmail(it);
    it.status = "sent"; it.sentOn = process.env.RUN_DATE || new Date().toISOString().slice(0, 10); it.providerId = r.id;
    console.log(`  SENT -> ${it.to} (${r.id})`);
    sent++;
  } catch (e) {
    it.status = "send_failed"; it.error = e.message;
    console.log(`  FAILED -> ${it.to}: ${e.message}`);
  }
}
writeFileSync(QUEUE, JSON.stringify(queue, null, 2) + "\n");

console.log(`\n${sent} sent · ${dry} dry-run · ${skipped} not sendable (unapproved / packet / incomplete).`);
if (!SEND) console.log("Send is DISABLED (safe default). Set BACKLINK_SEND_ENABLED=true and item.status='approved' to send.");
