/**
 * Shared film-grain texture as an inline SVG data-URI.
 *
 * Used as a faint `background-image` over dark bands/hero imagery to keep large
 * flat areas from looking digitally sterile. Kept in one place so the (easy to
 * corrupt) URL-encoded SVG can't drift or break per-file - two homepage
 * sections previously shipped a malformed `%3C/2Fsvg%3E` closing tag that
 * silently disabled the texture.
 *
 * Apply at a very low opacity (~0.03) via an absolutely-positioned overlay:
 *   style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.03 }}
 */
export const GRAIN_URL =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E")`;
