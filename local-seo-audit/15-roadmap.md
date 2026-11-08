# 15 - Prioritized Local SEO Roadmap

Code-level items from this audit are already implemented and verified (see 00-executive-summary.md). This roadmap sequences the remaining work. Effort: S (<2h), M (half day), L (multi-day/ongoing).

## Week 1 - Stop the bleeding (owner)

| # | Action | Effort | Ref |
|---|---|---|---|
| 1 | Begin GBP verification/reinstatement (gather registration docs, insurance, prep verification video) | M | 02 |
| 2 | Find + claim the Yelp listing; correct phone to (208) 477-1169, service-area model | S | 07 |
| 3 | Correct or delete ProMatcher profile (Lake Fork address + old phone) | S | 07 |
| 4 | Verify Facebook + Instagram pages exist and carry canonical NAP | S | 07 |
| 5 | Supply Idaho contractor registration number → footer + /about + schema (code is ready for it) | S | 11 |

## Weeks 2-4 - Build the entity

| # | Action | Effort | Ref |
|---|---|---|---|
| 6 | On GBP verification: apply full profile spec (categories, services, description, photos, Q&A seed) | M | 02 |
| 7 | Add GBP URL to `BUSINESS_INFO.sameAs` (one-line code change, slot ready) | S | 09 |
| 8 | Create Bing Places (import from GBP) + Apple Business Connect | S | 02 |
| 9 | Submit MapQuest correction (after Yelp fixed) | S | 07 |
| 10 | Launch review system: walkthrough ask + email template + /review redirect | M | 08 |
| 11 | Houzz profile with captioned project photo sets | M | 07/13 |
| 12 | Nextdoor business page | S | 07 |
| 13 | Supply founder bio facts + headshot for /about#team (structure is live) | S | 11 |

## Months 2-3 - Authority and proof

| # | Action | Effort | Ref |
|---|---|---|---|
| 14 | Angi, BBB, Thumbtack, Porch, BuildZoom (claim auto-generated) listings | M | 07 |
| 15 | First 10 Google reviews milestone; set `BUSINESS_INFO.rating/reviewCount` → activates AggregateRating schema | S | 08 |
| 16 | Retrofit 5 existing gallery projects to case-study format (neighborhood, year, duration, scope) | M | 11 |
| 17 | Collect first city-tagged testimonial/project for Kuna, Star, Middleton, Caldwell | L | 04 |
| 18 | Expand 8 short hub pillars to 800-1,200 words (one per week, kitchen first) | L | 05 |
| 19 | Expand the 5 thin cost posts to 500+ words with tables | M | 05 |
| 20 | Phone-shot ADU/project walkthrough video → service page + GBP | M | 13 |
| 21 | Boise Metro Chamber membership; evaluate NARI Idaho / BCA SW Idaho | S | 11 |

## Months 4-6 - Compounding

| # | Action | Effort | Ref |
|---|---|---|---|
| 22 | Expand the 20 priority blog stubs (05-content-plan.md P3 list) | L | 05 |
| 23 | "Boise permit fees & timelines" data page with cited fee schedules | M | 05/10 |
| 24 | Meridian/Eagle neighborhood guides (only after Boise set proves out) | M | 04/05 |
| 25 | 25+ reviews milestone; re-noindex check: lift ADU noindex for any small city that gained proof + content | S | 08/12 |
| 26 | OG social card design asset | S | 12 |
| 27 | Lighthouse/CWV lab audit once traffic exists; verify production image optimization | S | 12 |

## Recurring cadence

- **Posts**: 1 GBP post (city-tagged, deep-links a guide); review ask on every completed project
- **Monthly**: AI-engine spot checks ("best remodeling contractor Boise/Meridian", "kitchen remodel cost Boise") - log brand mentions and cited URLs; update `rating/reviewCount`; 2-4 new GBP photos
- **Quarterly**: re-run `scripts/audit-url-data.ts` + `audit-url-matrix.ts` to refresh the URL matrix; cost-content refresh (`updatedAt` bumps); citation sweep: search `"Boise Remodeling Co" -site:boiseremodeling.co` and the old phone `(208) 405-8425` (should return nothing)

## KPIs (6-month targets)

- GBP: verified, 25+ reviews, all 5 service categories live
- Zero live citations with the old phone/Lake Fork address
- Local Pack appearances for "remodeling contractor meridian" and "kitchen remodel boise" (tracked manually or via grid tool)
- At least one AI-engine citation of boiseremodeling.co for a cost query
- All 8 hub pillars at 800+ words; 0 content pages under 150 words
