---
name: GitHub authentication boundary
description: Keep connector-managed credentials private when shell Git cannot authenticate.
---

A connected GitHub account can have repository write access while ordinary
HTTPS `git push` still fails because shell Git has no credential helper.

**Why:** This workspace demonstrated that split: the connector had push
permission, but non-interactive Git could not obtain a username. Reconnecting a
healthy integration or extracting its token is not the appropriate fix.

**How to apply:** For authorized synchronization, use the existing connector's
Git-data API if shell authentication is unavailable. Preserve the existing
commit chain, compare uploaded tree and commit hashes with local objects, and
use a non-forced reference update. Stop on any hash mismatch or upstream change.
Never expose credentials, rewrite unrelated history, or infer deployment from
successful repository synchronization.

Preserve the raw commit message, including its final newline, when recreating
an existing commit through the Git-data API. Trimming that newline produced a
different commit hash despite identical tree, parents, author and timestamps.