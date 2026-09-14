# Estimator completion report, 2026-09-13 (evening pass)

Scope: the shared P5 estimator on p5homeco.com, boiseremodeling.co,
boiseconstruction.co, boisehandyman.co and boisecabinet.co. boise-remodeling-co
is the source of truth; every change was ported to the other four repos with
the same commit message, pushed to `main`, pulled into the Replit workspace
and republished. All live tests used the QA contact
(Estimator QA Test, info+estimator-test@webiq.co) through Playwright against
the production sites.

## What changed in this pass (all five repos)

| Commit (boise-remodeling-co) | Change |
|---|---|
| 19e73818 | A document section survives a takeoff without a page reference; "waterproofing" no longer maps to Roofing |
| de1bc6d4 | A document review note is disclosed with the range instead of withholding it; only an unread document, section or page blocks. Planning-book "Missing quantity: <field>" notes now link back to the unanswered question. The no-range log names the blocking warnings |
| 55607368 | Delivery runs inside the submitting request (autoscale hosts run nothing after a response); a repeat submit drains the outbox; the result view rechecks delivery until every channel is sent or parked. Research receives every catalog-covered component so a mapped task is not priced again as a lump |
| 8dfc50ef | Every P5 database statement is bounded (30 s) so a stalled connection fails the request honestly |
| de4c013d | A plan-set page whose detail tiles cannot be rendered on the host is read whole; the estimate click names an unread file instead of silently re-reading; an itemized document no longer prompts for the task list |

Ported commits: p5-home-co b95bc3e, Boise-Construction-Co db4935a8,
Boise-Handyman-Co d372ecb4, Boise-Cabinet-Co 613d71ae (each the last of five).

## Deploy status

| Site | Workspace commit | Publish status |
|---|---|---|
| boiseremodeling.co | de4c013d (all five) | success, 23:03 |
| p5homeco.com | b95bc3e (all five) | success, 23:02 |
| boiseconstruction.co | db4935a8 (all five) | success, 23:03 |
| boisehandyman.co | d372ecb4 (all five) | success, 23:03 |
| boisecabinet.co | 12ec9fd6 (first two only) | success, 22:19; the last three commits are pushed but not yet pulled or republished |

The Cabinet republish is blocked only because the Claude-in-Chrome extension
stopped responding at 23:10 (the 8 GB machine had under 600 MB free while
Chrome, Playwright and the workspace tabs ran). The remaining step is the
usual one in the Boise Cabinet Co workspace shell, then Republish:

```bash
git fetch origin && (git pull --ff-only origin main || git rebase origin/main)
```

## Live results (round r8, redeployed builds)

| Site | Test | Read | Pricing | Outcome |
|---|---|---|---|---|
| boisehandyman.co | typed doors/baseboard/drywall scope | 9.1 s | 18.6 s | $3,400 to $4,450, categories and line items; admin and customer emails sent, alert sent, CRM needs review |
| boiseremodeling.co | typed 5x9 bathroom | 10.6 s | 40 s (r8) / 74 s (r8b) | r8: priced, admin and customer emails sent, CRM needs review; r8b: honest hold with the confirmation items listed |
| boiseremodeling.co | Walden Addition PDF | 15 s | 71 s | honest hold (allowance review); links now offered when a planning-book quantity is missing |
| boiseconstruction.co | Timber and Love plan set (10 sheets) | 21.7 s | 114 s | all sheets read after the rendering fallback (16 details, 41 scope items, 2,670 sq ft living, 736 sq ft garage); pricing ended as an honest hold "complete scope pricing could not be verified" |
| p5homeco.com | Kitchen Renovation Estimate PDF | 16.5 s | 3 s | the read fails on the host (only an Anthropic key, and the Anthropic account has no credit); the estimate click now says so in 3 s instead of re-reading silently for 15 minutes |
| boisecabinet.co | Jeff cabinet proposal PDF | 10.9 s (r6) | 51 s (r6) | read works; result on the current build pending |

Earlier today on the same builds: p5homeco.com typed handyman scope priced in
11 s, boiseremodeling.co bathroom priced $33,300 to $46,800 in 136 s before
the research double count was removed.

## Findings that changed the design

- Every document review note, including "one takeoff record was dropped",
  blocked the customer range. Document reads succeeded on three sites and
  still produced no price. Now only an unread document, section or page
  blocks; other notes ride with the range as items to confirm.
- Emails and the CRM record were handed to Next's `after()`; an autoscale
  host gives a request no CPU after it responds, so nothing was ever sent.
  Delivery now finishes inside the request (up to 25 s) and the result page
  keeps checking; both live runs today reported admin and customer emails
  sent with provider ids.
- The research stage was told only about the mapper's *existing* lines, not
  its catalog additions, so a shower conversion mapped to tile and plumbing
  lines was researched again as a $19.7k to $28.3k lump. Research now sees
  every covered component and prices only the remainder.
- boiseconstruction.co logged a terminated database connection during a
  pricing pass and one submission produced no response for 15 minutes;
  statements are now bounded.
- The plan-set detail renderer fails on the Linux host ("The path argument
  must be of type string. Received type number") while it works locally; the
  sheet is now read whole and the host logs the stack for the next pass.
- With an unreadable file, "Get my estimate" re-ran the read on every click
  and showed nothing else. It now names the file and offers the retry.

## Open items for the owner

1. Anthropic credit: the account returns "Your credit balance is too low".
   p5homeco.com has no OpenAI key, so it cannot read documents or price
   until credits are added or `OPENAI_API_KEY` is set in its Replit secrets.
2. boiseconstruction.co uses the Replit AI-integration OpenAI key, whose
   research call reports `pricing-search-unavailable`; pricing falls back to
   the planning average. A direct `OPENAI_API_KEY` would restore research.
3. CRM sync reports `needs-review` on boiseremodeling.co and
   boisehandyman.co (Resend emails are sent). Check `LEAD_DASHBOARD_KEY` and
   the lead-dashboard endpoint; the admin outbox view lists the error.
4. The QA inbox could not be checked from this environment: the connected
   Gmail account is a Timber and Love mailbox, not info@webiq.co.
5. boisecabinet.co: pull and republish (above) to ship the last three commits.
6. The Construction plan-set pricing hold and the Walden hold need their
   server log lines (`[p5-pricing] no range for draft ...: blocks=...;
   issues=...`) read from the Deployments log pane to name the blocking
   issue; the Chrome extension was unresponsive when this pass ended.
7. Location facts read from a plan set concatenate variants ("Boise, Idaho
   83703 Boise, ID 83702 Boise, ID"); cosmetic, worth a dedupe.

## Verification run locally

`node --experimental-strip-types --test` on p5-planning-books,
p5-estimator-flow, p5-scope-pricing, p5-submit-progress,
p5-processing-status, p5-document-ledger, p5-processing-budget,
p5-adaptive, p5-brand-questions, p5-wizard-resume, p5-presentation,
p5-object-storage: all pass. `tsc --noEmit` clean in boise-remodeling-co and
p5-home-co after every commit. tests/p5-endpoint-concurrency and
tests/p5-question-timing fail under Node's native runner on the baseline
too (directory import of lib/db); unchanged by this pass.
