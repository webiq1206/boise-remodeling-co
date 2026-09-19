# Pricing qualification: spending and captured delivery

This harness does **not** change application pricing semantics or document processing. Its **$1 per short document and $3 per plans document** limits are assistant-created QA safeguards, not user-imposed budgets or customer-pricing gates. They remain unchanged. Actual authorization comes from the user's scope and allocation, recorded in the allowance. All amounts below are integer micro-USD: `$1 = 1,000,000`.

## Documented allowance required

The live runner requires both its existing explicit opt-in and a local JSON file named by `P5_PRICING_ALLOWANCE_FILE`. The opt-in alone is not authorization. An accountable approver must document the amount, scope, expiration, exact endpoint/model, and authoritative rate evidence. Do not put credentials in this file, evidence, endpoint URLs, or reconciliation text.

**NONSECRET SCHEMA EXAMPLE — NOT AUTHORIZATION.** This example is deliberately expired, has zero allowance, fictitious rates/endpoint/model, and an invalid source identity. Do not turn it into a grant without explicit approval.

```json
{
  "version": 1,
  "id": "EXAMPLE-NOT-AUTHORIZATION",
  "approvedBy": "NOT APPROVED",
  "approvalEvidence": "Example only; no spending authorized",
  "expiresAt": "2000-01-01T00:00:00.000Z",
  "totalMicros": 0,
  "sourceSha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "models": [{
    "endpoint": "https://provider.example.invalid/v1/responses",
    "model": "exact-provider-model-snapshot-NOT-REAL",
    "rateEvidence": "Example only; replace with approved authoritative billing evidence",
    "rates": {
      "input": 1000000,
      "output": 2000000,
      "cached": 500000,
      "cacheWrite": 1250000,
      "search": 10000
    },
    "maxInputTokens": 5000,
    "maxOutputTokens": 1000,
    "maxSearchCalls": 0
  }]
}
```

`input`, `output`, `cached`, and `cacheWrite` are micro-USD **per million tokens**; `search` is micro-USD per search request. These example numbers are not provider prices. Bounds authorize neither unbounded tools nor additional billing dimensions. Requested and returned model identities must exactly match the approved model; aliases resolving to another snapshot freeze settlement.

The source identity covers all source/data files under `lib`, `shared`, and `server`; the runner, capture harness, allowance module, ledger CLI and synthetic tests; package manifest/lockfile and TypeScript configuration; current estimator PDF fonts/logo; and Node version. This intentionally broad identity also invalidates on unrelated shared edits. The approved pricing configuration is read-only and separately fingerprinted in qualification reports. Recompute identity after all concurrent source edits are complete.

Optional `documentIds` restricts a grant to named fixture identities, such as
`["pricing-mapping"]`. `accountingBasis` is `exact` by default; use `upper-bound`
when rates deliberately conservatively account for documented billing
uncertainty. Such ledger amounts are budget ceilings, not provider invoices.
Reservations use actual serialized request UTF-8 bytes plus padding, bounded by
the approved input ceiling, and the full requested output-token limit.

HTTPS endpoints remain supported. The only HTTP exception is the exact Replit
managed loopback Responses endpoint, and only when it matches the currently
configured integration base and an integrated credential is present. Credentials,
query strings, fragments and other HTTP hosts/paths remain prohibited.
The QA runner explicitly requests `service_tier: "default"` and retains
redacted response model/tier/usage receipts. Normal customer requests are unchanged:
application routes do not import this allowance helper or require its environment
flags.

## No-charge commands

These commands never call a provider or load the application database:

```sh
node --import tsx scripts/p5-pricing-qualification-ledger.mts identity
node --import tsx scripts/p5-pricing-qualification-ledger.mts inspect /approved/local-allowance.json
node --import tsx scripts/p5-pricing-qualification-ledger.mts reconcile /approved/local-allowance.json REQUEST_SHA256 0 "Billing evidence identifying this exact request and confirming zero charge"
node --import tsx scripts/test-p5-pricing-qualification.mts
```

`inspect` requires an existing ledger. `reconcile` changes only the local spend ledger: use the **actual** billed micro-USD, including nonzero charges, supported by independently verified billing evidence. It never retries a request, deletes a reservation, or grants additional budget. An active reserved request cannot be reconciled until its local owner process is proven stopped. Review mode permits investigation after allowance expiration/source changes but cannot make provider calls. The original allowance must still match the ledger exactly.

Node 24's built-in SQLite is required (it currently emits an experimental warning). Captured PDF verification also requires `pdftotext`.

## Durable state and restart safety

The runner uses:

```text
p5-verification/pricing-qualification/<sha256-of-allowance-id>.sqlite
p5-verification/pricing-qualification/<sha256-of-allowance-id>-spend.json
p5-verification/pricing-qualification/<sha256-of-allowance-id>/<timestamp>-<uuid>/
```

SQLite WAL/FULL transactions commit a reservation **before every admitted fetch**. The database is authoritative; the JSON spend report is a convenience snapshot. Preserve the database and its SQLite sidecars on persistent local storage. Do not delete, replace, relocate, clone, or independently recreate a ledger to regain allowance; multi-host/distributed coordination is not qualified. A local filesystem with SQLite locking/durability is assumed.

All reservations count before admission. Concurrent attempts, duplicate request hashes, expired grants, insufficient aggregate/document budgets, and changed allowance/source identities fail closed. A transport timeout, HTTP error, missing/invalid usage, unexpected model/billing tier, settlement overrun, or crash after reservation freezes further calls. Restart does not refund or retry ambiguous charges. Reconciliation is append-audited; exceeding a ceiling remains blocked even after actual usage is recorded. Identical settled requests are not replayed automatically.

The live runner dynamically imports the application database only after allowance/source validation and a clear-ledger check. Its two application queries are `SELECT payload FROM p5_estimator_policy WHERE id='current'`, before and after pricing; there are no application database writes. Real qualification has **not** been completed merely because synthetic tests pass.

## Current tool-billing blockade

Current research requests do not enforce an input-token cap on server-tool-added content, and some tool billing counters/rates are not authoritative. **All tool-bearing requests are therefore denied before transport**, even if a grant supplies search prices. Tool-free pricing can be admitted with a valid grant, but missing-rate research cannot currently achieve complete real-provider qualification. Do not remove this blockade or guess tool charges to obtain a passing result.

## Captured delivery, not real sends

The harness copies unchanged outbox/PDF/email code into an isolated runtime, replaces its database with in-memory PGlite, and replaces email/CRM adapters with capture-only adapters. It verifies customer email/PDF range equality against the priced result, CRM customer/internal estimate equality, both PDF attachments, and duplicate-send suppression. Captured messages, CRM records, PDF hashes and PDFs are saved in each attempt's directory. No customer, email-provider, or CRM write is performed. Existing verification artifacts are retained; synthetic test artifacts are temporary and removed.

The current PDF check proves total-range consistency, not an exhaustive line-by-line visual/semantic PDF audit. No SMTP/CRM delivery behavior or production provider billing contract is claimed to be qualified by these captures.