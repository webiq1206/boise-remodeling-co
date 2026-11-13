# Approved homepage video

The approved v2 videos and scene preview are saved unchanged in
`public/media/remodeling/`.
The 1080p MP4 exactly matches the separately approved desktop v2 asset.
The 720p MP4 is selected at widths up to 767px; desktop and tablet use 1080p.
All three supplied videos and the scene preview are retained. No visual
regeneration or re-editing was performed on them. The Library transfer metadata
stays outside Git.

The poster is no longer the delivered file. It was replaced on 13 November 2026
(owner direction: no Craftsman-style house in any family photo) with a
photograph of a contemporary single-story home at the same path, 1920x1080 JPEG.
The delivered poster was the first frame of the video; the replacement is a
different house, so the picture changes when playback starts. The videos and
the scene preview still show the original timber-porch exterior and await the
owner's decision.

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
| `boise-remodeling-co-poster.jpg` (replaced 13 November 2026, not the delivered file) | 375,866 | `19eebe0d3c14e8369eb8c11d07c74e28c1a5aae593d98182cf7e5d59f84e35d2` |
| `boise-remodeling-co-scene-preview.jpg` | 561,339 | `30b2f81d05a0752525d1c8786bc65a6a80b1c09eda2d58ef2083cd079339b321` |
