# Approved P5 family redesign

Implemented September 24, 2026. Production deployment remains the owner's responsibility through Replit.

## Design

- Original horizontal vector wordmark retained, with the P5 family signature in the brand accent and the endorsement “A P5 Home Company”.
- Matching browser and application icons.
- P5 Manrope and Cormorant Garamond typography, paper #FBFAF6, bone #F1EDE4, and charcoal #2C302F.
- Approved homepage imagery, service exploration, process, and approach sections.
- Shared marketing theme extends to existing interior pages. Administrative, portal, and dedicated estimator application surfaces are excluded from the marketing wrapper.
- Online estimates remain the primary action in the hero, navigation, mobile sticky bar, and relevant sections. The embedded estimator uses the original production component, not an iframe or simulated quote.

## Preserved systems

Existing routes, redirect configuration, sitemap generators, robots configuration, page metadata, structured-data generators, service/location/guide/blog data, consultation form logic, analytics, and estimator engine/API/upload/delivery code were not replaced. Homepage FAQ rendering uses the existing FAQ source, preserving its agreement with the homepage schema. Original logo assets remain available unchanged.

Homepage editorial copy and ordering follow the approved design; useful production budget and consultation content remains. No generated image is presented as a named customer project, and no fabricated testimonial was carried over from a mockup.

## Validation and release

Production build and existing prebuild gates passed. Browser review covered desktop and 320, 390, and 768 pixel embedded viewports, including image loading and overflow checks. Shared mobile navigation and service tabs were exercised; cabinet tabs and the dedicated estimator entry were also checked. No real lead was submitted, and production email, CRM delivery, pricing services, or third-party credentials were not exercised.

Before republishing, pull main without overwriting local Replit-only work, retain the existing production environment variables and database bindings, and run the normal build. After publishing, smoke-test the homepage, service/location pages, catalog where applicable, estimate submission, upload, PDF/email delivery, consultation form, canonical tags, robots, and sitemap on the actual domain. Monitor Search Console after release. Preserving technical SEO does not guarantee unchanged search rankings.

The parent P5 website is outside this change. A standalone ADU site requires a separately confirmed repository.
