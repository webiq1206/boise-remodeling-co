# Entity Map

Complete entity inventory: organization, services, locations, team, projects.

## Organization entity

| Attribute | Value | Source | Status |
|---|---|---|---|
| Name | Boise Remodeling Co | `shared/siteConfig.ts` | OK |
| Legal name | Boise Remodeling Co LLC | siteConfig | OK |
| Alternate names | — | — | **GAP** (add "Boise Remodeling", "BRC") |
| Description | Design-build remodeler, est. 2017 | `lib/schema.ts` | OK |
| Founded | 2017 | `BUSINESS_INFO.founded` | OK |
| Phone | (208) 477-1169 | siteConfig | OK |
| Email | hello@boiseremodeling.co | siteConfig | OK |
| Address (NAP) | Meridian, ID 83646 | siteConfig | Public locality only. No street address. |
| Logo | — | — | **GAP** (no Organization `logo`) |
| sameAs | Facebook, Instagram | `BUSINESS_INFO.sameAs` | **WEAK** (no Google/GBP, Yelp, Houzz, BBB) |
| Service area | 8 cities | `BUSINESS_INFO.serviceArea` | OK |
| USPs | Design-build, written scope, weekly updates, workmanship guarantee | site content | OK |

## Service entities (5)

| Service | Slug | Pillar guide | Cluster posts | City pages | Reviews | Projects |
|---|---|---|---|---|---|---|
| Kitchen Remodel | kitchen-remodel | boise-kitchen-remodeling-guide | 8 | 8 | 1 (Boise) | 1 (Boise) |
| Bathroom Remodel | bathroom-remodel | boise-bathroom-remodeling-guide | 7 | 8 | 1 (Meridian) | 1 (Meridian) |
| Whole-Home Remodel | whole-home-remodel | whole-home-remodeling-guide | 7 | 8 | 1 (Eagle) | 1 (Eagle) |
| Room Addition | room-addition | boise-home-addition-guide | 8 | 8 | 1 (Nampa) | 1 (Nampa) |
| ADU / Guest House | adu | (covered in additions/home guides) | — | 8 | 0 | 0 |

**Gaps:** ADU has no dedicated pillar guide and no proof. Basement-finish appears in `GALLERY_PROJECTS` but has no service page (orphan project type).

## Location entities (8)

| City | County | Area page | Location guide | Neighborhoods (data) | Reviews | Projects |
|---|---|---|---|---|---|---|
| Boise | Ada | yes | yes | 5 | 1 | 2 |
| Meridian | Ada | yes | yes | 4 | 1 | 1 |
| Eagle | Ada | yes | yes | 4 | 1 | 1 |
| Kuna | Ada | yes | yes | 4 | 0 | 0 |
| Star | Ada | yes | yes | 4 | 0 | 0 |
| Nampa | Canyon | yes | yes | 4 | 1 | 1 |
| Middleton | Canyon | yes | yes | 4 | 0 | 0 |
| Caldwell | Canyon | yes | **was MISSING → added** | 4 | 0 | 0 |

All cities have rich `CITY_SEO_DATA` (population, zips, neighborhoods, landmarks, climate, coordinates) in `lib/seo.ts` — but before this pass only the first neighborhood was used on city×service pages. Now full data is surfaced.

## Team / People entities — MAJOR GAP

- **No named people anywhere.** No founder, owner, project managers, designers, or installers in content or schema.
- Blog/guide author is always the string "Boise Remodeling Co".
- About page uses a generic leadership photo with no names/titles/bios.
- **Impact:** This is the dominant E-E-A-T weakness. Competitors name owners (e.g. "Chad and Shelley," "John and Theresa").
- **Action:** Person-entity plumbing wired (Article author → Person → `/about#team`); **actual names/bios are data-gated.**

## Project entities (5 gallery + 4 testimonials)

- City + service tagged, which enables embedding on matching landing pages (now wired).
- **Gaps:** Only 4 of 8 cities represented; descriptions are short and lack neighborhood/permit specifics; no dates; basement-finish project has no destination service page.

## Entity confusion risks

- **`@id` collision:** every per-city `LocalBusiness` uses `@id: baseUrl`, so 8 city pages + homepage + contact assert different coordinates under one entity ID. Fixed via stable `@id` strategy (see [schema-map.md](schema-map.md)).
- **NAP inconsistency:** schema uses the Kuna street address; footer says "Boise, Idaho." Recommend aligning on one canonical NAP.
