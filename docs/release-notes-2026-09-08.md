# Release notes, 2026-09-08

## What changed
- Estimator abandonment recovery and partial-completion tracking (see `docs/estimator-recovery.md`): new table `estimator_sessions` (self-creating; also in `migrations/`), routes `/api/estimator-session`, `/api/recovery/callback`, `/api/internal/abandonment-sweep`, the leave prompt on every estimator and the consultation form, staff emails for callbacks and abandoned sessions.
- SEO/AEO: crawler allow-list matches p5homeco.com (search + AI crawlers), sitemap `lastmod` only from real content dates, article freshness from `updatedAt`, llms.txt generated from content data and verified in prebuild, redirect and section-link guards in prebuild, link audit fails the build on broken links, schema service areas match the pages that exist, titles and descriptions fitted to search snippet limits.
- Design: header contact cluster (phone + text + save-to-contacts icons) on one row, hero CTA pairs in one format, lighter photo overlays behind copy, refresh-safe estimator drafts (Handyman), design-system notes in `docs/design-system.md`, keyword-to-page map in `docs/keyword-map.md`.

## Operator steps after deploy
1. No manual schema step is required: the app creates `estimator_sessions` on first use. Running `npm run db:push` is still fine.
2. Schedule `POST /api/internal/abandonment-sweep` every 10 minutes with `Authorization: Bearer $CRON_SECRET` (or `$LEAD_DASHBOARD_KEY`) so abandoned-session summaries go out on quiet days. Without it, summaries still send whenever any visitor's progress beacon arrives.
3. Confirm one partial-completion email and one callback email arrive at the site inbox (`SITE_CONFIG.email`) using a clearly labelled test session, then delete the test rows if desired.
4. IndexNow: Construction and Handyman now have their own key files under `public/`; nothing to configure.
5. Handyman only: set `NEXT_PUBLIC_FACEBOOK_URL` / `NEXT_PUBLIC_INSTAGRAM_URL` once the company's own profiles exist; until then no social links or `sameAs` are published.

## Verification run before commit
`prebuild` verifiers (including the new `verify:estimator-recovery`, `verify:llms`, `verify:redirect-collisions`, `verify:section-links` where present), `verify:contrast`, `scripts/verify-mobile-layout.mjs`, Playwright estimator suites against a dev server, and `next build`.
