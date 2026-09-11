---
name: Database transport fidelity
description: Why live database transport regression checks are required for lease ownership and typed results.
---

Do not replace the PostgreSQL-compatible transport with HTTP result normalization without verifying real INSERT/UPDATE RETURNING, empty SELECT, JSON and boolean decoding.

**Why:** The workspace SQL-over-HTTP proxy returned a successful UPDATE with rowCount 1 but empty fields and rows, and boolean decoding turned true into false. Null-array normalization could prevent crashes but could not reconstruct missing rows. Lease updates persisted while the app believed ownership was unavailable. Isolated SQL tests did not exercise that transport.

**How to apply:** Run opt-in synthetic development checks through the actual application adapter. Preserve atomic claim/RETURNING and token fencing; never compensate with an unfenced SELECT or disable lease protection. Confirm genuine database errors remain errors. Production transport still requires verification after an authorized publication.