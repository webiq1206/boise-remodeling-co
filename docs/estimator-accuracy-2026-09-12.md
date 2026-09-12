# P5 estimator accuracy verification

## Exact cabinet case

The retained-document question is:

> Which bench top option should be included in the estimate?

The source choices are butcher block (+5 hours), matching painted MDF/wood (+4), laminate (+2), and quartz (+5). The question itself need not enumerate them.

The acceptance reply is:

> Option 2: matching painted MDF/wood bench top only. Exclude butcher block, laminate and quartz alternatives. Include the two cabinet units and 9 knobs/pulls. Assembly 2 hours + cabinet installation 8 hours + selected top fabrication/install 4 hours = 14 labor hours.

Verified behavior:

- Four choices come from retained evidence. Excluded alternatives are not selections, including mixed negative/positive clauses.
- Active facts, answers, materials, quantities, and takeoffs reflect two cabinets, nine knobs/pulls, and a 2 + 8 + 4 hour ledger.
- Combined assembly/install source rows are split without reusing a single row for both components.
- Original facts, alternatives, page evidence, and resolved blockers remain archived. Unrelated work and unresolved measurements remain active.
- The 14-hour summary is explicitly non-additive, validated against its component rows, and preserved through JSON persistence.
- Inventory, mapping, chunked source processing, and coverage audits receive the active selection rather than archival alternatives or the raw arithmetic reply.
- A final hourly check blocks missing hours or double-billed summary totals.
- General clarification fact changes also update matching active quantities, including a task-list-only cabinet-count correction. Clarifications do not reread PDFs.

## Labor and scope boundaries

- Validation, page combination, and saved-answer reconciliation preserve explicit additive excavation 16 + concrete 24 = 40 hours.
- Repeated summaries/pages are deduplicated. Same-work disagreements, ambiguous work identities, unknown work, and partial/subtotal evidence do not become a confirmed complete labor total.
- A bench-top length is not base-cabinet length. Undocumented tall runs remain unanswered, not zero, including small-job cabinet scope.
- Component-scoped exclusions preserve included painting when appliances are excluded.
- Known components can remain itemized while unknown components block a complete price. Unmeasured drywall/paint repair areas are not invented.
- Explicit replacement archives the original project, starts a separate empty draft, and detaches inherited service/project sources. Old bathroom/80-SF/painting answers cannot reattach after reload.
- Ordinary edits preserve independent answers and visitor clarification choices while invalidating stale extracted facts.

## Verification

- 120 targeted Node tests passed, including document ledger, actual extraction/saved-answer aggregation, clarification, pricing, source history, replacement, concurrency, provider compatibility, and prior acceptance tests.
- Full TypeScript check passed.
- Full production build, including the existing prebuild verification chain, passed.
- Fresh-browser synthetic verification passed: exact four-choice wording, one exact reply submission, explicit replacement, two reloads without old source restoration, and one usable mobile Continue action at 390 x 844.
- The browser used mocked API receipts. Numeric backend canonicalization and final pricing were verified separately by the integration tests. Ordinary-edit quantity preservation was covered by unit tests, not an additional browser mutation.
- Final application preview rendered successfully.

## Preservation and limits

The owner configuration fingerprint remains:

`d827a321ffa5f776b2dcae3c7adaf0f472f1da5bfd486095235860865a5ebd55`

All 185 approved rates, model/provider modules, and recorded runtime configuration checksums were unchanged. No customer leads, CRM records, or email sends were used for acceptance testing. Browser fixtures used a fresh isolated context with synthetic API mocks; pricing fixtures used in-memory policy data and mocked providers.

Existing recovery backups remain intact. Build-generated PDFs were archived before restoring their committed versions. Verification logs, screenshots, policy fingerprints, and an incremental Git recovery bundle are retained outside the worktree in the accuracy recovery directory.

This verifies the supplied wording and targeted negative cases, not arbitrary customer-plan interpretation or physical-device keyboards. No publishing was performed. Changes are synchronized on the review branch, with GitHub main intentionally unchanged pending review.