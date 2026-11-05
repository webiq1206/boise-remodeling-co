# Boise Remodeling Co brand profile

Profile version: 1.3, source consolidation dated November 5, 2026. Last separately recorded approval: the September 24 family design handoff and October 28 approved logo receipt; the latest owner instructions are incorporated below. This consolidation and the November 4 implementation still require independent rendered review and release checks. It is not a new approval or publication record.

This is the current website profile. Its source of truth is the verified owner direction, the [approved design handoff](approved-design-handoff.md), [approved asset receipt](branding-20261028.json), [brand configuration](../lib/familyBrand.ts), [site configuration](../shared/siteConfig.ts), and [canonical family tokens](../styles/family-tokens.css). The November 4 authority and typography decision are recorded in the workspace as `evidence/portfolio-six-site-authority.md` and `evidence/portfolio-typography-decision.md`. Older kit rules remain useful for original artwork, but their colors and minimum wordmark sizes do not override the approved website lockup or current UI tokens.

## Audience, positioning, and page goals

Serve homeowners planning kitchens, bathrooms, whole-home improvements, additions, basement work, and outdoor living in Boise and the Treasure Valley. The positioning is thoughtful design-build remodeling with one accountable team, a written scope before construction, and clear communication. Help readers understand the service, compare useful design directions, review planning guidance, and request a free in-home visit. The primary navigation action is **Request a quote**, linking to `/#request`; contextual service, guide, contact, and planning actions retain their purposes.

The intended impression is warm, architectural, editorial, calm, practical, and carefully made. Use generous paper and bone grounds, restrained sage accents, clear serif hierarchy, substantial room photography, and readable body copy. Improve the composition of adjacent text-heavy sections together. A color change alone does not satisfy the owner's request for meaningful visual interest.

## Logos and approved assets

The current horizontal lockup is `public/brand/approved-lockup-dark.svg` on light grounds and `public/brand/approved-lockup-light.svg` on dark grounds. Use the existing 412:50 aspect ratio, intrinsic sizing, and responsive shared header/footer sizing; never distort or reconstruct the mark with live text. The P5 endorsement is part of the approved artwork. The corresponding P5 family icons are `public/brand/p5-family-dark.svg` and `public/brand/p5-family-light.svg`.

The [October 28 receipt](branding-20261028.json) maps each approved source asset and SHA-256. Its Library source is `libfile_4efa3eb963fc81919a6cd4c2c179b0e3`, archive SHA-256 `52ba70b766cd32a607675d11a4f1a36eb43697fe49f379b8ce4585c371316b6a`. The dark lockup hash is `b30385b73a55b15f84c74672fc130557813ce4bedcfa8722bbd41e7713cf4fb3`; the light lockup hash is `28d44af4a6d92f9fe7a922276b93aa04f498bb3cc325f1c902ce7ee31429aa44`.

Keep clear space of one B cap height around the original wordmark, and 8% of seal diameter around standalone seal artwork, following the [original brand kit](../public/brand/BRAND.md). Its standalone seal minimum is 160px on screen; use the approved horizontal lockup for compact chrome. The old kit's 600px wordmark minimum does not describe the current responsive website lockup. Put dark artwork on a light ground and light artwork on a sufficiently dark, quiet ground. Preserve contrast and safe space when cropping photographs behind a logo; do not recolor the supplied artwork.

## Color roles

Use these exact canonical values. The brand configuration supplies Remodeling's accent overrides; default shared fallback accents are not the Remodeling identity.

| Role | Value | Use |
| --- | --- | --- |
| Paper / background / surface | `#fbfaf6` | Main light ground and cards |
| Bone / alternate background | `#f1ede4` | Alternate sections and quiet surfaces |
| Ink / primary text | `#20231f` | Canonical readable text |
| Ink 2 / muted text | `#343934` | Supporting text |
| Charcoal / primary action | `#383837` | Owner-approved editorial dark surfaces and primary action role |
| Chrome | `var(--color-charcoal)` (`#383837`) | Shared header, desktop/mobile menu, and footer backgrounds |
| Moss | `#233029` | Existing deep surface role |
| Forest / legacy dark fill | `#383837` | Neutral hero fallback and mobile action-bar fill |
| Border | `rgba(32,35,31,.15)` | Light-ground separators |
| Remodeling accent | `#7d9479` | Sage identity, emphasis and decorative details |
| Remodeling accent ink | `#4d6249` | Readable accent text and active states on light grounds |
| On dark | `#fbfaf6` | Text and icons on dark grounds |
| Muted on dark | `rgba(251,250,246,.8)` | Secondary text on dark grounds |
| Border on dark | `rgba(251,250,246,.18)` | Dark-ground separators |
| Image scrim RGB | `56,56,55` | Neutral charcoal in the existing hero gradients |
| Success | `#3f6b4a` | Confirmed success state |
| Warning | `#8a6a1f` | Warning state |
| Error | `#a33a2c` | Validation and error state |

