# Email delivery: boiseremodeling.co

## Sending configuration

Use this domain's separate Resend account and server-only RESEND_API_KEY, or its existing Replit connector. From must use boiseremodeling.co or an owned, provider-verified subdomain. Keep Reply-to on the brand's working hello@ mailbox. A provider error, missing ID, or no-op response is a failure. The transport preserves attachments and idempotency options.

Never use a visitor's address as From. Credentials must not use NEXT_PUBLIC_ variables. Provider acceptance means accepted for processing, not delivered or placed in an inbox.

## DNS and operational checks

Run `node scripts/email-dns-health.mjs`. It checks public DNS without changing records or sending mail. Missing records and failed lookups produce a nonzero exit; a lookup failure is UNKNOWN, not a confirmed missing record.

Workspace SPF is one TXT at @: `v=spf1 include:_spf.google.com ~all`. Google DKIM uses google._domainkey and must also be activated in Google Admin.
Resend uses its existing resend._domainkey and send return-path SPF/MX records. Do not combine the separate return-path SPF with the Workspace apex SPF.

The September 19, 2026 repairs were verified publicly and all five Workspace domains showed DKIM authenticating. DMARC remains p=none with aggregate reporting. Child domains report to their corresponding hello@ aliases, which route to the central P5 mailbox without cross-domain reporting authorization.

Before quarantine: account for every legitimate sender, complete DNS/account repairs, inspect fresh externally received Workspace and actual website emails for all five domains, and review at least seven representative clean reporting days. Missing reports or low volume are not proof of success. Before reject: review approximately another month of clean reporting after quarantine. Retain the working monitoring records for rollback. Never advance policy just because time has elapsed.

## Deployment and received-message tests

Publish the reviewed Git changes, then pull and republish in the existing Replit deployment. Confirm the deployed version and sender environment settings. Send one clearly labeled test from each Workspace identity and submit a test through each real site form to a controlled external mailbox. Record provider ID, From, Return-Path, receiver Authentication-Results (SPF/DKIM/DMARC and alignment), and inbox/spam placement separately. Do not count a Sent-folder copy as receiver evidence.

For commercial outreach, use an owned verified outreach subdomain, an accurate full postal address, a usable plain-text unsubscribe URL, one-click unsubscribe where applicable, and bounce/complaint suppression. A subdomain does not guarantee isolation from the parent domain's reputation. Avoid shortened links and first-contact attachments. Increase volume only among recipients who expect the mail.

The legacy backlink dispatcher is paused for live sending because it bypasses the supported suppression and unsubscribe workflow; drafting remains available.

Google Postmaster registration is a separate remaining account step. A dashboard with no data does not establish successful delivery.

References: [Google sender guidelines](https://support.google.com/a/answer/81126), [Google DKIM](https://support.google.com/a/answer/174124), [Resend domains](https://resend.com/docs/dashboard/domains/introduction).
