/**
 * The 2020 founding claim is unproven. Idaho SOS shows P5 Home Co. LLC
 * filed 09/25/2025. The year stays in the repo. Public pages, meta, llms
 * files, and JSON-LD omit it while this flag is false.
 */
export const SHOW_FOUNDED_YEAR = false;

export const FOUNDED_YEAR = '2020';

export function publicFoundedYear(): string | undefined {
  return SHOW_FOUNDED_YEAR ? FOUNDED_YEAR : undefined;
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
