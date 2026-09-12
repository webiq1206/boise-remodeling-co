---
name: Pricing provider compatibility
description: Live integrated OpenAI limitations observed in scope-pricing smoke checks.
---

Do not equate configured credentials or passing mocked tests with working source-backed pricing.

**Why:** On 2026-09-11 the integrated OpenAI Responses path with GPT-4.1 rejected JSON-object output when only the instructions, not the input message, mentioned JSON. Including JSON in the input succeeded. A required web search returned HTTP 200, completed status, a completed search call, and valid JSON, but no action sources or citation annotations despite requesting sources. The pricing module correctly rejected that response as missing research evidence.

**How to apply:** Verify both JSON-mode input compatibility and actual provider-returned source URLs through the selected integration before declaring researched pricing ready. Do not accept generated URL text as evidence or remove the missing-source safeguard. Keep provider-selection repairs in the reviewed GitHub release workflow.