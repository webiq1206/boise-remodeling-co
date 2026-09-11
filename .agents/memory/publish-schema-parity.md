---
name: Publish schema parity
description: Prevent production-only runtime tables from being dropped by publish schema synchronization.
---

Production tables created by runtime code must also be represented in the declared schema and development database. A passing build does not establish publish database safety.

**Why:** Estimator tables existed only in production; the actual publish diff proposed dropping them, including stored drafts. Creating matching empty development tables cleared the diff without copying customer data or modifying production.

**How to apply:** Inspect the actual publish diff before assessing database safety. Match production types, defaults, constraints and indexes using metadata, and use only additive development changes. Never depend on runtime recreation to preserve dropped records. The publish dialog's overwrite-data selection is separate from the schema diff and is not verified by an empty diff.