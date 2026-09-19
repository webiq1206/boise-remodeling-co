# Boise shared-reader activation preparation

**Not activated.** No genuine Boise reader URL or Boise-specific credential was established in this work. No production environment was changed. The host is repaired separately; offline adapter tests are not evidence that a live reader or customer journey works.

## Configuration contract

| Name | Required value or purpose |
| --- | --- |
| `P5_DOCUMENT_SERVICE_URL` | Operator-verified HTTPS reader origin, optionally ending in `/api/p5-documents`; no credentials, query, or fragment in the URL. |
| `P5_DOCUMENT_SERVICE_TENANT` | Exactly `boiseremodeling.co`. |
| `P5_DOCUMENT_SERVICE_KEY` | Secret provisioned on the reader **for this tenant only**, at least 32 characters. Store in the secret manager; never copy another brand's key or put it in logs, source, or this document. |
| `P5_DOCUMENT_SERVICE_MAX_BYTES` | Optional positive integer; default and maximum `262144000` (250 MiB). |
| `P5_DOCUMENT_SERVICE_MAX_PAGES` | Optional positive integer; default and maximum `250`. |
| `P5_DOCUMENT_SERVICE_MODE` | Leave unset during preparation. Only a separately authorized activation may set `remote`. |

Limits can be lowered, not raised above this contract. Existing P5 upload limits remain 50 files and 1 GiB total. PDF automatic preparation rejects more than 250 pages per file. The legacy browser splitter permits 250 pages per submission while retaining its 8-page/6-MiB part budgets; buffered upload byte limits were not increased.

## Signed readiness contract

`checkDocumentServiceReadiness` sends only an authenticated `GET` to the configured base plus `/readyz`, with no file body and redirects disabled. It does not require remote mode and does not enqueue document or review work. Authentication uses the existing tenant/time/nonce/body-hash/HMAC headers; the canonical signed path is `/readyz`.

The reader must attest **the authenticated tenant and actual worker capability**, for example:

```json
{
  "ok": true,
  "providerConfigured": true,
  "tenant": "boiseremodeling.co",
  "protocol": "v1",
  "capabilities": { "pdf": true },
  "limits": {
    "maxFileBytes": 262144000,
    "maxPages": 250
  }
}
```

`ready: true` is also accepted in place of `ok: true`; `providerConfigured: true` is mandatory in either form. Other fields shown above are mandatory. Limits must be safe integers at least as large as this site's configured limits. A larger host capability is accepted but never raises this client's own hard cap. A version string alone is not a protocol/capacity attestation.

**Current host blocker:** the documented host response `{ok, version, providerConfigured}` proves neither tenant binding nor byte/page capability. It intentionally fails this adapter's richer readiness check. The host must supply the additional attestations based on its real authenticated tenant and worker configuration; do not fill them with optimistic defaults.

## Safe setup order

1. Repair and qualify the reader host separately, including authentication, tenant isolation, actual upload/worker limits, and the richer `/readyz` response.
2. Have the authorized operator provision a genuine Boise-only secret and verified URL. Keep remote mode unset. No such values are supplied by this implementation.
3. With explicit authorization, run only the signed readiness check. Missing credentials, wrong tenant, malformed responses, reduced capacity, and HTTP/authentication failures must fail closed before document upload or review creation. Do not switch readers or borrow credentials to make the check pass.
4. Separately approve and verify representative document/customer paths, provider accuracy, cost, timing, recovery, and delivery boundaries. A signed readiness response is **not** customer-path proof.
5. Only after those gates and separate production approval may the operator enable remote mode. This task does not perform that step.

Once activated, PDFs stay on the remote reader even in a batch containing photos or supported spreadsheets. Other supported sources use bounded local preparation and join the same scope. Missing quantities and source conflicts remain unresolved rather than invented. Remote receipts reporting more than the configured page limit are rejected even while queued; complete results also require exact page coverage. Capacity/readiness failures preserve saved files and do not silently downgrade the batch.