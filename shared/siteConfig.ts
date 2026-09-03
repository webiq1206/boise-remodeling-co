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
  // Canonical NAP. This is the owner's HOME address, so the street is NEVER
  // rendered on-page and is NOT emitted in public JSON-LD (which is view-source
  // visible). It exists here only to supply the full NAP to Google Business
  // Profile and off-site citation submissions. Public surfaces (schema, footer,
  // contact) show city/state only: Meridian, ID. Google gets the full street
  // via GBP, where a service-area business hides the address publicly.
  address: {
    street: "4031 W Wapoot St",
    city: "Meridian",
    state: "ID",
    postalCode: "83646",
    cityState: "Meridian, ID",
    serviceArea: "Treasure Valley · Ada and Canyon County",
  },
} as const;

export function formatPhoneDisplay(tel: string = SITE_CONFIG.phoneTel): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return SITE_CONFIG.phone;
}
