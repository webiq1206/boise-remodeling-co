# Reusable unit-rate implementation

Branch: feat/p5-reusable-unit-rates-20260918.
Extends existing site-local estimated rate storage after complete-scope pricing
passes. Both published benchmarks and provisional planning allowances retain
specification, normalized unit, USD cost/range, labor/material responsibility,
location, inclusions/exclusions, assumptions, source date and 30-day expiry.
Approved owner rates remain preferred. Reuse never refreshes source dates or
copies old quantities, quantity ranges, buildings or project conditions.
Old v2 entries remain stored but require fresh separated context before v3 reuse.
No new tables, subscriptions, deployments, model change or infrastructure.
Rates remain private and isolated by website and locality, not shared across sites.

Tests: five added unit-rate regressions cover reuse without market research,
new quantities, expiry, unit aliases, and separation of specifications and
responsibilities. CI runs estimator regressions and the production build.
P5 also tests actual persistence SQL with isolated PGlite.

Deployment remains owner pull/republish after reviewed main merge. The real-file
Sonnet runner and private fixture instructions live in the P5 repository.
No live deployment, price/PDF/email journey or performance target is claimed.
