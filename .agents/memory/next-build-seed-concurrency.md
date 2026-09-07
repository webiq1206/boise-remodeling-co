---
name: Next build seed concurrency
description: Why startup content synchronization must tolerate concurrent Next.js build workers.
---

Treat every startup or build-time content seed as cross-process concurrent, even when application code exports a singleton. Make inserts protected by database uniqueness conflict-tolerant, and only report rows the database actually inserted.

**Why:** Next.js static generation can load server modules in multiple isolated workers. An application-level pre-check or singleton does not coordinate those workers, so check-then-insert logic can race and emit duplicate-key errors during an otherwise successful publication build.

**How to apply:** Keep unique constraints authoritative. For add-if-missing startup synchronization, retain pre-checks only as an optimization and use conflict-safe inserts as the correctness boundary; avoid in-process mutexes or repeated pre-checks as a cross-worker fix.