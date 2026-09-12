# Estimator acceptance changes

## Scope and safety

- Mobile review uses one fixed Get my estimate action, the existing form submission path and busy mutex. It returns to normal flow while an editable control owns focus and reserves safe-area space.
- Confirmation and contact validation remain mandatory.
- The project entry UI retains one scope textbox and one upload control.
- Valid, sufficiently confident supplied facts suppress redundant questions. Conflicting, invalid, visual-only and inferred facts do not.
- Exact project-wide labor/material choices update locally. Scoped or ambiguous questions still use provider interpretation; completed document pages are not resubmitted for ordinary clarification.
- Edited source text invalidates previous scope answers and analysis. Existing attachments remain disclosed. Explicit replacement starts a distinct draft with no previous files or answers.
- Previous drafts and files remain recoverable. Recovery storage fails closed rather than silently evicting snapshots.
- Upload receipts are checked against authored source state before adopting their revision. Server analysis rejects stale revisions and upload-time source changes. Exact lost clarification receipts can be retried without duplicate interpretation.
- Financial policy, approved rates, model configuration, runtime configuration and existing customer records are not intentionally changed.

## Configured-runtime synthetic measurements

Isolated development provider calls; no customer drafts, submissions, delivery or CRM actions. Extraction used eight generated text-PDF pages, not scanned drawings or a representative production plan set.

| Check | Elapsed | Result |
| --- | ---: | --- |
| Extraction before sparse-fact prompt clarification | 37.518 s total | 8/8 pages and quantities, complete coverage; three primary-provider validation failures triggered configured fallback |
| Extraction after prompt clarification | 13.439 s total | 8/8 pages and quantities, complete coverage; primary provider handled all pages |
| Approved-rate pricing scenario | 32.456 s | Passed |
| Missing-rate source-research pricing scenario | 96.711 s | Passed strict source/pricing checks |

Extraction preparation was 0.067 s in each run. Both extraction runs used configured OpenAI `gpt-4.1`; fallback in the first run reported Anthropic `claude-opus-5`. Configuration was not changed. This is one before/after observation, not a statistical speedup claim or latency guarantee.

The saved configuration fingerprint matched before and after:
`d827a321ffa5f776b2dcae3c7adaf0f472f1da5bfd486095235860865a5ebd55`.
Approved rate count remained 185. The `.replit` fingerprint also matched.

## Independent calculation coverage

Synthetic assertions cover explicit unit conversion, separate unit-rate rounding, cent rounding, excluded work, mutually exclusive alternatives, no double counting, and historical reference classifications. Historical selling prices never become current approved direct costs.

The focused suite passed 111 tests. The isolated workflow checks passed with simulated external services. Independent architecture review passed after fixing stale-upload, clarification retry and recovery issues.

Browser verification used system Chromium and mocked estimator/session APIs:
- Initial unchanged upstream suite: 25/30 passed. The five failures were rerun with the original assertions after fixes: 5/5 passed (320/390/430px core flow and 320/390px progress flow).
- The fixed mobile bar explicitly overrides older `bottom: auto !important` styling. Refloating waits briefly for pointer activation to settle after contact-input blur, preventing it from intercepting Back.
- Focused 390x844 and 375x844 checks: 2/2 passed. Assertions include one submit control, contact and confirmation blocking, editable-focus inline placement, viewport placement, replacement draft isolation, recovery restoration, retained trailing spaces and exactly one submission from synchronous double-triggering.
- The progress regression retains original 8-to-16 page progress and clarification retry assertions. Physical iPhone/Android keyboards were not tested; browser focus behavior was.

Raw synthetic evidence is retained locally under `p5-verification/acceptance-*`; it is not bundled into this source change.

## Release boundary

These checks do not guarantee complete extraction of arbitrary scans or accuracy of every market source. No production publication is authorized by this change.