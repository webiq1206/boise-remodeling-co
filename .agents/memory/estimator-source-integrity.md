---
name: Estimator source integrity
description: Why upload receipts, replacement scopes, and browser recoveries require separate safeguards
---

Treat an upload receipt as evidence of file persistence, not authorization to overwrite the current project with the uploader's older scope.

**Why:** An upload can return a newer draft revision after another tab changed the project. Merely adopting that revision defeats optimistic concurrency even when every later save checks it.

**How to apply:** Compare the full authored source snapshot before adopting upload receipt revisions. Keep an original snapshot through server upload work and reject concurrent source changes before writing analysis. Do not weaken this check to revision adoption alone.

Replacement scopes must not inherit previous manual answers merely because those answers were not extracted by AI. Recovery snapshots must remain accessible and must not silently evict older snapshots.

**Why:** A manually supplied quantity can be just as unrelated to a replacement project as an extracted one. The user explicitly prioritized preserving recoverable work over silently combining scopes.

**How to apply:** Use a distinct draft for explicit project/file replacement; retain previous server files and browser recoveries. For text edits, invalidate old scope decisions while retaining clearly disclosed attachments.