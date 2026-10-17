# Trust & Authority Signal Map

Existing / weak / missing trust signals and recommendations.

## Existing signals

| Signal | Where | Strength |
|---|---|---|
| Licensed & insured (claim) | meta, about, schema description | medium |
| Bonded | leave blank until documented | |
| Workmanship guarantee | about, FAQs, benefits | medium |
| Permits handled in-house (Ada/Canyon) | FAQs, copy | medium |
| Founding year | leave blank until documented | |
| Service hours | `openingHoursSpecification` | OK |
| Offer catalog | `hasOfferCatalog` | OK |
| Contact point | `Organization.contactPoint` | OK |
| Testimonials (4) | `TESTIMONIALS`, homepage, /testimonials | weak (pseudonymous, undated, unmarked → now marked up) |
| Gallery projects (5) | `/testimonials`, schema | medium |

## Weak signals

| Signal | Weakness |
|---|---|
| Reviews | Pseudonymous ("Sarah M."), no dates, no third-party source, only 4 |
| License | "Details available upon request" — no published number |
| Certifications | Generic strings ("Design-Build Remodeling"), not verifiable body memberships (NARI/NKBA) |
| sameAs | Only Facebook + Instagram |
| Project proof | Short descriptions, no dates, 4/8 cities |

## Missing signals

| Signal | Impact | Status |
|---|---|---|
| AggregateRating / review count | No star rating in SERP/rich results | gated (zeroed); plumbing wired |
| Google Business Profile link | Local entity reconciliation | **data-gated** |
| Published Idaho contractor license # | Verifiable trust | **data-gated** |
| Named team / founder + credentials | E-E-A-T | **data-gated** (plumbing wired) |
| Industry associations (NARI Idaho, NKBA) | Authority | **data-gated** |
| Awards / press | Authority (competitors tout NARI "Remodeler of the Year", Best of Houzz) | **data-gated** |
| Years/projects-completed stat | Experience proof (`yearlyServicesCompleted: 0`) | **data-gated** |
| Third-party review badges (Houzz/Google) | Trust | **data-gated** |
| Real phone (`(208) 477-1169`) | Basic trust/NAP | OK |

## Competitor trust benchmark (see competitor-gap-analysis.md)

Treasure Valley leaders publish strong trust signals BRC currently lacks:
- **Strite Design + Remodel:** NARI Remodeler of the Year, Remodeling Top 500, 114+ reviews, named since 1975.
- **Renaissance Remodeling:** NARI-certified, named owners (Chad & Shelley), since 1997, 5.0 Houzz.
- **Apex Home Solutions:** "Idaho's Best Remodeler 2020 & 2021," named owners (John & Theresa), showroom.
- **Boyd:** 3-year warranty, Best of Houzz, since 2004.

## Recommendations (priority)

1. **Publish real reviews + aggregate rating** (data-gated) → unlocks star rich results. Plumbing is ready.
2. **Add GBP URL + Houzz/Yelp to `sameAs`** (data-gated).
3. **Name 1–2 credentialed people** (founder + lead designer/PM) with bios → biggest E-E-A-T lift.
4. **Publish contractor license number** in footer + schema.
5. **Pursue/claim NARI Idaho membership** and surface it (associations are a clear competitor advantage).
