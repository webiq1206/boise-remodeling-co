# 11 - EEAT Audit

Sitewide EEAT score: **4.2/10** - the lowest non-GBP score in the audit. The site *claims* trust ("bonded, insured, workmanship guarantee") but *demonstrates* almost none of it. For YMYL-adjacent home services, this gates both Google rankings and AI-engine recommendations.

## Experience - 4/10
- 5 gallery projects, 4 testimonials, 1 featured before/after. No project dates, no addresses/neighborhoods, no budget bands, no duration.
- **Fix**: per-project case-study format: neighborhood (not address), year, duration, scope, finish level, 3+ photos. Even retrofitting the 5 existing projects with these fields is a step change. New projects: document during construction (progress photos showing dust barriers etc. prove the process claims).

## Expertise - 4/10
- All content attributed to the Organization; no human expert exists anywhere on the site.
- **Fix (implemented this pass)**: founder section on /about (`#team` anchor): the owner, role, years in trade, photo placeholder, 2-3 sentence bio. Wire `BUSINESS_INFO.founderName` → Organization `founder` schema. Then attribute expanded guides to him via the existing Article Person-author plumbing.
- Owner to supply: real bio facts, headshot, any trade credentials. Do not fabricate - ship structure with accurate minimal facts now, enrich later.

## Authoritativeness - 3/10
- Zero external validation: no GBP, 1 wrong citation, no association memberships, no awards, no press.
- **Fix**: the off-site program IS the authority fix - 02 (GBP), 07 (citations), 08 (reviews). Additional: NARI or Building Contractors Association of SW Idaho membership (~$500-1,000/yr, gives a credential + directory link + award eligibility); Boise Metro Chamber.

## Trustworthiness - 5/10
- Good: real phone, email, consistent NAP, privacy/terms pages, no-pressure positioning, honest "planning range not bid" disclaimers (genuinely above-average candor).
- Published: `licenses: ['Idaho Registered Contractor #8381215']`. Do not put the number back behind "available upon request".
- **Idaho fact worth using**: Idaho requires general contractors to *register* (not license). Competitors hide behind vague "licensed and insured" claims. Publishing the actual registration number (format RCE-#####) plus insurance carrier/bond details would exceed local norms and is exactly the kind of verifiable fact engines reward.
- **Fix**: owner supplies the Idaho contractor registration number → footer + /about + `BUSINESS_INFO.licenses` + future `hasCredential` schema. Also reconcile public-record association with Timber and Love Inc (RCE-42326) - if Boise Remodeling Co operates under or alongside that registration, state the relationship plainly on /about; ambiguity between two contractor identities is a trust leak that a diligent homeowner (or AI engine) will find in permit records.

## Page-by-page EEAT actions
- **/about (Critical)**: founder section (#team), license/registration display, history timeline (founded 2017 → today), insurance specifics, photo of team/vehicle
- **/testimonials (High)**: dates + cities + project types on all entries; Google review embeds post-GBP
- **Guides (High)**: Person author + dateModified on every expanded guide
- **Footer (Medium)**: registration number + "Bonded & Insured" with bond/carrier detail
- **Blog (Medium)**: author byline once /about#team exists

## What NOT to do
No fabricated awards, review counts, team members, or years of experience. Every gated schema field stays gated until the real fact exists. The site's honesty positioning is an asset - extend it to credentials.