The latest November 4 owner direction adopts the charcoal proposed in PR #131, `#383837`, and requests resolution of the charcoal conflicts. The primary-action and chrome roles now share this value. Preserve the current typography, icons, service sections, truthful copy and public-address removal while reconciling that draft. Source implementation does not establish independent review, merge or publication. The legacy email role's sage `#9aa098` belongs to historical artwork guidance; it is not the current website accent.

## Typography

Self-hosted Cormorant Garamond carries headings and display, with Manrope for body, labels, buttons, forms, and navigation. [Root layout](../app/layout.tsx) loads the existing variable WOFF2 files with `display: swap`, Cormorant weights 300–700 and Manrope 200–800. Default display weight is 400, body 400, and labels/buttons 600 where their role calls for it. Keep supplied logo lettering as artwork.

The November 4 common responsive roles are explicit below. Phone is below 640px, tablet is 640–1023px, and desktop starts at 1024px. Sizes are in CSS pixels; line heights are unitless.

| Role and canonical token | Phone | Tablet | Desktop | Line height / tracking |
| --- | --- | --- | --- | --- |
| Marketing hero `--fs-hero` | `clamp(44px,13.333vw,56px)` | `clamp(56px,8.5vw,80px)` | `clamp(68px,7vw,116px)` | 1.02, desktop .98 / -.03em |
| Editorial section display `--fs-display` | 36 | 52 | 64 | 1.05 / -.02em |
| Interior H1 `--fs-page-title` | 40 | 44 | 52 | 1.1 / -.02em |
| Feature panel `--fs-h1` | 32 | 44 | 52 | 1.1 / -.02em |
| Ordinary content H2 `--fs-h2` | 28 | 36 | 40 | 1.15 / -.01em |
| Card/content H3 `--fs-h3` | 22 | 26 | 28 | 1.2 / -.01em |
| H4 `--fs-h4` | 18 | 20 | 20 | 1.3 / 0 |
| Body `--fs-body` | 17 | 18 | 18 | 1.6 / 0 |
| Caption `--fs-small` | 14 | 15 | 15 | 1.5 / 0 |
| Eyebrow `--fs-label` | 13 | 13 | 13 | 1.3 / .06em |
| Navigation `--fs-nav` | 15 | 15 | 15 | 1 / 0 |
| Button `--fs-button` | 16 | 16 | 16 | 1 / 0 |

Large marketing section headlines use the display role even when semantically H2. Article/legal content headings use content H2/H3 roles. Semantic outline is not changed to obtain a visual size. Hero support keeps its existing shared 17/18/20px role. Editorial step numerals, pull quotes, founder quotations, proof strip, footer telephone, and specialized task controls have distinct purposes; document exceptions rather than inventing per-site heading clamps. The workspace role ledger is `evidence/portfolio-labels/remodeling-typography-role-edits.json`. Actual loaded fonts, computed role equality, wrapping, enlarged text, and field inheritance still require rendered verification.

## Spacing, layout, shape, and surface

Canonical spacing is 4/8/12/16/20/24/32/40/48/64/80/96/128px. The shared maximum container is 1280px and readable measure 65ch. Canonical gutters are 20/32/48px, with 16px below 360px; grid gaps are 20/24/32px. Section rhythm is 64/80/96px, compact 32/48/48px, and feature 80/96/128px. Existing approved editorial compositions retain their deliberate named shells and image/text ratios; they are not silently converted to a new grid.

Use `--stack-heading` 16px, desktop 20px, between headings and body, and `--stack-cta` 24px, desktop 32px, for CTA rhythm. Controls have square corners, inputs and choices 4px, with fully round shapes reserved for suitable icon/status treatments. Canonical light and dark borders are in the color table. Do not add decorative shadows; retain existing functional overlay separation and established component shadows. Keep visible keyboard focus, safe wrapping, and minimum 44px touch targets. Large buttons are 48px, medium 44px; standard inputs are 48px and choice cards at least 56px. Protected application geometry remains under its own modules.

## Photography, illustration, and cropping

Use the approved warm, specific room and construction-detail assets already assigned in [family content](../components/approved/family-content.ts), [gallery data](../shared/galleryData.ts), [featured imagery](../shared/featuredProjects.ts), and [blog image registry](../shared/blogImageRegistry.ts). Preserve the photographic hero's existing scale and intentional focal point. Prefer substantial images that explain the service, material, or room; avoid arbitrary decoration. Preserve meaningful room features at phone crops and keep text away from busy highlights.

