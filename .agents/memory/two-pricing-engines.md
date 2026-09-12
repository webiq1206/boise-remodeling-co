---
name: Pricing-path boundaries
description: Avoid applying a legacy calculator pricing fix to the separate P5 estimator pipeline.
---

First identify the active calculator and endpoint. A legacy calculator's guide price is not necessarily its displayed price, and a fix to that path does not establish that the separate P5 estimator is fixed.

**Why:** Bathroom count was correctly priced in the guide engine (instance multiplier) but the line-item engine ignored it, so the selection silently had no effect on the on-screen range until fixed (July 2026).

**How to apply:** Trace a changed selection through the active endpoint to its displayed line items. Verify the saved scope through the actual pricing pipeline, rather than assuming a passing guide calculation or a similarly named legacy module proves the result.
