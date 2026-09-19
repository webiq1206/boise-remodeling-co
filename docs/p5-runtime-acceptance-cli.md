# P5 authenticated runtime acceptance CLI

`scripts/p5-runtime-acceptance.mjs` exercises the genuine P5 draft and submit
routes without a browser. It has no test endpoint, bypass, database access, or
direct status write. Draft ID plus its 256-bit draft key are the normal
capability credentials used by the estimator routes.

The default command is read-only:

```sh
P5_ACCEPTANCE_BASE_URL=https://the-p5-host.example \
P5_ACCEPTANCE_CREDENTIAL_FILE="$HOME/.config/p5/acceptance-draft.json" \
node scripts/p5-runtime-acceptance.mjs
```

The private JSON file contains `{"id":"existing UUID","key":"existing
64-hex-character key"}` and must be mode `600`. Alternatively set
`P5_ACCEPTANCE_DRAFT_ID` and `P5_ACCEPTANCE_DRAFT_KEY` in the process
environment. Do not put credentials or a real recipient in a tracked file,
shell history, command argument, screenshot, or issue. The CLI never prints the
draft ID, key, or contact values.

## Safety model

- Only an existing saved draft is accepted. The CLI will not create a draft.
- Mutation requires an existing saved extraction. There is deliberately no
  scope/upload command, so resuming does not rerun extraction or duplicate
  uploaded files.
- Every write uses the server's current revision and normal optimistic
  concurrency checks.
- Mutation requests send the route's required matching `Origin`, reject all
  redirects, and therefore never forward draft credentials to a redirect
  target. Remote hosts must use HTTPS. Development HTTP is allowed only for an
  explicit loopback URL with `P5_ACCEPTANCE_ALLOW_HTTP_LOOPBACK=true`.
- Contact names must begin with `[QA]`. The recipient comes only from
  `P5_ACCEPTANCE_RECIPIENT`; no address is tracked in code or fixtures.
- Transport failure, response-stream failure, unreadable mutation response, or
  HTTP 5xx after a mutation is an unknown outcome. The CLI never retries it.
  Run the read-only inspection, reconcile the saved state, and decide manually.
  Server error text is never printed because it may contain submitted data.
- A definite HTTP 202 is reported as pending, but is not automatically polled.
- Submit is the production submit route. It prices, persists, and starts real
  delivery. The application has no supported route that safely prices while
  withholding delivery, so the CLI requires **both** approvals before making
  that one call.

## Explicitly gated preparation

Preparation saves only the environment-provided QA contact. It preserves the
draft's existing reviewed/unreviewed state, and never confirms scope, supplies
extraction data, or replaces extraction data.

```sh
export P5_ACCEPTANCE_RECIPIENT='set-locally-not-in-git'
export P5_ACCEPTANCE_PREPARE_APPROVAL=I_APPROVE_QA_DRAFT_WRITE
node scripts/p5-runtime-acceptance.mjs prepare
```

Re-running `prepare` with an identical contact is a read-only no-op.

## Answer and explicitly confirm the saved scope

The safest workflow for outstanding questions is the normal authenticated
estimator UI, using the same existing draft credentials. It uses the same
revisioned draft route and does not rerun extraction unless an operator
explicitly starts analysis. Do not alter the database or fabricate an answer.

For an operator-approved structured answer already known from the QA case, the
CLI can perform exactly one normal draft write:

```sh
export P5_ACCEPTANCE_ANSWER_APPROVAL=I_APPROVE_QA_SCOPE_ANSWER
export P5_ACCEPTANCE_ANSWER_FIELD='the exact P5 scope field'
export P5_ACCEPTANCE_ANSWER_VALUE='the verified answer'
node scripts/p5-runtime-acceptance.mjs answer-field
```

For a saved extraction clarification whose exact internal ID is already known
from the authorized product flow, use
`P5_ACCEPTANCE_CLARIFICATION_ID` and
`P5_ACCEPTANCE_CLARIFICATION_ANSWER` with `answer-clarification` and the same
answer approval. The normal clarification PUT can invoke the clarification
analyzer and therefore may be a paid provider operation even though it does not
call the scope endpoint or rerun the original extraction. It additionally
requires the distinct approval below:

```sh
export P5_ACCEPTANCE_PAID_ANALYSIS_APPROVAL=I_APPROVE_PAID_CLARIFICATION_ANALYSIS
node scripts/p5-runtime-acceptance.mjs answer-clarification
```

`answer-field` is the deterministic route and does not invoke clarification
analysis. Both answer commands clear review instead of silently confirming the
changed scope.

Review is a separate, explicit action. The normal route rejects it while any
required question or conflict remains:

```sh
export P5_ACCEPTANCE_REVIEW_APPROVAL=I_CONFIRM_QA_SCOPE_REVIEW
node scripts/p5-runtime-acceptance.mjs confirm-review
```

Read-only `inspect` reports the count of clarification questions saved in the
extraction, but does not print their potentially sensitive text. Other adaptive
questions are authoritatively checked by `confirm-review` on the normal route.
Inspection calls only `GET /api/p5-estimator/draft`; that implementation calls
`readDraft` (and optionally reads events) and does not advance analysis jobs,
pricing jobs, or delivery. Thus inspection can reconcile state but cannot
resume any pending job. This CLI intentionally has no analysis-job resume
command because that would call the scope route and could incur extraction
work.

A known `submitted` draft is never passed back to submit by the CLI. For
read-only delivery reconciliation, an authenticated administrator can put the
normal application session cookie in a separate mode-`600` local file and run:

```sh
export P5_ACCEPTANCE_ADMIN_COOKIE_FILE="$HOME/.config/p5/admin-cookie"
node scripts/p5-runtime-acceptance.mjs delivery-status
```

This makes `GET /api/admin/p5-estimators?id=...`, the existing authenticated
admin read route. It does not call submit or process the outbox. Output includes
only delivery channel, status, and attempt count; cookie, recipient,
destination, provider ID, and server errors remain hidden. The request rejects
redirects so the session credential cannot be forwarded.

## Paid pricing and real delivery

**Current coordination hold:** do not run live CRM acceptance until the shared
receiver's keyed source/estimate identity contract and authenticated QA
campaign-suppression mechanism have been tested and integrated. The CLI's
approval flags and `[QA]` contact prefix are not that receiver mechanism.
An email-only duplicate response with a lead ID cannot prove receipt of this
estimate or brand. Preserve historical failed/ambiguous deliveries unchanged.

Do not run this during ordinary development. After inspecting the exact
revision, confirming the QA label and recipient, and obtaining separate
authorization for cost and delivery:

```sh
export P5_ACCEPTANCE_PRICING_APPROVAL=I_APPROVE_PAID_PRICING
export P5_ACCEPTANCE_DELIVERY_APPROVAL=I_APPROVE_REAL_DELIVERY
node scripts/p5-runtime-acceptance.mjs submit
```

Both values are required. A missing value blocks before submit. Never retry a
submit whose outcome is described as unknown. A confirmed duplicate response
means the normal route found the already submitted revision; do not create a
new record. HTTP 200 is accepted as a definitive receipt only when both
`accepted` and `duplicate` booleans are present; a malformed 200 is ambiguous,
not a false success, and is never retried.

Offline focused tests validate outgoing requests with the application's real
`protectRequest` contract and use synthetic responses; they make no network,
provider, delivery, or database call:

```sh
node --import tsx --test scripts/test-p5-runtime-acceptance.mjs
```