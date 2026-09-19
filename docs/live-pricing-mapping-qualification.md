# Live mapping qualification - 2026-09-19

## Outcome

One live approved-rate mapping scenario passed, followed by verified offline
delivery capture from that exact saved result. No inference was replayed.

- Scope: installation labor for 100 LF of owner-supplied base moulding, first
  floor, Building Alpha. No research.
- Customer planning range: **$335-$435**.
- Three completed tool-free Responses calls, all HTTP 200, returned
  `gpt-5.6-sol` and `service_tier: default`.
- Total reported usage: 12,289 input tokens and 568 output tokens; 11,330 input
  tokens were identified as cache writes. No cached reads.
- All three ledger entries settled. No unknown charges.
- Conservative budget-accounted usage: **$0.103232 of the $1 app allocation**,
  within the user's $25 aggregate task allocation. This ledger does not coordinate
  other apps' spending.
- Captured two emails, two PDFs, and one CRM payload in isolated fixtures;
  customer email/PDF ranges match the result, CRM customer/internal payloads
  match, and duplicate-send suppression passed.
- Real messages: zero. Real CRM writes: zero. Application business writes: zero.
- Original ledger hash was unchanged by the offline recovery and verification.
- No production model/configuration change, research activation, or publishing.

## Provider and billing evidence

The configured endpoint is the Replit-managed OpenAI loopback proxy,
`http://localhost:1106/modelfarm/openai/responses`. The requested and returned
model identities both equal `gpt-5.6-sol`. No credentials are recorded here.
A non-billable `GET /models` metadata request returned 405.

Sources consulted on 2026-09-19:

- https://docs.replit.com/features/integrations/replit-ai-integrations
  documents provider-public-price billing.
- https://developers.openai.com/api/docs/models/gpt-5.6-sol
  and https://developers.openai.com/api/docs/pricing list standard short-context
  rates of $4 input, $0.40 cached input, $5 cache writes, and $20 output per million.
  Cache-write pricing is 1.25 times uncached input. Regional processing may add 10%.
- The indexed official page https://platform.openai.com/docs/models/gpt-5.6-sol
  still showed the higher $5 input / $30 output figures.

No proxy-specific rate table, upstream region, or independently reconciled
Replit invoice was available. The allowance therefore explicitly uses
`accountingBasis: upper-bound`, not an assertion of exact billed cost.
It conservatively accounts **all** input, including cached/cache-written tokens,
at $5 x 1.25 x 1.10 = $6.875/million and output at $30 x 1.10 = $33/million.
Reservations include the full requested 10,000-token output ceiling.
Every response confirmed the explicitly requested standard/default tier.
Input bounds were below the documented long-context threshold; no tools or
multimodal input were admitted.

At the current public standard rates, the recorded usage calculates to $0.071846
before any regional uplift. That is a calculation, not a verified invoice.
The conservative ledger amount remains unchanged; no reconciliation, refund,
new grant, or budget reset was performed.

## Capture failure and recovery

The initial CLI exited unsuccessfully **after** pricing passed, during delivery
capture. Its generic error handler did not persist the original exception.
The priced result and all settled charges were already safely retained.

Offline replay with no credentials completed capture. Investigation identified
that the billing fetch guard also enclosed local fixture initialization; a
simulation confirmed that local asset loads fail under its JSON-request rule.
The repaired capture boundary permits only file/data assets via an explicitly
supplied native fetch, denies HTTP(S), and restores the enclosing guard even
on cleanup failure.

The actual saved live result then passed capture under an enclosing rejecting
pricing guard with the repaired boundary. The original ledger was byte-for-byte
unchanged. This is live pricing plus verified offline capture recovery, not a
claim that the original CLI exited successfully or that inference was rerun.

Source identity of the live requests:
`f70712a074404711a32a7b5f1ba77dfbc4c28b886878417360bba5d57221cd45`.

Source identity after the QA-only capture repair:
`3938eb04594d07746da35fca4e650d82798e8730f3b1252d1085ccfc4fc3b82f`.

The original immutable allowance remains attached to the first identity.
The later repair changed QA scripts only; application pricing, outbox, PDF,
delivery adapters and configuration were not edited. No new allowance was
created to bypass the source-identity check.

## Evidence

Retained locally under `p5-verification/pricing-qualification/`:

- `boise-mapping-2026-09-19-1usd.allowance.json`
- Ledger/spend basename:
  `0c45743d4aa180074804ccb2d6d07d178df6353c719c185813102f0b80a9d0f7`
- Attempt directory within that basename:
  `1789830300212-0b0c5b15-ed5c-41c2-8718-a253c7d0f0b8/`
- `provider-receipts.json`, `live-pricing-mapping-stages.json`,
  `live-pricing-mapping-report.json`, `qualification-completion.json`
- `mapping/` retains the initial offline capture; `mapping-verified/` contains
  the final verified customer/admin PDFs and captured email/CRM payloads.

These generated artifacts and the live ledger remain local and ignored by Git.
This summary and tested QA repairs are synchronized separately. Existing
document evidence/spend was not modified.

The interrupted runner did not reach its final before/after policy fingerprint
comparison. No byte-for-byte comparison is claimed for that attempt. The app
policy was read using SELECT only; both capture replays used isolated in-memory
fixtures, with no application database connection.

## Normal customers and document-reader capability

Application paths do not import the QA allowance helper or require its live-test
flags. Normal customer pricing is unchanged and does not require an allowance.
The old $1/$3 per-document constants are assistant-created QA safeguards, not
user-set budgets or customer pricing restrictions.

Secure document-reader settings are server-environment/host managed, not
editable through an existing app-admin settings endpoint. Redacted inspection
of development and production found no reader URL, key, tenant, mode, max-bytes,
or max-pages configuration. Remote mode therefore remains off.

The agent can manage non-secret environment settings with the supported tooling,
but the app has no autonomous tenant/key provisioning or rotation capability.
A verified reader endpoint and genuine tenant-scoped credential must first come
from the host/operator through the secure configuration flow. Nothing was
enabled, provisioned, or changed during this capability check.

## Verification

- No-charge qualification harness: 34 checks passed, including controlled proxy
  admission, document restriction, billing safeguards and capture boundaries.
- Application TypeScript check passed; targeted QA TypeScript check passed.
- Final saved-result replay: passed with the billing guard restored, zero HTTP
  delivery, two captured emails/PDFs, one CRM payload and unchanged ledger.
- No production/customer source files changed.