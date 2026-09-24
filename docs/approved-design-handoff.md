# Approved P5 family redesign

Implemented September 24, 2026. Production deployment remains the owner's responsibility through Replit.

## Design

- Original horizontal vector wordmark retained, with the P5 family signature in the brand accent and the endorsement “A P5 Home Company”.
- Matching browser and application icons.
- P5 Manrope and Cormorant Garamond typography, paper #FBFAF6, bone #F1EDE4, and charcoal #2C302F.
- Approved homepage imagery, service exploration, process, and approach sections.
- Public interior pages now use rebuilt editorial, split-detail, article, document, contact, and image-directory layouts. Administrative, portal, and dedicated estimator application surfaces are excluded from the marketing wrapper.
- Online estimates remain the primary action in the hero, navigation, mobile sticky bar, and relevant sections. The embedded estimator uses the original production component, not an iframe or simulated quote.

## Preserved systems

Existing routes, redirect configuration, sitemap generators, robots configuration, page metadata, structured-data generators, service/location/guide/blog data, consultation form logic, analytics, and estimator engine/API/upload/delivery code were not replaced. Homepage FAQ rendering uses the existing FAQ source, preserving its agreement with the homepage schema. Original logo assets remain available unchanged.

Homepage editorial copy and ordering follow the approved design; useful production budget and consultation content remains. No generated image is presented as a named customer project, and no fabricated testimonial was carried over from a mockup.

## Validation and release

Production build and existing prebuild gates passed. Browser review covered desktop and 320, 390, and 768 pixel embedded viewports, including image loading and overflow checks. Shared mobile navigation and service tabs were exercised; cabinet tabs and the dedicated estimator entry were also checked. No real lead was submitted, and production email, CRM delivery, pricing services, or third-party credentials were not exercised.

Before republishing, pull main without overwriting local Replit-only work, retain the existing production environment variables and database bindings, and run the normal build. After publishing, smoke-test the homepage, service/location pages, catalog where applicable, estimate submission, upload, PDF/email delivery, consultation form, canonical tags, robots, and sitemap on the actual domain. Monitor Search Console after release. Preserving technical SEO does not guarantee unchanged search rankings.

The parent P5 website is outside this change. A standalone ADU site requires a separately confirmed repository.

## Interior-page completion

The public interior implementation covers 20 route modules, including every generated service, city, room, guide, article, and topic page represented by those modules. Pages with a dedicated approved preview use its composition. Page types without a dedicated preview extend the same family system while retaining their specialized content and controls. This is not a claim that an individual preview existed for every indexed URL.

- Photo-led service/room directories; split service and location heroes; sticky estimate planning columns.
- Editorial about pages and charcoal contact heroes with the estimator as the primary action.
- Title-first guides/articles, wide imagery, readable text columns, existing contents/downloads and contextual estimator components.
- Resource/legal documents with section navigation; existing catalog, comparison, search, consultation, and estimation functionality retained.
- Original page metadata, canonical generation, structured-data calls and static parameter generation compared against the prior commit and unchanged across all public route modules.
- Responsive browser sampling covers desktop and 320, 390, and 768px viewports. Build generation covers the full route set; manual browser review is representative, not every generated URL.

Dedicated estimator applications, design tools, authenticated portals, administration, login, and APIs retain their specialized interfaces. They are not converted into marketing-page layouts.

### Interior route modules

- `/about`
- `/areas`
- `/areas/[city]`
- `/blog`
- `/blog/[slug]`
- `/blog/category/[hubSlug]`
- `/contact`
- `/guides`
- `/guides/[slug]`
- `/privacy-policy`
- `/re-10-repairs-boise`
- `/remodel-plans-boise`
- `/resources`
- `/resources/ada-canyon-permit-flow`
- `/services`
- `/services/[slug]`
- `/services/[slug]/[city]`
- `/sitemap`
- `/terms-of-service`
- `/testimonials`

Validation for the interior release: `npm run build`, `npx tsc --noEmit --incremental false`, and `node --import tsx --test tests/approved-interiors.test.ts`. The route audit stores pre-redesign SEO signatures; update them only after intentionally reviewing a metadata/schema change.
