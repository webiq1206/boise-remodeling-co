/**
 * Central site configuration - NAP, URLs, and contact strings.
 * Override via env for staging; replace placeholder values before launch.
 */

const DEFAULT_PHONE = "(208) 477-1169";
const DEFAULT_PHONE_TEL = "2084771169";

/** tel: and sms: links use E.164 (+12084771169). Visible copy stays on DEFAULT_PHONE. */
function companyTelHref(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}
const DEFAULT_EMAIL = "hello@boiseremodeling.co";
const DEFAULT_SITE_URL = "https://boiseremodeling.co";

export const SITE_CONFIG = {
  name: "Boise Remodeling Co",
  /**
   * The registered legal entity. This brand is an Idaho assumed business name
   * (DBA) of P5 Home Co LLC - there is no separate "Boise Remodeling Co LLC" company.
   * `name` above stays the DBA, which is what customers know and what belongs
   * in a GBP business-name field; `legalName` is the entity that actually
   * signs contracts, holds the registration and gets verified against state
   * records, so the two are deliberately different values.
   */
  legalName: "P5 Home Co LLC",
  phone: process.env.NEXT_PUBLIC_PHONE ?? DEFAULT_PHONE,
  phoneTel: process.env.NEXT_PUBLIC_PHONE_TEL ?? DEFAULT_PHONE_TEL,
  phoneHref: companyTelHref(process.env.NEXT_PUBLIC_PHONE_TEL ?? DEFAULT_PHONE_TEL),
  phoneSmsHref: companyTelHref(process.env.NEXT_PUBLIC_PHONE_TEL ?? DEFAULT_PHONE_TEL).replace(/^tel:/, "sms:"),
  email: process.env.NEXT_PUBLIC_EMAIL ?? DEFAULT_EMAIL,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
  // Public service locality and coverage. Verification records retain the business address.
  address: {
    city: "Meridian",
    state: "ID",
    cityState: "Meridian, ID",
    serviceArea: "Treasure Valley · Ada and Canyon County",
  },
} as const;

/** Hours we answer texts. Call-desk hours elsewhere stay on their own schedule. */
export const TEXT_REPLY_HOURS = "Mon–Fri 9–6, Sat 9–4 MT";

export function textReplySmsHref(tel: string = SITE_CONFIG.phoneTel): string {
  const digits = tel.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `sms:+1${national}`;
}

export function textReplyLine(phone: string = SITE_CONFIG.phone): string {
  return `Prefer to text? Text ${phone}. We reply in minutes during business hours (${TEXT_REPLY_HOURS}).`;
}

export function textReplyLineHtml(phone: string = SITE_CONFIG.phone): string {
  return `<p style="margin:12px 0;line-height:1.6;">Prefer to text? Text <a href="${textReplySmsHref()}">${phone}</a>. We reply in minutes during business hours (${TEXT_REPLY_HOURS}).</p>`;
}

export function formatPhoneDisplay(tel: string = SITE_CONFIG.phoneTel): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return SITE_CONFIG.phone;
}

/** Customer-facing coverage line, shared by the contact page and footer. */
export function publicFooterLine(): string {
  return `Serving the ${SITE_CONFIG.address.serviceArea}`;
}
