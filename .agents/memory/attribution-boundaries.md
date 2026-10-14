---
name: Attribution business boundaries
description: Business identity and privacy constraints for advertising attribution work.
---

Google forwarding numbers are attribution infrastructure, not additional business-owned numbers. Do not identify Caldwell as the P5 business location.

**Why:** The user explicitly stated that P5 has one real business phone number and prohibited adding business numbers or presenting Caldwell as its location.

**How to apply:** Preserve the existing business identity and contact links when working on Ads call attribution. Do not resume campaigns or change budgets or targeting as part of website tracking work.

Do not infer visitor consent from an existing analytics tag being installed.

**Why:** The app had Google analytics and Ads configuration but no consent controller. Assuming a grant would make new first-party marketing persistence operate without an actual consent signal.

**How to apply:** Require a real consent-controller signal for marketing persistence, and explicitly report when consent activation remains unconfigured rather than describing attribution as live.
