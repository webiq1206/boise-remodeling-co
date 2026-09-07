---
name: Lead conversion identity
description: Exactly-once lead measurement and delivery recovery conventions for Boise Remodeling Co inquiry flows.
---

One project inquiry carries one opaque inquiry ID from the estimate gate through consultation and safe retries. The database is authoritative on whether the inquiry is new; browsers never decide eligibility from a button click or generic HTTP success.

**Why:** Gate, consultation and estimate-resend steps previously emitted independent lead events, while database failures could still return success. This inflated advertising conversions and could count leads that were never stored.

**How to apply:** Fire new-lead analytics only after durable acceptance, reuse the inquiry ID as Google Ads transaction ID, GA4 event ID and Meta event ID, and acknowledge dispatch back to storage. Rotate identity only at a real new-inquiry boundary. External CRM/email delivery is downstream of storage and must remain recoverable through per-channel status plus an expiring claim lease.