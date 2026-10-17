/**
 * Central site configuration - NAP, URLs, and contact strings.
 * Override via env for staging; replace placeholder values before launch.
 */

const DEFAULT_PHONE = "(208) 477-1169";
const DEFAULT_PHONE_TEL = "2084771169";
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
  phoneHref: `tel:${process.env.NEXT_PUBLIC_PHONE_TEL ?? DEFAULT_PHONE_TEL}`,
  phoneSmsHref: `sms:${process.env.NEXT_PUBLIC_PHONE_TEL ?? DEFAULT_PHONE_TEL}`,
  email: process.env.NEXT_PUBLIC_EMAIL ?? DEFAULT_EMAIL,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
  /** Named public contact. Not a founder and not a staffed-office claim. */
  publicRepresentative: "Nick Perkins",
  // Canonical NAP. This is a service-area business, not a staffed storefront.
  // Visible pages and JSON-LD both carry the full street, city, state, and ZIP.
  address: {
    street: "4031 W Wapoot St",
    city: "Meridian",
    state: "ID",
    postalCode: "83646",
    cityState: "Meridian, ID",
    serviceArea: "Treasure Valley · Ada and Canyon County",
  },
} as const;

/** Hours we answer texts. Call-desk hours are a separate schedule. */
export const TEXT_REPLY_HOURS = "Mon–Fri 9–6, Sat 9–4 MT";

export function textReplyLine(phone: string = SITE_CONFIG.phone): string {
  return `Prefer to text? Text ${phone}. We reply in minutes during business hours (${TEXT_REPLY_HOURS}).`;
}

export function formatPhoneDisplay(tel: string = SITE_CONFIG.phoneTel): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return SITE_CONFIG.phone;
}

/** Construction's footer line, with middle-dot separators. Same words on every page. */
export function publicFooterLine(): string {
  const address = SITE_CONFIG.address;
  return `Public representative: ${SITE_CONFIG.publicRepresentative} · ${address.street}, ${address.city}, ${address.state} ${address.postalCode} · Service-area business, not a staffed storefront`;
}
