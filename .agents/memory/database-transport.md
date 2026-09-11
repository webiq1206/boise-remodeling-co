---
name: Database transport fidelity
description: Why live database transport regression checks are required for lease ownership and typed results.
---

Do not replace the PostgreSQL-compatible transport with HTTP result normalization without verifying real INSERT/UPDATE RETURNING, empty SELECT, JSON and boolean decoding.

**Why:** The workspace SQL-over-HTTP proxy returned a successful UPDATE with rowCount 1 but empty fields and rows, and boolean decoding turned true into false. Null-array normalization could prevent crashes but could not reconstruct missing rows. Lease updates persisted while the app believed ownership was unavailable. Isolated SQL tests did not exercise that transport.

**How to apply:** Run opt-in synthetic development checks through the actual application adapter. Preserve atomic claim/RETURNING and token fencing; never compensate with an unfenced SELECT or disable lease protection. Confirm genuine database errors remain errors. Production transport still requires verification after an authorized publication.

Standalone runtime checks must exercise bundled WebSocket code, not only the development adapter.

**Why:** A passing development database check missed a production-only optional native codec failure (`mask is not a function`). Environment assignments executed while loading Next configuration do not establish the environment of a separately launched standalone Node process.

**How to apply:** Verify required codec flags before Node starts and perform a read through the compiled database module. Run the unmodified standalone server separately: preloading a compiled Next route before framework initialization can itself cause an unrelated AsyncLocalStorage invariant error.