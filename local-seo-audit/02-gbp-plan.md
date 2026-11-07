# 02 - Google Business Profile Plan

Status: profile **created, not yet verified** (Service Area Business). This doc is the operator hub; all copy-paste content lives in code at [shared/gbpProfile.ts](../shared/gbpProfile.ts).

**Print all GBP fields:** `npx tsx scripts/print-gbp-profile.ts`  
**Sections:** `nap` | `services` | `products` | `qa` | `posts` | `photos` | `all`

## Execution order

| Phase | Doc | Site implementation |
|-------|-----|---------------------|
| 0 — Citation cleanup | [gbp-phase0-citation-checklist.md](./gbp-phase0-citation-checklist.md) | Footer social links; `GBP_CITATION_FIXES` in gbpProfile.ts |
| 1 — Verification | [gbp-verification-kit.md](./gbp-verification-kit.md) | Env slots for GBP URLs in `.env.example` |
| 2–9 — Full profile | This doc § Profile spec | `GBP_*` constants in gbpProfile.ts |
| 10 — Q&A seed | `GBP_QA_SEED` | 12 entries with website deep links |
| 11 — Posts | `GBP_POSTS_STARTER` | 4-week calendar with deep links |
| 12 — Reviews | [08-review-strategy.md](./08-review-strategy.md) | `/review` redirect; [shared/reviewOutreach.ts](../shared/reviewOutreach.ts); email fns in emailNotifications.ts |
| 13–14 — Messaging + parallel listings | `GBP_MESSAGING`, `GBP_PARALLEL_LISTINGS` | Appointment link = `/contact` |
| 15 — Ongoing sync | `GBP_MONTHLY_SYNC`, `GBP_QUARTERLY_SYNC` | `getExternalProfileUrls()` → `BUSINESS_INFO.sameAs` in lib/seo.ts |

---

## Part 1 — Verification (see gbp-verification-kit.md)

SAB model: real address for verification, hidden publicly. Expect video verification. One submission only.

---

## Part 2 — Profile specification (apply on verification)

Run `npx tsx scripts/print-gbp-profile.ts` and paste into business.google.com.

### Categories

- **Primary:** Remodeler
- **Secondary (order):** Kitchen remodeler → Bathroom remodeler → Construction company → General contractor → Home builder

### Business description

748 characters — see `GBP_DESCRIPTION` in [shared/gbpProfile.ts](../shared/gbpProfile.ts).

### Service areas (8 cities)

Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, Caldwell, ID — plus optional 35-mile radius centered on Meridian.

### Services (12 items)

Core + supporting services with starting prices — see `GBP_SERVICES`.

### Products (22 items, 4 categories)

**Remodeling Services** (7) · **Free Planning Resources** (4) · **Consultation & Tools** (3) · **Areas We Serve** (8)

Each product includes a **Product URL** back to the website — see `GBP_PRODUCTS`. This is the primary deep-linking layer (GBP Services have no per-item URL field).

### Attributes

- Online estimates: Yes
- Onsite services: Yes
- Payments: Cash, Check, Credit cards, Financing available
- Service options: Free estimates

### Links

| Link type | URL |
|-----------|-----|
| Website | `https://boiseremodeling.co` |
| Appointment | `https://boiseremodeling.co/contact` |
| Review (short) | `https://boiseremodeling.co/review` → redirects to GBP review URL |
| Facebook | `https://www.facebook.com/boiseremodeling` |
| Instagram | `https://www.instagram.com/boiseremodeling` |

### Photos (minimum 15)

See `GBP_PHOTO_CHECKLIST`. Caption formula: `{Project type} in {City}, Idaho — Boise Remodeling Co`

### Q&A (seed all 12 on day 1)

See `GBP_QA_SEED` — post each question yourself, then answer as owner.

### Posts

See `GBP_POSTS_STARTER` for weeks 1–4. Rotate monthly: city spotlight → `/areas/{city}`, service → `/services/{service}`, cost guide, process guide, contractor guide, review highlight.

---

## Part 3 — Reviews (see 08-review-strategy.md)

After verification:

1. Copy GBP short review link → set `NEXT_PUBLIC_GBP_REVIEW_URL`
2. Verbal link: `boiseremodeling.co/review`
3. Day 0: in-person ask — `buildInPersonAskScript()` in reviewOutreach.ts
4. Day 1: `sendWalkthroughReviewEmail()` 
5. Day 7: `sendReviewReminderEmail()` — one reminder only
6. Target: 10 reviews in 60 days

When genuine reviews exist: update `BUSINESS_INFO.rating` / `reviewCount` in [lib/seo.ts](../lib/seo.ts) → activates AggregateRating schema.

---

## Part 4 — Messaging & parallel listings

**Welcome message:** see `GBP_MESSAGING.welcomeMessage`

| Platform | URL | Category |
|----------|-----|----------|
| Bing Places | bingplaces.com | Remodeler / General Contractor |
| Apple Business Connect | businessconnect.apple.com | Home Improvement |

Import Bing from GBP after verification. Set `NEXT_PUBLIC_BING_PLACES_URL` and `NEXT_PUBLIC_APPLE_BUSINESS_URL` when live.

---

## Part 5 — Schema & env sync

After verification, set in production env:

```bash
NEXT_PUBLIC_GBP_URL=https://maps.app.goo.gl/...
NEXT_PUBLIC_GBP_REVIEW_URL=https://g.page/r/.../review
# Optional as listings go live:
NEXT_PUBLIC_BING_PLACES_URL=
NEXT_PUBLIC_APPLE_BUSINESS_URL=
NEXT_PUBLIC_YELP_URL=
NEXT_PUBLIC_HOUZZ_URL=
```

`BUSINESS_INFO.sameAs` in lib/seo.ts automatically includes Facebook, Instagram, and any env URLs above.

### Monthly sync (`GBP_MONTHLY_SYNC`)

- 1 Google Post with deep link
- 2–4 new photos
- Respond to reviews within 48h
- Check Q&A
- Verify NAP on all profiles
- Update rating/reviewCount if changed

### Quarterly sync (`GBP_QUARTERLY_SYNC`)

- Old phone citation sweep: `"Boise Remodeling Co" (208) 405-8425`
- Duplicate GBP audit
- Update product/post links for new guides

---

## GBP-to-website alignment (permanent)

| Element | GBP | Website source |
|---------|-----|----------------|
| Service areas | 8 cities | `BUSINESS_INFO.serviceArea` |
| Hours | Mon–Sat table | `BUSINESS_INFO.hours` |
| Phone | (208) 477-1169 | `SITE_CONFIG` |
| Core services | 5 + extended | `shared/contentData.ts` + `GBP_SERVICES` |
| Description claims | GBP description | `GBP_DESCRIPTION` / homepage copy |
| Entity graph | GBP URL in sameAs | `NEXT_PUBLIC_GBP_URL` |
