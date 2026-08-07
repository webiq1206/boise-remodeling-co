/**
 * Input formatting and format checks shared by every estimator wizard, so a
 * phone number reads the same way in the main estimator gate, the RE-10
 * contact step and the plans contact step, and so "valid email" means one
 * thing across all three.
 */

/** The digits of a phone number, with a leading US country code stripped. */
export function phoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/**
 * Progressive (208) 477-1169 formatting for a phone field. Safe to run on
 * every keystroke: it formats only what has been typed so far and never
 * traps the caret behind punctuation the user then has to delete twice.
 */
export function formatPhoneInput(raw: string): string {
  const d = phoneDigits(raw).slice(0, 10);
  if (d.length === 0) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isValidPhone(raw: string): boolean {
  return phoneDigits(raw).length === 10;
}

/* Same shape the estimate gate has always used; centralised so the RE-10 and
   plans wizards stop accepting any non-empty string as an email address. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim());
}
