# Estimator abandonment recovery and partial-completion tracking

Shipped 2026-09-08 on all four brand sites (same files) and, in a lighter form, on p5homeco.com's quote form.

## What the visitor sees
When a visitor who has made real progress in an estimator or lead form is about to leave, one prompt offers help: Call, Text, a callback request (phone number, optional name), or "No thanks". Triggers, in priority order:

1. Clicking an in-site link outside the wizard (the navigation is paused, and resumes on "No thanks, continue").
2. Desktop exit intent (pointer leaves through the top edge, fine pointers only).
3. 90 seconds of inactivity while the page is visible.

Never on tab close or browser shutdown (browsers do not allow a custom prompt there). Shown at most once per browser session; dismissal is remembered. Escape and the backdrop dismiss it. Focus is managed by the dialog primitive.

## Engagement threshold
A session counts as engaged once the visitor has completed a step (step index >= 1 or a completed step is recorded) or has spent 20 seconds inside the flow. Below that, the row expires silently after 7 days.

## Partial-completion emails are off
`server/services/estimatorSessions.ts` keeps one row per session in `estimator_sessions` (created on first use if `npm run db:push` was not run; also in `migrations/0002_estimator_sessions.sql`). Staff are not emailed when a visitor abandons or only partly completes a form. The kill switch is `SEND_PARTIAL_COMPLETION_EMAILS` (false). The sweep still expires unengaged rows after 7 days and deletes rows after 90 days. It does not select, claim, or send a `[Partial] ... drop-off` message. `sendToAdmins` also refuses a subject that starts with `[Partial]` while the switch is off.

The sweep still runs two ways: opportunistically from the progress endpoint (at most every 5 minutes per instance) and from `POST /api/internal/abandonment-sweep` with `Authorization: Bearer $CRON_SECRET` (or `$LEAD_DASHBOARD_KEY`). That endpoint is retention only. Its JSON includes `partialCompletionEmails: false`.

A completed submission (`markEstimatorCompleted`) sets the session to `completed`. A completion of a row that was already `notified` by an older build sets `recovered`. Neither path sends a partial-completion email. Submitted forms still notify staff through the lead routes (consultation, RE-10, plans, assistant, and the other completed-form mailers).

Callback requests (`POST /api/recovery/callback`) are stored on the session and emailed immediately, once. That mail is a real request for a call, not a partial-completion summary, and it does not read the kill switch.

## Data policy
- Session id: random, per tab (`sessionStorage`), never linked to cookies or accounts.
- Stored: site, flow, page path (no query string), device category, timestamps, step positions, completion percent, time in flow, allow-listed selections (keys matching `^[a-z][a-z0-9_]*$`, never anything containing name/email/phone/address), validation error codes, exit method (or `unknown`), prompt interactions.
- Contact details only from an explicit callback request. Typed-but-unsubmitted contact fields are never captured.
- Retention: rows are deleted after 90 days.
- Callback emails say when no contact information exists and that a call or text click shows intent, not a conversation. Partial-completion emails are not sent.

## Integration
`<EstimatorRecovery flow=... currentStep=... currentStepIndex=... totalSteps=... selections=... submitted=... />` inside any wizard. On success call `markEstimatorCompleted(flow)`. Analytics event: `estimator_recovery_prompt` with `action` in shown / call / text / callback_requested / stay / continue_leaving.
