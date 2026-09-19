# Boise Remodeling estimator repair verification

## Scope and source

Repairs build on GitHub main `5bfa67ae7d6fb7516a3121992577c50ce9ba2253`.
The initial workspace contained the same application tree, with only a local
Replit module-order change. That configuration and unrelated work are preserved.
No production deployment, customer database migration, real email/CRM submission
or paid model call is part of this verification.

## Behavior

- The active P5 transport admits 250 MiB per file, 1 GiB per batch and 50 files.
  It hashes bounded slices and transfers 4 MiB chunks with checksum-confirmed
  receipts. Browser byte recovery is bounded; large originals must be reselected
  after reload, and server-acknowledged chunks are retained.
- PDF admission is 250 pages per file in browser splitting, local preparation,
  segmentation/rendering and remote receipt validation. A 251-page PDF is not
  silently sampled. Legacy buffered request sizes were not enlarged.
- CSV/XLSX automatic conversion is bounded. XLSX has compressed, expanded,
  per-member, entry-count, populated-cell and output-text limits; unavailable
  formula results are not invented. Unsupported or over-limit source content is
  explicitly marked for manual review, rather than treated as successfully read.
- In remote mode, PDFs remain on the reader path even when photos or spreadsheets
  accompany them. Local non-PDF evidence joins the same scope, including typed
  details, exclusions, contradictions and manual answers. Reader failure does not
  silently switch PDFs to a different provider.
- Shared-reader activation requires a credential explicitly provisioned for
  `boiseremodeling.co` and signed tenant/capacity readiness. No activation was made.
  See [the activation contract](shared-reader-activation.md).
- Real-provider pricing qualification requires a documented allowance, persistent
  reservations and source/model identity. Unknown charges stop further requests.
  Capture-only email/CRM and PDF-total consistency checks are included.
  See [pricing qualification](pricing-qualification.md).

## No-charge verification

Counts below overlap; they are not an additive total.

| Check | Result |
| --- | --- |
| Broad `tests/p5-*.test.ts` regression pass | 396 passed, 0 failed, 0 skipped |
| Upload/capacity focused tests | 8 passed |
| Upload adversarial harness | 31 passed |
| Final reader readiness/page tests | 13 passed |
| Final reader adversarial harness | 17 passed |
| Reader adapter isolated harness | Passed |
| Pricing qualification safeguards/captured delivery | 18 groups passed |
| Pricing-work, background, workflow, receipt, upload, rendering scripts | All six passed |
| Resumable integration | Passed after updating its old 256-page fixture to the supported 250-page ceiling |
| TypeScript `--noEmit --incremental false` | Passed; final reader edits also typechecked |
| Full `npm run build`, including prebuild gates | Passed |
| Production `next build` after final reader edits | Passed |
| Chromium responsive core | 7/7 viewport scenarios passed (320, 390, 430, 768, 1024, 1440, 1920 px) |
| Chromium clarifications/manual/conflict/unavailable/missing-information | 7/7 scenarios passed |
| Chromium route surfaces | 15/15 passed |
| Corrected Chromium live-progress fixture | 3/3 passed at 320, 390 and 1440 px |

The resumable integration initially failed at its assertion that all 256 pages
were processed. The corrected 250-page fixture preserves retry, checksum,
authorization, final-revision, no-rebilling and concurrency assertions. It passed
with a 25 MB upload and all 250 original pages, using isolated SQL, real PDF
parsing, and simulated storage/provider calls.

The existing build configuration skips Next's internal type/lint checks.
TypeScript was run separately; a build pass is not represented as a lint pass.
Existing Next instrumentation-option and stale Browserslist warnings are not
estimator failures.

The first Chromium pass returned 29 passes and three progress-fixture failures.
The outdated fixture supplied document progress without attaching a document;
the current UI correctly suppressed page counts for its text-only input. It also
expected obsolete heading/accessibility labels. The fixture was corrected to
attach a synthetic PDF and use the actual document labels. A focused
`P5_TEST_SCENARIO=live-progress` mode allows checking only those failed flows,
without rerunning the other 29 cases.
The focused recheck passed all three cases, for final passing evidence across all
32 scenarios. No application code change was needed for these fixture failures.

Browser evidence is written to the ignored
`p5-verification/repair-functional-chromium/` directory; corrected progress
evidence goes to `p5-verification/repair-progress-corrected/`. The APIs and external
analytics are intercepted, and the temporary production-mode test server starts
without database/provider/delivery credentials. WebKit and a physical microphone
were not tested.
After verification, the isolated test server was stopped and the original
workflow configuration restored without starting credentialed background work.

## Qualification boundaries

- No real-provider or production customer-path qualification is claimed.
- No genuine shared-reader URL/key was available in development or production
  configuration. The host must support authenticated tenant and actual capacity
  attestations, not merely return a generic health response.
- No documented paid allowance was supplied. Research tools remain denied where
  authoritative billing and server-added input bounds are unavailable.
- The original document ceilings remain $1 for short fixtures and $3 for plans.
- The 250 MiB admission/hashing boundary is covered synthetically; the integration
  transfer fixture is 25 MB, not a physical-device 250 MiB stress qualification.
- Captured delivery validates customer total ranges against rendered PDFs and
  emails and checks CRM payload equality/idempotency. It does not qualify real
  delivery credentials or exhaustive visual correctness of every PDF line.