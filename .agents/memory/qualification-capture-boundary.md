---
name: Qualification capture boundary
description: Test isolated delivery with the billing fetch guard still installed.
---

Exercise captured delivery with the same enclosing fetch guard as the live
qualification runner, not only with the native global fetch.

**Why:** Live mapping passed but capture failed under the pricing request guard;
the same saved result captured successfully without it. A local-asset simulation
confirmed that the guard rejects non-provider asset loads, although the original
capture exception was not retained. Unguarded fixture tests miss this boundary.
Repeating inference to investigate a downstream failure would waste budget.

**How to apply:** Keep provider spending and local fixture asset loading separate.
Allow only the local file/data asset reads needed by the isolated fixture, never
real HTTP delivery. Restore the enclosing guard on both success and failure.
Recover downstream capture failures from the saved priced result without making
another provider request or replacing the spend ledger.