# Local SEO Plan

> **Re-audit 2026-07-10:** NAP consistent (Meridian, ID) across site + schema; correct HomeAndConstructionBusiness type; 9 area + 40 city-service pages live. **Top priority (Critical): real reviews.** `reviewCount = 0`, testimonials are placeholders, no AggregateRating emitted. Sequence: (1) collect real Google reviews + populate `shared/testimonialsData.ts` and `BUSINESS_INFO.reviewCount/rating`; (2) confirm GBP -> website link and set `NEXT_PUBLIC_GBP_URL`/`_REVIEW_URL`; (3) concrete license/bond field; (4) per-city proof (projects, reviews). Schema plumbing already exists and activates on real data.

NAP consistency, GBP alignment, citations, local schema, and local proof.

## NAP consistency — 1 inconsistency

| Source | Value |
|---|---|
| Schema / contact | Meridian, ID 83646 |
| Footer | "Boise, Idaho · Treasure Valley" (no street) |
| Phone | (208) 477-1169 |

**Actions:**
- Align footer with the canonical NAP (or intentionally keep address private but ensure schema + GBP match exactly).
- Phone is the real business number `(208) 477-1169`, driven centrally by `SITE_CONFIG.phone`/`phoneTel` (env-overridable) — **done**.

## Google Business Profile alignment

- No GBP URL in `sameAs`. **Add it** (data-gated) — this is the central local-entity reconciliation signal.
- Ensure GBP categories (e.g. "Remodeler," "Kitchen remodeler," "Bathroom remodeler") match the on-site services.
- Ensure GBP service-area cities match the 8 cities exactly.

## Local schema — STRONG

- `LocalBusiness`/`HomeAndConstructionBusiness` with `areaServed` (8 cities), hours, geo, offer catalog. Good.
- Fix `@id` collision (per-city pages share one ID) — see [schema-map.md](schema-map.md).
- Wire Review schema (done) and activate AggregateRating when real (gated).

## Citations

- Build/clean NAP citations on Houzz, Yelp, BBB, Angi, GuildQuality, Nextdoor.
- Ensure identical NAP across all (the placeholder phone must be replaced first).

## Local proof (biggest local lever)

- Only 4/8 cities have any testimonial/project. Kuna, Star, Middleton, Caldwell have none.
- City×service pages now embed matched proof where it exists (done).
- **Collect city-tagged reviews + before/after projects** for the 4 missing cities (data-gated).

## Local content

- 8 area pages (rich) + 8 location guides (Caldwell added) + localized city×service sections (added).
- Link the Ada/Canyon permit-flow resource prominently from every Canyon-county page.

## Priority order

1. Replace placeholder phone + align NAP (data-gated).
2. Add GBP URL to `sameAs` + verify GBP categories/areas (data-gated).
3. Activate reviews/AggregateRating (data-gated; plumbing done).
4. Collect city-tagged proof for the 4 proof-less cities (data-gated).
5. Build/clean third-party citations.
