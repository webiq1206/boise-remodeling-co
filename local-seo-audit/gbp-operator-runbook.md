# GBP Operator Runbook — Dashboard Checklist

Use after verification completes. Copy-paste content from `npm run gbp:print` or [shared/gbpProfile.ts](../shared/gbpProfile.ts).

## Phases 2–9 — Full profile (one sitting, ~2 hours)

### Core fields
- [ ] Opening date: leave blank until documented
- [ ] Phone: (208) 477-1169
- [ ] Website: https://boiseremodeling.co
- [ ] Appointment link: https://boiseremodeling.co/contact
- [ ] Hours: Mon–Fri 9–6, Sat 9–4 MT, Sun closed
- [ ] Social: Facebook + Instagram (URLs in GBP_SOCIAL)

### Categories (in order)
- [ ] Primary: Remodeler
- [ ] Secondary: Kitchen remodeler, Bathroom remodeler, Construction company, General contractor, Home builder

### Service areas
- [ ] Add all 8 cities (see GBP_SERVICE_AREAS)
- [ ] Optional: 35-mile radius from Meridian
- [ ] Confirm address hidden from public (SAB)

### Description
- [ ] Paste GBP_DESCRIPTION (748 chars)

### Services (12)
- [ ] Add all entries from GBP_SERVICES with starting prices where listed

### Products (22, 4 categories)
- [ ] Create categories: Remodeling Services, Free Planning Resources, Consultation & Tools, Areas We Serve
- [ ] Add all GBP_PRODUCTS with Product URLs and photos

### Attributes
- [ ] Online estimates: Yes
- [ ] Onsite services: Yes
- [ ] Payments: Cash, Check, Credit cards, Financing
- [ ] Free estimates: Yes

### Photos (15 minimum)
- [ ] Logo, cover, 10+ projects, team, WIP, vehicle (see GBP_PHOTO_CHECKLIST)

---

## Phase 10 — Q&A (day 1)

- [ ] Post and answer all 12 entries from GBP_QA_SEED (`npm run gbp:print qa`)

---

## Phase 11 — Google Posts (weekly)

- [ ] Week 1: Kitchen clarity in Boise → /services/kitchen-remodel/boise
- [ ] Week 2: 2026 kitchen planning ranges → budget worksheet PDF
- [ ] Week 3: ADU options → /guides/boise-adu-guide
- [ ] Week 4: Free in-home visit → /contact
- [ ] Set calendar reminder: 1 post every Monday

---

## Phase 12 — Reviews (day 1 of going live)

- [ ] Copy GBP short review link from dashboard
- [ ] Set `NEXT_PUBLIC_GBP_REVIEW_URL` in production env
- [ ] Test `https://boiseremodeling.co/review` redirects correctly
- [ ] Add review line to email signature (`buildEmailSignatureReviewLine()`)
- [ ] Use in-person ask script at every final walkthrough
- [ ] Send Day 1 email via `sendWalkthroughReviewEmail()`
- [ ] Send Day 7 reminder via `sendReviewReminderEmail()` (once only)

---

## Phases 13–14 — Messaging & parallel listings

### GBP messaging
- [ ] Enable Google messaging
- [ ] Set welcome message (GBP_MESSAGING.welcomeMessage)
- [ ] Check messages daily during business hours

### Parallel listings (same week)
- [ ] Bing Places — import from GBP
- [ ] Apple Business Connect — Home Improvement category
- [ ] Set `NEXT_PUBLIC_BING_PLACES_URL` and `NEXT_PUBLIC_APPLE_BUSINESS_URL`

---

## Phase 15 — Env & schema sync

- [ ] Set `NEXT_PUBLIC_GBP_URL` (Maps listing)
- [ ] Confirm `BUSINESS_INFO.sameAs` includes new URLs (automatic via lib/seo.ts)
- [ ] Schedule monthly sync (GBP_MONTHLY_SYNC) and quarterly sync (GBP_QUARTERLY_SYNC)
