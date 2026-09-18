# Customer estimate delivery, 2026-09-18

This release combines repeated excluded-work sections and exact duplicate assumption text while retaining distinct conditions and amounts. Customer PDFs use compact spacing without truncating scope. Downloads reject empty or non-PDF responses, attach their link to the document and retain the object URL long enough for browser download handling.

The shared browser suite verifies a failed PDF response followed by a downloaded, readable PDF, without resubmitting the estimate. Chromium and WebKit run mobile and desktop checks in release CI. Brand settings, conversion tracking, pricing rules and saved unit-rate logic are preserved. No production database or deployment change is made by this commit.

The shared P5 host contains the Sonnet source-reading and saved-test completion changes. This site's publication and live customer journey still require verification after pulling reviewed main. Passing intercepted-provider CI does not certify live AI accuracy, provider costs or email receipt.