Per the latest owner direction, public copy must not describe images as concept/representative/illustrative or discuss a first project, new brand, reference availability, or publication policy. Remove these disclaimers from body, metadata, alt text, image feeds, and reusable public components. Images must still never be represented as named customer projects, actual before/after work, invented completed work, or fabricated testimonials. Use direct visual alt descriptions. Design comparisons use material/finish names, such as **Oak cabinetry** and **White shaker**; preserve the slider's pointer, touch, keyboard, and range behavior.

## Buttons, forms, navigation, icons, and motion

Use clear sentence-case actions and the existing square primary/secondary treatments. The current shared header navigation is Services, Design ideas, Areas, About, Guides, Blog, and Contact; primary action **Request a quote**. The desktop header starts at 1180px because the seven-item navigation needs the space. All family headers and footers use the same unboxed Call, Text, and Chat icon treatment with accessible text labels and visible focus. Actual destinations remain the configured `tel:`, `sms:`, and `p5:assistant-open` event. Chat must be omitted on routes where the existing assistant cannot open, as recorded in `FAMILY_BRAND.chat.hiddenOn`; an icon must not promise an unavailable interaction.

The mobile action bar retains its existing visibility and yield flags for focused fields, open chat, and estimator/wizard states. Keep form labels, validation, back/edit behavior, consent, upload limits, error handling, persistence, contact routing, and review-before-send steps. A typography edit is not authority to change fields or submission logic.

Use the canonical 200ms/300ms motion durations with `cubic-bezier(.2,.7,.2,1)` or `cubic-bezier(.45,0,.25,1)`. Preserve hover, active, disabled, error, and focus states. Respect reduced motion; animation must not be required to understand or operate the page.

## Writing style and public information

Write directly to homeowners in natural, professional language. Prefer concrete room, finish, scope, and planning descriptions. Keep useful service and location detail, scope/safety/legal/pricing qualifications, the fact that planning ranges require a project-specific scope, business hours, phone, and appropriate Idaho registration details.

The latest owner instruction removes the business street address from every public website surface, including schema, feeds, downloadable contact records, map embeds, and public configuration. Describe served cities and the Treasure Valley instead. Remove public-representative labels, administrative/storefront explanations, and DOPL lookup instructions; display the useful registration number naturally. Nick's name may appear in an appropriate founder biography. Preserve accurate verification records outside the public website and the existing P5 Google Business Profile link. No hidden text or public JSON workaround is acceptable. Website work does not establish or change the GBP's private service-area settings.

## Available proof and tools

The current approved source supports written scope before construction, a two-year workmanship warranty, a dedicated project manager, and Idaho contractor registration 8381215. The registration link remains the existing official DOPL destination. Do not invent ratings, project counts, business longevity, testimonials, or a customer-project history.

Keep the existing interactive planning ranges, service/city guidance, downloadable planning resources, permit guidance, and project-request workflow. Range inputs and service options remain governed by their existing data and controllers; estimates are planning guidance rather than a fixed construction price. Preserve the distinction between manufacturer and workmanship coverage. The existing source's proof statements are retained; this consolidation does not independently reverify external credentials or create a new claim approval.

## Wizard flows and destinations

| Flow | Purpose and steps | Result and destination |
| --- | --- | --- |
| Homepage `/#request`, `HeroConversion` | Existing short project intake with project details/contact and confirmation behavior | Existing request API and confirmation; delivery wiring and consent preserved |
| `/estimate`, `EstimateRequestWizard` | Project, Name, Phone, Email, Details, Review; optional photos in details | Explicit **Send request** submits the existing request; preserves validation, draft storage, review/edit, and response behavior |
| `/estimate/scope`, `/estimate/p5-preview`, `P5Estimator` | Existing Project, Details, Estimate stages, with dynamic scope questions, upload and review states | Existing engine estimate/request behavior, PDF/email and follow-up affordances; provider actions require separate authorized testing |
| `/remodel-plans-boise`, `PlansWizard` | Existing P5Estimator embedded for plans and supporting project details; stages follow the same engine | Existing upload/scope/estimate handling; no new destination or pricing implementation |
| `/re-10-repairs-boise` and existing redirects | Preserved referral/repair routing to the relevant Handyman offering | Existing configured destination; no new Remodeling repair workflow |

These are source inventories, not newly approved exceptions to current wizard standards. The existing contact-before-scope request sequence and protected estimator design remain unchanged in this task. Any future change to that sequence requires an explicit conversion review, not a CSS override.

## Acceptance evidence, rejected patterns, and exceptions

