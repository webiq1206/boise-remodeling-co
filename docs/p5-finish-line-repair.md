# P5 finish-line repair

## Verified boundaries

- Public estimate JSON, page sections, customer PDFs and customer email sections
  use the same allowlisted projection, including historical saved results.
  The saved mapping result's `$2.00/LF ($200.00 direct cost)` disclosure is the
  regression fixture. Customer quantities, selling totals, exclusions, allowances
  and evidence limitations remain; administrative records and PDFs retain costs.
- CRM requests preserve essential scope and distinct internal details while
  replacing duplicated policy/evidence snapshots with an explicit manifest and
  authenticated durable-record reference. Requests above 90,000 UTF-8 bytes fail
  explicitly. No delivery status is fabricated and CRM retries remain manual.
  See `p5-crm-http413-repair.md` for receiver provenance and offline acceptance.
- Verification receives accepted research observations and their actual citations,
  not the unrelated search URL collection and raw narrative found in the saved
  bathroom checkpoint. No original provider response was retained, so its exact
  failure status cannot be reconstructed. Previously completed stages remain
  reusable through content-addressed checkpoints.
- Supplied-material responsibility, selected versus unselected alternates,
  ambiguous package units, malformed research and stale retained takeoffs have
  offline regression coverage. Invalid research is blocked rather than replaced
  with a planning average. Timeout fallback remains explicitly preliminary.

## Offline verification

Run with external networking disabled and application database access disabled.
These commands do not need production credentials:

```sh
node --import tsx --test tests/p5-presentation.test.ts \
  tests/p5-scope-pricing.test.ts tests/p5-scope-inventory.test.ts \
  tests/p5-crm-payload.test.ts tests/email-delivery.test.ts
node --import tsx scripts/test-p5-runtime-acceptance.mjs
node --import tsx scripts/test-p5-pricing-identity.mts
DATABASE_URL='' NEXT_PHASE=phase-production-build npm run build
```

The production build is a compilation check, not publication or live provider
acceptance. The normal startup workflow can resume saved work and has unrelated
startup database writes; do not start it as a substitute for offline verification.

## Remaining runtime acceptance, after review

Use the existing unsent QA draft and its original capability credentials, not a
replacement draft. Follow `p5-runtime-acceptance-cli.md`:

1. Inspect the saved draft without advancing work.
2. Save the explicitly authorized recipient and a `[QA]` contact label.
3. Resolve real outstanding questions with known answers; explicitly confirm
   review. Structured answers need not rerun original extraction. Clarification
   analysis can be paid and has its own approval gate.
4. Approve both paid pricing and real delivery before submitting. The genuine
   submit route can send as soon as pricing succeeds; there is no pretend
   price-only delivery switch.
5. Read actual delivery records using normal administrator authorization.
   Reconcile unknown outcomes; never blindly repeat a mutation or create a
   replacement lead. Prior CRM failures must not be automatically replayed.

The CLI creates no public test endpoint, bypasses no authentication, and makes no
direct database status changes. Offline receiver contract acceptance does not
prove the deployed receiver version, inbox receipt or real CRM persistence.
Publication and those external acceptance operations require separate review.