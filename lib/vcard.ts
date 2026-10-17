import { BUSINESS_INFO } from "@/lib/seo";
import { SITE_CONFIG } from "@/shared/siteConfig";

/** Escape special characters per vCard 3.0 (RFC 2426). */
function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatTelE164(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return tel;
}

function foldLine(line: string, max = 75): string {
  if (line.length <= max) return line;
  const parts: string[] = [line.slice(0, max)];
  let rest = line.slice(max);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, max - 1)}`);
    rest = rest.slice(max - 1);
  }
  return parts.join("\r\n");
}

/** Build a vCard 3.0 payload from canonical site config (single source of truth). */
export function buildBusinessVCard(): string {
  const tel = formatTelE164(SITE_CONFIG.phoneTel);
  const hoursSummary = Object.entries(BUSINESS_INFO.hours)
    .map(([day, hours]) => `${day[0].toUpperCase()}${day.slice(1)} ${hours}`)
    .join("; ");

  const socialLines = BUSINESS_INFO.sameAs
    .filter((url) => /facebook|instagram/i.test(url))
    .map((url) => foldLine(`URL;TYPE=${/instagram/i.test(url) ? "instagram" : "facebook"}:${escapeVCard(url)}`));

  const note = [
    "Treasure Valley design-build remodeling.",
    SITE_CONFIG.address.serviceArea,
    `Hours: ${hoursSummary}`,
  ].join("\n");

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    foldLine(`FN:${escapeVCard(SITE_CONFIG.name)}`),
    foldLine(`ORG:${escapeVCard(SITE_CONFIG.legalName)}`),
    foldLine(`TEL;TYPE=WORK,VOICE:${tel}`),
    foldLine(`EMAIL;TYPE=WORK:${escapeVCard(SITE_CONFIG.email)}`),
    foldLine(`URL:${escapeVCard(SITE_CONFIG.siteUrl)}`),
    // Street, city, state, and ZIP are the site NAP. Nothing here is filled in by hand.
    foldLine(
      `ADR;TYPE=WORK:;;${escapeVCard(SITE_CONFIG.address.street)};${escapeVCard(SITE_CONFIG.address.city)};${escapeVCard(SITE_CONFIG.address.state)};${escapeVCard(SITE_CONFIG.address.postalCode)};${escapeVCard(BUSINESS_INFO.address.country)}`,
    ),
    foldLine(
      `LABEL;TYPE=WORK:${escapeVCard(`${SITE_CONFIG.address.street}, ${SITE_CONFIG.address.cityState} ${SITE_CONFIG.address.postalCode} · ${SITE_CONFIG.address.serviceArea}`)}`,
    ),
    foldLine(`NOTE:${escapeVCard(note)}`),
    ...socialLines,
    "END:VCARD",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export const BUSINESS_VCARD_PATH = "/contact.vcf";
export const BUSINESS_VCARD_FILENAME = "Boise-Remodeling-Co.vcf";