The [approved handoff](approved-design-handoff.md) records the historical September 24 design and representative desktop/320/390/768px review. It does not provide an individually accepted screenshot for every generated page. No new November 4 acceptance screenshot is asserted here. The parent task owns the current image references, independent preview review, release evidence, and exact-head CI. The current implementation must be reviewed on phone, tablet, and desktop, including enlarged text, menus, slider, forms, and route-specific controls.

Rejected by the latest owner direction: consecutive text-heavy sections without purposeful imagery/composition, inconsistent sizes for equivalent roles, public concept/reference-status disclaimers, visible street/admin blocks, boxed Call buttons, and header menus with a different charcoal from the footer. Their authority is the recorded owner transcript, not an invented screenshot rejection. Preserve the approved hero, typography families, warm editorial character, and each company's specific imagery and services.

No new approved page-specific exception is created here. Existing dedicated estimator, administration, portal, login, dealer/installer, and design application surfaces are outside the marketing wrapper as implemented by [ApprovedShell](../components/approved/ApprovedShell.tsx). Keep their task-specific controls; record any future approved exception in both this profile and the standards review record.

## Protected functionality and family relationship

Protect all existing public URLs/redirects, static route expansions, metadata, canonicals/indexing, schema identifiers and useful truthful business facts, analytics/attribution, forms, notifications, CRM and email routing, consent, authentication, uploads, estimator APIs/engine/pricing, PDF delivery, and runtime/environment bindings. No lead submission, third-party/provider execution, credential change, import, or publication is implied by this profile.

Boise Remodeling Co is a DBA of P5 Home Co LLC; retain the legal parent disclosure and parent website link. The approved family navigation links P5 Home Co, Boise Construction Co, Boise Remodeling Co, Boise Handyman Co, and Boise Cabinet Co. ADU work currently routes through Construction; do not invent an ADU launch or add a new site merely from a dormant brand entry. Shared chrome, canonical tokens, icon conventions, and role scale belong to the family; Remodeling retains its sage accent, room imagery, design-build services, content, and request destinations. Shared manifest files/components/styles are maintained by the canonical family owner and hash checked; site edits must not overwrite concurrent family or draft-PR work.


### November4 narrow-header and menu implementation record

Canonical source `boise-remodeling-co` revision `fa720a579b696af92861fb571fa0aff043e734b0` restores the complete approved SVG below360px in a logo row above the unboxed contact/menu controls. Normal320px prototype height is89px including the border; use the actual measured header/safe-area height, not a fixed clearance. Enlarged text may grow it. Normal360px-and-up header geometry is unchanged. Mobile-menu Call/Text/Chat contact controls are transparent and borderless at rest, retain visible focus and existing destinations/capability, and use the same icons as header/footer. This records the owner-requested consistency repair, not a new identity or approval exception. The independently reviewed prototype is narrower evidence than each final built site; retain exact-head rendering and functional gates.


### Exact heading accent, November 4 owner instruction

Heading emphasis uses the actual approved logo/icon pop `#7d9479` through the site-owned
`--color-heading-accent` role. It is not mixed with paper or replaced by accent ink.
The approved SVG bytes, existing type families/sizes/weights, neutral palette and
functional text/focus roles are preserved. Public H1/H2 and editorial display emphasis,
interior statement/aside titles, legacy hero emphasis and dark planning bands consume
this exact role. The shared HeroPhoto uses the same heading role after canonical transport.
Small FAQ open states and related/service title hover states retain readable neutral text;
underline/chevron affordances convey their state without adding a different heading hue.
Existing H2 display emphasis on bone retains its scoped 1px charcoal context. The later November 5 instruction removes that context from H1s only; H2 styling is preserved.
This is a source implementation record, not a rendered contrast or visual acceptance.
Actual font pixels, photograph contrast, all listed template consumers and independent
review remain required at the exact final revision. Source evidence lives in the private
`evidence/brand-heading-accent-inventory.json` and implementation ledger.

### November 5 heading refinement

The owner requested clean H1s without glyph shadows, stronger phone H1s, and selective restoration of earlier mobile left alignment. The shared hero phone role is `clamp(44px,13.333vw,56px)`, while ordinary H1s use `--fs-page-title` at40/44/52px. The separate feature-title role stays32/44/52px; dedicated estimator title clamps and centered controls remain unchanged. Only the recently introduced mobile hero/interior centering rules were removed.

For the homepage, the exact sage accent sits on an existing-charcoal lower copy field instead of an eight-direction glyph surround. An8px heading-stack separation clears descenders; the phone CTA stack is16px. Phones/tablets show a purposeful upper kitchen crop including island/stool detail; desktop retains the original heading width and a right-hand view of the room. This bounded composition preserves the approved image, content and CTA. Independent V5 development-prototype review passed the nine-size set; final production-build review, CI, merge and publication are separate gates. Jared retains publication ownership.
