# Shared document service integration status

2026-09-17 continuation, branch fix/shared-document-service-hardening-20260917.

Recovered the already merged opt-in adapter from current main. Updated only the shared adapter and its regression tests, plus verification workflow. The adapter queues reconciliation during upload, rejects partial/mismatched page coverage, deduplicates identical uploaded documents, validates configured byte limits, and confirms retries actually started. It remains disabled by default; PDF-only supported inputs use the remote path only with server configuration. Existing pricing, upload formats and brand settings are preserved.

CI verifies committed source using read-only credentials, including real isolated SQL adapter tests, estimator regressions and a production build. Semantic provider responses are fixtures, not live AI performance evidence. The maintained processor and full completion ledger live in webiq1206/p5-home-co under services/document-service and docs/p5-shared-document-service-progress.md.

User instruction: GitHub main only. The owner will pull and republish in Replit. No deployment, worker configuration or remote activation was performed. The separate worker must be provisioned and qualified before setting P5_DOCUMENT_SERVICE_MODE=remote. Publishing the website alone does not activate the new service. Live provider performance, real PDF/email delivery, rollback and browser acceptance remain deployment gates.
