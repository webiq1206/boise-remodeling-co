# 07 - NAP Consistency & Citation Plan

## Canonical NAP record (user-confirmed; use verbatim everywhere)

- Name: `Boise Remodeling Co`
- Legal name (registrations only): `Boise Remodeling Co LLC`
- Phone: `(208) 477-1169`
- Address model: **Service Area Business** - registered address supplied privately for verification, never published. Public locality: `Meridian, ID`
- Service area: Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, Caldwell, ID
- Website: `https://boiseremodeling.co`
- Email: `hello@boiseremodeling.co`
- Hours: Mon-Fri 7:00 AM-6:00 PM, Sat 8:00 AM-4:00 PM, Sun closed
- Categories: Remodeler; Kitchen remodeler; Bathroom remodeler; General contractor
- Description (short, for directories): "Design-build remodeling contractor serving Boise and the Treasure Valley. Kitchen remodels, bathroom remodels, whole-home renovations, room additions, and ADUs."
- Founding year: leave blank until documented.
- Bonded: leave blank until documented.

## On-site NAP audit - CONSISTENT (verified in code)

`shared/siteConfig.ts` drives phone/email/locality everywhere (footer, contact, schema, meta descriptions). One phone, one locality, no street leakage. No action needed on-site. Two stale repo docs (`SEO-AUDIT-CONTEXT.md` root, old `audits/`) contain the retired `(208) 352-2011` and a Wapoot St address - internal only, no SEO impact, but flagged for archival to avoid future confusion.

## Off-site NAP audit - 1 critical conflict, near-zero footprint

### CRITICAL: the old phone number has propagated across at least 3 citations

Live search verification (June 10, 2026) found the retired `(208) 405-8425` number is now the number search engines and AI assistants associate with the business - a synthesized answer literally reported "(208) 477-1169 is not associated with Boise Remodeling Co. in available business records. The primary contact number is (208) 405-8425." This is the exact entity-corruption failure this audit exists to prevent.

1. **ProMatcher** (promatcher.com/profile/BoiseRemodelingCo): `2283 N Coopers Hawk Ave, Lake Fork, ID 83635`, phone `208-405-8425`, owner name "the owner". Lake Fork is ~100 miles north of the service area. Publishes a residential address; anchors the entity to the wrong geography.
2. **MapQuest** (mapquest.com/us/idaho/boise-remodeling-co-519905114): "Boise, ID 83701" + `(208) 405-8425` + the correct website URL - so the wrong phone is directly tied to boiseremodeling.co. Photo is served from a Yelp CDN, indicating MapQuest syndicated this from a Yelp listing.
3. **Yelp (inferred)**: an unclaimed/legacy Yelp listing with the old number is the likely upstream source of the MapQuest record.

**Fix (this week, in order):** see [gbp-phase0-citation-checklist.md](./gbp-phase0-citation-checklist.md)

### Everything else: missing
No findable presence on: Google (unverified), Bing Places, Apple Maps, Yelp, Houzz, Angi, BBB, Thumbtack, Porch, BuildZoom, Nextdoor, HomeAdvisor, Idaho AGC, Boise Metro Chamber. Facebook/Instagram pages are referenced in `sameAs` - verify both actually exist and carry the canonical NAP (could not be confirmed from search).

### Name-confusion risk (monitor, not fixable)
- `boiseremodeling.us` - "Boise Remodeling LLC", a different company with near-identical name/domain
- `oldboiseremodeling.com`, `remodelboise.com` (Renaissance), `boydrc.com` (Boyd)
Consistent NAP + verified GBP + schema `alternateName` are the disambiguation tools. Never use "Boise Remodeling" alone in citations - always "Boise Remodeling Co".

## Citation build list (priority order, identical NAP each time)

Tier 1 (week 1-2, free, highest trust):
1. Google Business Profile (recover - see 02-gbp-plan.md)
2. Bing Places
3. Apple Business Connect
4. Facebook page (confirm/align NAP, set category Home Improvement)
5. Nextdoor business page (high-intent local audience for remodelers)

Tier 2 (week 2-4, core industry):
6. Houzz (free profile; photo-driven - upload the same project sets as GBP)
7. Yelp (claim/create; do not pay for ads)
8. Angi (free listing tier)
9. BBB (accreditation optional; free profile listing first)
10. Thumbtack + Porch + BuildZoom (BuildZoom auto-generates from permit data - claim and correct)

Tier 3 (month 2+, local authority):
11. Boise Metro Chamber of Commerce (paid membership - also an authority link)
12. Idaho statewide directories, Meridian Chamber
13. NARI membership if pursued (see 11-eeat-audit.md) - directory listing + credential

After each Tier 1-2 listing goes live, append its URL to `BUSINESS_INFO.sameAs` in `lib/seo.ts` (structure already supports it; this is how Google reconciles the entity graph).

## Duplicate-citation policy
None found today (footprint too small). After the build-out, quarterly check: search `"Boise Remodeling Co" -site:boiseremodeling.co` and the phone number in quotes; kill duplicates and old-phone variants on sight.
