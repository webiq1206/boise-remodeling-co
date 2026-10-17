/**
 * Public founding-year claims stay off until the owner turns this on.
 * The original sentences stay in the files that own them. This only decides
 * whether those phrases are published.
 */
export const SHOW_FOUNDING_YEAR = false;

const FOUNDING_YEAR_CLAIM =
  /,?\s*founded(?:\s+in)?\s*:?\s*2020\b(?:\s+and\b)?,?\s*/gi;

/**
 * Drop "since 2020", "founded in 2020", "founded 2020", and "EST 2020"
 * (with or without the period) while the flag is off. Other years, including
 * city founding dates, are left alone.
 */
export function publishFoundingCopy(text: string): string {
  if (SHOW_FOUNDING_YEAR || !text) return text;
  let out = text.replace(FOUNDING_YEAR_CLAIM, (match) => {
    const leadComma = /^\s*,/.test(match);
    const andTail = /\sand\b/i.test(match);
    if (leadComma || andTail) return ', ';
    return ' ';
  });
  out = out.replace(/\s+since\s+2020\b/gi, '');
  out = out.replace(/(?:\s*·\s*|\s+)est\.?\s*2020\b/gi, '');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.replace(/\s+,/g, ',');
  out = out.replace(/,\s*,+/g, ',');
  out = out.replace(/\s+([.;:])/g, '$1');
  out = out.replace(/([.!?])\s*([.!?])+/g, '$1');
  out = out.replace(/([.!?]\s+)part\b/g, '$1Part');
  out = out.replace(/^[ \t]*-[ \t]*$/gm, '');
  out = out.replace(/[ \t]+\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}
