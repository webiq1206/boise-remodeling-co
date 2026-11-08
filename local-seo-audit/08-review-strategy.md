# 08 - Review & Reputation Strategy

## Current state

- Google reviews: **0** (profile unverified)
- On-site: 4 testimonials (`shared/testimonialsData.ts`) - undated, first-name + initial, covering Boise/Meridian/Eagle/Nampa only
- `BUSINESS_INFO.rating = 0, reviewCount = 0` → `aggregateRating` schema correctly gated OFF sitewide (emitting zero-star data would be worse than none)
- Review keywords: the 4 testimonials do mention service + city ("kitchen", "Boise") - good pattern, keep it

There is nothing to "optimize" yet; this is a build-from-zero system.

## The system

### 1. The ask (every project, no exceptions)
- **When**: at the final walkthrough - the highest-emotion moment, in person, from the project manager. Follow-up link the same evening.
- **How**: "Reviews from {city} homeowners are how neighbors find us. Would you mind sharing what the {project} was like - especially anything about communication or the timeline?" This phrasing seeds city + service + differentiator keywords without scripting the review (never script or incentivize - both violate Google policy).
- **Link**: the GBP short review link (available post-verification). Put it in: the final-walkthrough email template, email signatures, and a `boiseremodeling.co/review` redirect for verbal mention.
- **Sequence**: Day 0 in-person ask → Day 1 email with link → Day 7 single reminder. Stop after one reminder.

### 2. Keyword coverage targets
Healthy review corpus mentions, over time: each of the 5 services, each of the 8 cities, and the differentiators (written updates, written scope, permits, on-time). Track in a simple sheet; when a service/city is missing, prioritize the next ask from that segment. Never tell a customer what words to use.

### 3. Response protocol (owner responds, within 48h)
- Positive: thank by name, reflect the project back with city + service ("your North End kitchen"), 2-3 sentences. This is the one place the BUSINESS can legitimately add local keywords.
- Negative: respond once, factually, offer offline resolution, never argue. A measured response to a bad review is itself a trust signal.

### 4. Distribution
Google first until 15+ reviews, then alternate asks toward Houzz (drives its own ranking) and Facebook recommendations. Nextdoor recommendations accrue organically from the business page.

### 5. On-site integration (implemented)
- **Review redirect:** `GET /review` → `NEXT_PUBLIC_GBP_REVIEW_URL` (fallback: `/contact?review=pending`). Verbal link: `boiseremodeling.co/review`
- **Scripts & templates:** [shared/reviewOutreach.ts](../shared/reviewOutreach.ts) — in-person ask, Day 1/Day 7 email copy, SMS closeout text, response template, email signature line
- **Email senders:** `sendWalkthroughReviewEmail()` and `sendReviewReminderEmail()` in [server/services/emailNotifications.ts](../server/services/emailNotifications.ts)
- Add `date`, `city`, `service` fields to entries in `shared/testimonialsData.ts` as new reviews land; Review schema on /testimonials already supports `datePublished`.
- When genuine Google reviews exist: set `BUSINESS_INFO.rating` / `reviewCount` (`lib/seo.ts`) → `aggregateRating` activates automatically in LocalBusiness + Review schema. Update monthly.
- Add new city-tagged testimonials for Kuna/Star/Middleton/Caldwell to unlock proof blocks on their 24 landing pages (currently proof deserts - see 04-landing-page-audit.md).
- Embed 2-3 newest Google reviews on /testimonials with a "Read all reviews on Google" link (after GBP live).

## Targets
- 60 days post-verification: 10 Google reviews, ≥4 cities represented
- 6 months: 25+ reviews, all 5 services represented, velocity ≥2/month sustained
- 12 months: 50+ (competitive parity for the Boise remodeling pack - see 13-competitor-gap.md)
