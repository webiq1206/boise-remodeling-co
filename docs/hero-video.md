# Approved homepage video

The approved v2 package is saved unchanged in `public/media/remodeling/`.
The 1080p MP4 exactly matches the separately approved desktop v2 asset.
The 720p MP4 is selected at widths up to 767px; desktop and tablet use 1080p.
All three supplied videos and both images are retained. No visual regeneration
or re-editing was performed. The Library transfer metadata stays outside Git.

The homepage uses a uniform `#000000` overlay at 60% opacity (40% transparency).
Its hero-only sage accent is `#C0CFBB`; existing light copy remains `#FBFAF6`.
This keeps 40% of the video contribution visible while providing a conservative
pure-white-frame contrast bound of 3.52:1 for the large sage accent and 5.50:1
for normal light copy, without relying on text shadows. Brand tokens elsewhere
remain unchanged.
Its backdrop extends to the dynamic viewport fold below the in-flow header,
including the top safe area. Mobile action-bar space is reserved inside content,
so it never shortens the backdrop. The shared family chrome remains unchanged.

The supplied poster and existing copy/action render without JavaScript.
The hero attempts muted inline autoplay and looping at every viewport, including
when reduced-motion or data-saver preferences are enabled. There are no custom
play, pause or stop controls, and native video controls are disabled. The poster
remains during loading or technical failure, including browser autoplay rejection,
unsupported media, network failure and no JavaScript. Browser restrictions are
respected; autoplay is not guaranteed when the browser blocks it.

This requested continuous decorative loop has no pause, stop or hide mechanism
and does not meet WCAG 2.2.2 (Level A). Passing contrast checks is not a claim
of full accessibility compliance. See the [W3C explanation](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html).

## Validation

`node scripts/verify-hero-video.cjs` checks the real homepage at twelve viewport
sizes, viewport resizing, conversion-link keyboard access, responsive sources,
control absence, real looping, autoplay under reduced motion and emulated data
saver, technical playback failures, autoplay rejection and no JavaScript.
Set `HERO_TEST_WEBKIT=1` to include mobile WebKit. Screenshots and measured
viewport/header/hero/next-section geometry are saved under
`test-results/hero-video/`. The `Homepage video and fold verification` workflow
runs repository prebuild gates, affected tests, TypeScript, a production build,
and browser verification on the PR and final main commit.

`node scripts/verify-hero-contrast.cjs` measures actual text regions across the
video loop at mobile, tablet and desktop sizes. It retains the painted shadows
for one pass and measures the video background without shadows separately.
Computed colors and font sizes determine the WCAG AA threshold. A conservative
pure-white-frame bound guards every possible video frame and the poster.
The scene samples and glyph-boundary measurements are evidence, rather than a
whole-site accessibility certification. Results stay in
`test-results/hero-video/contrast/` and are included in the CI evidence archive.

## Original delivery files

| File | Bytes | SHA256 |
| --- | ---: | --- |
| `boise-remodeling-co-background-1080p.mp4` | 19,154,338 | `a43664543b109171fc97e4bf11b996dba957de0030fcbe27989fa4b1d6c19352` |
| `boise-remodeling-co-background-720p.mp4` | 5,185,859 | `91c82adeaab104dc0752c533b9172c67307b6c8f970ee6ce1cc64d0b8dce32a4` |
| `boise-remodeling-co-background.webm` | 8,796,241 | `2c03e2f720d5dbbbca03324d2da7bf862567765946f4f5d8021ebd324e53a4a5` |
| `boise-remodeling-co-poster.jpg` | 333,255 | `6e573983df19974f90f26bae62cb639d8d50992b4baef196d5c5dd4ef45acd49` |
| `boise-remodeling-co-scene-preview.jpg` | 561,339 | `30b2f81d05a0752525d1c8786bc65a6a80b1c09eda2d58ef2083cd079339b321` |
