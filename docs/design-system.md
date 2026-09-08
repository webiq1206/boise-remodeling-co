# P5 family design system (shared rules and permitted brand variation)

The four brand sites share one editorial layer, `app/family.css`, kept byte-identical across repositories (`md5 -q app/family.css` on each repo must match). It carries no brand colour: every hue resolves from the site's own tokens (`--background`, `--foreground`, `--heading`, `--primary`, `--accent`, `--accent-legible`, `--accent-on-light`, `--muted-foreground`, `--border`, `--inverse`). The reference is p5homeco.com's own stylesheet.

## Shared rules (do not vary per brand)
- Measure: `ed-shell` = min(100% - 48px, 1380px); narrow 1080px; prose 720px. Breakpoints 1100 / 820 / 560.
- Rhythm: `Section` with `spacing="default" | "sm" | "lg" | "xl"` (fluid clamp paddings) and `surface="dark" | "deep" | "bone" | "muted" | "gradient"`. Dark-dominant pages with several light (`bone`) bands spaced apart; closing asks are gradient statement bands, never cards.
- Type: Cormorant Garamond display/headings (`ed-display`, `ed-h2`, `ed-h2-sm`, `ed-h3`, `ed-h4`), Manrope body at 15px/1.75 (`ed-body`), `ed-lede`, tracked uppercase `ed-eyebrow` with a 28px rule. Statement measures live on the heading (`ed-statement*`), never on a wrapper.
- Layout primitives: `ed-split` (1.35fr/.65fr, `-even`, `-narrow`, `-end`, `-center`), `ed-matrix` (hairline grid; column count via `--ed-cols`, collapses to 2 columns under 1100px and 1 under 560px by track list, so an inline `--ed-cols` cannot override it), `ed-panel` (57/43 image + copy, `-reverse`), `ed-rail` (horizontal scroller), `ed-inset`, `ed-card`, `ed-steps`/`ed-step`/`ed-step-n`, `ed-link` + `ed-arrow`.
- Buttons: `brand` (58px, uppercase, 11px/700, tracked), `brandOutline`, `heroOutline` (same format in inverse colours over photography). CTA pairs stack full width under 640px. `heroGhost` is wizard chrome only.
- Motion: `ed-rise` reveal and `ed-zoom` 850ms on the shared curve; everything respects `prefers-reduced-motion`.
- Light bands re-point the semantic tokens for their subtree (including `--heading`, `--primary` and `--primary-foreground` so `brand` buttons are ink on bone) and leave `--inverse` alone so photo badges stay dark.
- Estimators: `/estimate` is a fixed one-screen `AppFrame` (Cabinet: `GuidedFlowShell fitViewport`) with the step body between a compact header and a pinned footer; every step fits 390x844 without page scroll. Dialogs render above the frame (`z-[210]/[220]`).
- Mobile: hero stat cards become a three-cell strip; trust strips are left-aligned rows with an inline dot; phone layouts are checked by `scripts/verify-mobile-layout.mjs` and contrast by `npm run verify:contrast`.

## Permitted brand variation
- Colour tokens and accent (Remodeling sage, Construction ochre, Handyman blue, Cabinet teal), logos and wordmarks, photography, copy, service data, section order per page, and which sections a page uses. Header and footer structure follow the same pattern with brand-specific links.
- Nothing else: type scale, spacing, primitives, button formats and estimator chrome stay shared so the sites read as one family.

## Grid balance (2026-09-08)

A row that ends with one lonely cell reads as unfinished, so every grid picks
its shape from its item count instead of a fixed column number.

- `.ed-matrix`: five items lay out as three then two, seven as four then three
  (span rules in `family.css`, desktop only). In the two-column range
  (561 to 1100 px) an odd last item takes the full row.
- `.ed-cards-3`: the card grid for posts, guides, projects and services. One
  column on phones, two on tablets (an odd last card is centred), three on
  laptops and up (a lone last card is centred, a pair widens to halves).
  Use it instead of `grid sm:grid-cols-2 lg:grid-cols-3`.
- `.ed-grid-balance`: opt-in for one or two column Tailwind grids (option
  cards, checklists, contact channels): the last odd item spans the row.
- Fixed counts: nine cities use three columns; four benefits use four.
- Two-column sections never leave a column empty. The long-form prose measure
  carries a sticky "In this guide" index; a lone local note or timeline is a
  split with the heading on the left; "what sets us apart" carries a photo
  under its sticky intro.

The section audit that found these lives at `scripts/_section-audit.mjs` in
the Remodeling repo (Playwright; nine viewports; flags orphans, one-sided
sections, sparse bands, text-only sections, overflow) with `scripts/section-sheets.py` for
contact sheets.
