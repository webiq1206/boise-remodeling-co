---
name: Local browser verification
description: Nix browser compatibility and preview-origin verification constraints
---
Use the Nix-provided Chromium executable for local Playwright tests instead of assuming downloaded Linux Chromium binaries have their shared libraries.

**Why:** Downloaded Chromium failed to load libglib in this Nix workspace. The system package launched successfully without changing estimator code or security rules.

**How to apply:** A test-only launcher can supply the system executable to the unchanged upstream suite. Intercept ancillary estimator-session requests as well as the estimator API to avoid test session writes. Allow the development route to finish initial compilation before timing navigation.

Use the configured Replit development origin for browser verification.

**Why:** With a request URL at localhost and an Origin of 127.0.0.1, the origin guard correctly returns 403. The configured Replit preview origin passes the same guard, while an unrelated external origin remains rejected.

**How to apply:** Diagnose origin mismatches separately from estimator behavior. Do not expand the origin allowlist or disable protections just to accommodate a test browser.