/**
 * The 2020 founding claim is unproven. Idaho SOS shows P5 Home Co. LLC
 * filed 09/25/2025. The year stays in the repo. Public pages, meta, llms
 * files, and JSON-LD omit it while this flag is false.
 */
export const SHOW_FOUNDED_YEAR = false;

/** Unproven marketing claims. Source strings stay. Public copy omits them while these are false. */
export const SHOW_UNPROVEN_TOP_RATED = false;
export const SHOW_UNPROVEN_SATISFACTION_GUARANTEE = false;
export const SHOW_UNPROVEN_PROJECT_COUNT = false;

export const FOUNDED_YEAR = '2020';

export function publicFoundedYear(): string | undefined {
  return SHOW_FOUNDED_YEAR ? FOUNDED_YEAR : undefined;
}

/** The seal's lower arc reads EST 2020. The file stays in the repo. */
export const SEAL_LOGO_PATH = '/brand/png/seal/any/boise-remodeling-co-seal-on-charcoal-512px.png';
/** Square mark with no founding year, used while the seal is withheld. */
export const PUBLIC_LOGO_PATH = '/brand/png/icon/boise-remodeling-co-icon-charcoal-512px.png';
export const SEAL_PREVIEW_PATH = '/brand/page-preview.png';
export const PUBLIC_PREVIEW_PATH = '/brand/png/wordmark/light/boise-remodeling-co-wordmark-charcoal-accent-1200w.png';

export function publicLogoPath(): string {
  return SHOW_FOUNDED_YEAR ? SEAL_LOGO_PATH : PUBLIC_LOGO_PATH;
}

export function publicPreviewPath(): string {
  return SHOW_FOUNDED_YEAR ? SEAL_PREVIEW_PATH : PUBLIC_PREVIEW_PATH;
}

/** Publish a string that may contain the unproven 2020 founding claim. */
export function publishFoundingCopy(text: string): string {
  if (SHOW_FOUNDED_YEAR || !text) return text;
  return text
    .replace(/\bEst\. 2020\b/g, '')
    .replace(/, founded in 2020 and part of P5/g, ' and part of P5')
    .replace(/ founded in 2020 and part of P5/g, ' and part of P5')
    .replace(/\bfounded in 2020 and part of P5/g, 'part of P5')
    .replace(/\bsince 2020\b/g, '')
    .replace(/Founded in 2020\. /g, '')
    .replace(/Founded in 2020, /g, '')
    .replace(/Founded 2020, /g, '')
    .replace(/, founded 2020,/g, ',')
    .replace(/\. part of P5/g, '. Part of P5')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.])/g, '$1')
    .trim();
}
