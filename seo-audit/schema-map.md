# Schema Map

Structured-data inventory, defects, and recommended `@graph` model.

## Inventory (generators in `lib/schema.ts`)

| Type | Generator | Emitted on | Status |
|---|---|---|---|
| LocalBusiness + HomeAndConstructionBusiness | `generateLocalBusinessSchema` | home, contact, area pages | OK (see @id issue) |
| Organization | `generateOrganizationSchema` | home, about | OK (no logo) |
| WebSite + SearchAction | `generateWebSiteSchema` | home | SearchAction points to `/blog?q=` (no handler) |
| Service | `generateServiceSchema` | service, city-service | OK (provider lacks streetAddress) |
| OfferCatalog/Offer | nested | home, contact, area | OK |
| FAQPage | `generateFAQSchema` | home, service, area, blog, guide | OK |
| Article | `generateArticleSchema` | blog, guide, permit resource | author=Org, dateModified=datePublished |
| HowTo | `generateHowToSchema` | permit-flow resource | OK |
| BreadcrumbList | `generateBreadcrumbSchema` | most pages | OK |
| WebPage | `generateWebPageSchema` | about, contact, hubs | OK |
| CollectionPage/ItemList | `generateCollectionPageSchema` | blog index, resources, testimonials | OK |
| SpeakableSpecification | `generateSpeakableSchema` | home, service, city-service, area, blog | home selector missing (fixed) |
| Review + AggregateRating | `generateReviewSchema` | **never called** (fixed: now on /testimonials) | gated rating |

## Defects & fixes

| # | Severity | Defect | Fix |
|---|---|---|---|
| 1 | HIGH | `aggregateRating` zeroed (`rating:0, reviewCount:0`) → no star data anywhere | Plumbing wired; **rating data-gated** |
| 2 | HIGH | `generateReviewSchema` never used; testimonials unmarked | Wired on `/testimonials` with `TESTIMONIALS` |
| 3 | MEDIUM | `@id: baseUrl` shared across all per-city LocalBusiness → entity confusion | Stable `@id` strategy (`#organization`, `#localbusiness`) |
| 4 | MEDIUM | Article `author` param ignored (always Organization) | `author` → Person wired; **name data-gated** |
| 5 | MEDIUM | No Organization `logo` | add `logo` ImageObject (**asset-gated**) |
| 6 | MEDIUM | Homepage Speakable selector has no DOM node | added `data-speakable` node |
| 7 | MEDIUM | Contact has Speakable DOM but no schema | added Speakable schema |
| 8 | LOW | `dateModified` == `datePublished` | `updatedAt` support wired |
| 9 | LOW | WebSite SearchAction → `/blog?q=` with no search handler | logged (remove or implement search) |
| 10 | LOW | Service `provider` omits streetAddress/postalCode | optional enrichment |
| 11 | LOW | sameAs only FB/IG | add GBP/Houzz/Yelp (**data-gated**) |

## Recommended `@graph` model

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://boiseremodeling.co/#organization",
      "name": "Boise Remodeling Co",
      "logo": { "@type": "ImageObject", "url": ".../brand/png/seal/any/boise-remodeling-co-seal-on-charcoal-512px.png" },
      "sameAs": ["facebook", "instagram", "GBP", "houzz"],
      "founder": { "@type": "Person", "name": "<data-gated>" }
    },
    {
      "@type": "WebSite",
      "@id": "https://boiseremodeling.co/#website",
      "publisher": { "@id": "https://boiseremodeling.co/#organization" }
    },
    {
      "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
      "@id": "https://boiseremodeling.co/#localbusiness",
      "parentOrganization": { "@id": "https://boiseremodeling.co/#organization" },
      "areaServed": ["Boise", "...8 cities"]
    }
  ]
}
```

Per-city pages reference `#localbusiness` and express the city via `areaServed` rather than minting conflicting coordinates under one `@id`. Article `author` references a Person `@id` resolving to `/about#team`.

## Verdict

The generator library is strong and broad. The defects are about **trust activation** (reviews/ratings/authors) and **entity linking** (`@id`/`@graph`), not missing types. Fixes in this pass address the entity-linking and plumbing; the trust *values* are data-gated.
