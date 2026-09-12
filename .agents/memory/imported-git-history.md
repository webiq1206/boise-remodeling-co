---
name: Imported Git history
description: Safely reconciling upstream history with Replit source synchronizations
---
Compare complete application trees before deciding that local commits contain unique implementation.

**Why:** Prior synchronization imported reviewed upstream files without merging ancestry. Rebasing those local checkpoints can replay older implementations over newer upstream fixes even when the pre-rebase application tree already matches an upstream release.

**How to apply:** Preserve the full Git directory, interrupted-operation state, working files, and ignored work before recovery. Compare the original branch tip against the previously synchronized upstream tree. Prefer a history-preserving merge when differences are only intentional local configuration and memory; verify each conflict against both versions rather than skipping commits blindly.