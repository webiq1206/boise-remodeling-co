# 01 - Complete URL Audit (166 indexable URLs)

The full scored matrix lives in [01-url-audit.csv](01-url-audit.csv) - one row per sitemap URL, scored 1-10 across all 14 categories with keywords, intent, priority, and recommended actions. This document explains every score below 8, grouped by template, since programmatic pages share template-level causes.

Generated from live content sources via `scripts/audit-url-data.ts` + `scripts/audit-url-matrix.ts` (re-runnable as content changes).

## Score averages across all 166 URLs

- Title Tag: **8.2** | Technical SEO: **8.9** | Internal Linking: **7.9** | Page Speed: **8.0** | Mobile: **8.0** - healthy
- Schema: **7.0** | Conversion: **6.8** - good, gated improvements available
- AEO: **5.9** | Local Relevance: **5.7** - moderate
- Content: **4.6** | GEO: **4.8** | EEAT: **4.2** | GBP Alignment: **3.0** - the four deficits that define this audit

## Sitewide score caps (apply to every row)

These three caps depress every URL regardless of template quality. Fixing them moves all 166 rows at once.

### GBP Alignment = 3 sitewide
The Google Business Profile is created but unverified/suspended. Until it is live there is no profile for any page to align with, no GBP URL in `BUSINESS_INFO.sameAs` (`lib/seo.ts`), and no entity reconciliation between the website and Maps. **Fix: 02-gbp-plan.md.** Once verified and linked, rescore to 7+, with city-service pages aligned to GBP services/areas.

### EEAT = 4 sitewide (3 on /about)
- No named founder or team anywhere: `BUSINESS_INFO.founderName = ''`, so the `founder` Person entity is gated off in `generateOrganizationSchema()` (`lib/schema.ts`). Public permit records already associate the owner with the business, so anonymity gains nothing.
- `licenses: ['Idaho Registered Contractor #8381215']` - the registration number is published.
- `rating: 0, reviewCount: 0` - `aggregateRating` gated off in both LocalBusiness and Review schema.
- 4 testimonials, undated, first names + last initial only.
- Blog/guide articles have no Person author (all attributed to the Organization).
**Fix: 11-eeat-audit.md.**

### Page Speed = 8 / Mobile = 8 (estimate, not field data)
All public pages are SSG with `next/image` AVIF/WebP enabled. No CrUX/field data was available for this audit (site is young). Validate after launch of GBP/citations drives traffic; see 12-technical-plan.md for lab-test instructions.

## Template-level explanations (scores below 8)

### Homepage `/` - Priority: Critical
- **Title 6**: `Boise Remodeling Co | Remodeling & Design` is brand-first and contains no service or geo keyword beyond the brand itself. The single highest-authority page targets nothing. Recommended: `Remodeling Contractor Boise ID | Design-Build Kitchens, Baths & More`.
- **Schema 7**: Organization + LocalBusiness + WebSite + FAQ + Speakable is strong, but no `aggregateRating` (gated), no `founder`, `sameAs` has only 2 social URLs, and LocalBusiness `geo` points at Kuna coordinates while the NAP locality is Meridian (see 09-schema-plan.md).
- **GEO 6**: strong FAQ block (14) but no citable statistics, no named experts.

### Service pages `/services/[slug]` (5) - Priority: High (ADU: Critical)
- **Content 6**: 206-333 words of unique copy per service plus template sections. No cost tables, no comparison content, no embedded proof.
- **AEO 6**: only 3 FAQs per service (`SERVICE_SEO_CONTENT[].faqs`); cost questions unanswered on-page.
- **GEO 6 / Local Relevance 6**: Treasure Valley mentions but no city-specific data on the parent service pages.
- **ADU is Critical**: highest-opportunity service (Boise's 2023 ADU ordinance expanded allowances; competitor coverage thin) but has no pillar guide, a 135-word blog post, and 4 of its 8 city pages noindexed.

### Area pages `/areas/[city]` (8) - Priority: High
- **Content 5**: ~150 words of city-localized copy plus template chrome. Neighborhoods/landmarks are name-dropped from `CITY_SEO_DATA` but never elaborated.
- **Local Relevance 7**: real neighborhoods, landmarks, county, climate present - good skeleton, thin muscle.
- **EEAT 4-5**: Kuna, Star, Middleton, Caldwell have zero city-tagged proof (no testimonial, no project); Boise/Meridian/Eagle/Nampa have 1-2 each.
- **GEO 5**: nothing on these pages an AI engine would cite over a competitor's page.

### City-service pages `/services/[slug]/[city]` (40) - Priority: High/Medium
- **Content 6**: ~540 rendered words but only ~233 are city-localized; the rest is shared service template. Uniqueness ~40%.
- **Local Relevance 7**: neighborhoods, landmarks, climate, county permits all templated in via `getCityServiceSections()` - real signals, but identical sentence structures across 40 pages.
- **GEO 5**: template-generated local content is exactly what generative engines discount; needs per-page proof and cost bands.
- **Technical 6 on 4 ADU pages**: `adu/kuna`, `adu/star`, `adu/middleton`, `adu/caldwell` are noindexed via `NOINDEX_CITY_SERVICE` (`lib/page-metadata.ts`) but still listed in `app/sitemap.ts` - a sitemap/robots contradiction. Fixed in this audit pass (see 12-technical-plan.md).

### Location guides `/guides/[city]-remodeling-guide` (8) - Priority: High
- **Content 3-4**: 121-233 words each. These compete with full city pages from competitors; at this length they cannot rank or be cited.
- **AEO 5**: 6 FAQs each but quick answers too thin to be extracted.

### Neighborhood guides (6) - Priority: High
- **Content 3**: 120-140 words. Paradox: these are the site's most defensible asset class (almost no competitor has North End / Boise Bench / Harris Ranch remodeling pages) and its thinnest. GEO 6 reflects the opportunity, not current state.

### Hub pillar guides (9) - Priority: Medium (8 under 460 words: High)
- **Content 7**: 394-452 words each except `boise-remodeling-cost-guide` (1,693 - the model to replicate). The content rules allow up to 2,000 words; all 8 short pillars should grow toward 800-1,200.
- **EEAT 5**: no named author.

### Blog posts `/blog/[slug]` (69) - Priority: High (57 under 150 words)
- **Content 2-4 for 66 of 69 posts**: median ~134 words. These are stubs, not articles. Only `kitchen-remodel-cost-boise` (539), `bathroom-remodel-cost-boise` (299), `what-impacts-remodeling-costs-boise` (251) exceed 250 words.
- **Local Relevance 4-6**: ~40% of titles carry Boise/Idaho; body copy rarely goes deeper than the title.
- **GEO 4**: at current depth these pages actively dilute the site's authority-per-page average. Strategy in 05-content-plan.md: expand priority clusters, consolidate the rest.

### Category hubs `/blog/category/[hub]` (9) - Priority: Low
- Navigational; adequate. Add 150-word local intros.

### Static pages - mixed
- **`/about` - Critical, EEAT 3**: no founder, no team, no license, no history. This single page gates sitewide EEAT.
- **`/testimonials` - High**: 4 undated testimonials; Review schema correctly wired but starves without data.
- **`/contact`, `/areas`, `/resources/*` - Medium**: solid, minor improvements in CSV.
- **`/privacy-policy`, `/terms-of-service` - Low**: no action.

## Reading the CSV

Open in any spreadsheet app. Columns map exactly to the required audit format: URL, Page Type, Target City, Primary/Secondary/Long-Tail Keywords, Search Intent, then 13 scores (1-10), Priority (Critical/High/Medium/Low), and Recommended Actions per row.
