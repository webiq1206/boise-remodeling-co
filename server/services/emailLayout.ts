import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * Dark-brand email tokens - the site's actual palette (app/globals.css). Every
 * outbound email renders on the charcoal ground with bone text and the sage
 * accent so it matches boiseremodeling.co. Key names are semantic
 * (bg/surface/text/...) so both the shared CSS here and the inline styles in
 * emailNotifications.ts pull the same colors.
 *
 * The brand kit collapses to a single sage (#9AA098); on the charcoal email
 * ground that reads at 6.21:1, comfortably AA for links, bars and ticks. The
 * retired two-tone sages (#899F95 / #5D6561) are gone.
 */
export const EMAIL_BRAND = {
  bg: "#1C1F1E",         // page background (charcoal)
  surface: "#262B29",    // content card
  raised: "#2E3331",     // highlighted boxes, footer, badges
  hairline: "#39403D",   // borders + dividers
  text: "#F7F5F3",       // primary text (bone)
  textMuted: "#9AA098",  // secondary text (sage)
  accent: "#9AA098",     // sage accent - links, bars, ticks
} as const;

export const SITE_BASE_URL = SITE_CONFIG.siteUrl;

export function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    // Keep table rows readable in the plain-text fallback: separate cells with
    // a space and end each row with a newline before tags are stripped.
    .replace(/<\/td>/gi, " ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The real brand mark for the dark email header: the reverse (light) wordmark.
 * Served as PNG because many email clients (Gmail, Outlook) do not render SVG.
 * Uses an absolute URL so it loads from any inbox.
 */
export function buildLogoImage(width = 210): string {
  return `
    <img src="${SITE_BASE_URL}/brand/png/wordmark/dark/boise-remodeling-co-wordmark-bone-accent-1200w.png"
      alt="${escapeHtml(SITE_CONFIG.name)}" width="${width}"
      style="display:block;margin:0 auto;width:${width}px;max-width:72%;height:auto;border:0;outline:none;text-decoration:none;" />
  `;
}

/** Bone text wordmark for the footer (always renders, even if images are off). */
export function buildTextLogo(): string {
  return `
    <div style="margin-bottom:16px;">
      <div style="font-family:'Fraunces',Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:${EMAIL_BRAND.text};line-height:1.2;">
        Boise Remodeling <span style="color:${EMAIL_BRAND.accent};font-style:italic;">Co.</span>
      </div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:${EMAIL_BRAND.textMuted};margin-top:6px;">
        Design &amp; Build
      </div>
    </div>
  `;
}

export const emailStyles = `
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
    background-color: ${EMAIL_BRAND.bg};
    color: ${EMAIL_BRAND.text};
    line-height: 1.6;
  }
  .email-wrapper {
    max-width: 600px;
    margin: 0 auto;
    background-color: ${EMAIL_BRAND.surface};
  }
  .header {
    background-color: ${EMAIL_BRAND.bg};
    padding: 36px 30px 28px;
    text-align: center;
    border-bottom: 1px solid ${EMAIL_BRAND.hairline};
  }
  .header h1 {
    margin: 20px 0 0 0;
    font-family: 'Fraunces', Georgia, serif;
    font-size: 26px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: ${EMAIL_BRAND.text};
  }
  .header p {
    margin: 8px 0 0 0;
    font-size: 14px;
    color: ${EMAIL_BRAND.textMuted};
  }
  .content {
    padding: 36px 30px;
    background-color: ${EMAIL_BRAND.surface};
    color: ${EMAIL_BRAND.text};
  }
  .content p { color: ${EMAIL_BRAND.text}; }
  .content a { color: ${EMAIL_BRAND.accent}; }
  .greeting {
    font-size: 18px;
    color: ${EMAIL_BRAND.text};
    margin: 0 0 20px 0;
  }
  .section { margin: 28px 0; }
  .section-title {
    font-size: 13px;
    font-weight: 400;
    color: ${EMAIL_BRAND.textMuted};
    margin: 0 0 14px 0;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .info-table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
  }
  .info-table td {
    padding: 12px 0;
    border-bottom: 1px solid ${EMAIL_BRAND.hairline};
  }
  .info-table .label {
    color: ${EMAIL_BRAND.textMuted};
    width: 40%;
  }
  .info-table .value {
    color: ${EMAIL_BRAND.text};
  }
  .highlight-box {
    background: ${EMAIL_BRAND.raised};
    border-left: 3px solid ${EMAIL_BRAND.accent};
    padding: 20px;
    margin: 24px 0;
    border-radius: 4px;
  }
  .highlight-box p { margin: 0; color: ${EMAIL_BRAND.text}; }
  .warning-box {
    background: #2a2a1c;
    border-left: 3px solid #c9a227;
    padding: 20px;
    margin: 24px 0;
    border-radius: 4px;
  }
  .warning-box p { margin: 0; color: #e8dca6; }
  .cta-button {
    display: inline-block;
    background: ${EMAIL_BRAND.text};
    color: ${EMAIL_BRAND.bg} !important;
    padding: 14px 32px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 400;
    letter-spacing: 0.04em;
    margin: 20px 0;
    text-align: center;
  }
  .footer {
    background-color: ${EMAIL_BRAND.bg};
    padding: 30px;
    text-align: center;
    border-top: 1px solid ${EMAIL_BRAND.hairline};
  }
  .footer-contact {
    font-size: 13px;
    color: ${EMAIL_BRAND.textMuted};
    margin: 5px 0;
  }
  .footer-contact a {
    color: ${EMAIL_BRAND.text};
    text-decoration: none;
  }
  .divider {
    height: 1px;
    background-color: ${EMAIL_BRAND.hairline};
    margin: 24px 0;
  }
  .badge {
    display: inline-block;
    background-color: ${EMAIL_BRAND.raised};
    color: ${EMAIL_BRAND.text};
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    margin: 5px 0;
  }
`;

export function buildEmailFooter(): string {
  return `
    <div class="footer" style="background-color:${EMAIL_BRAND.bg};padding:30px;text-align:center;border-top:1px solid ${EMAIL_BRAND.hairline};">
      ${buildTextLogo()}
      <p class="footer-contact" style="font-size:13px;color:${EMAIL_BRAND.textMuted};margin:5px 0;">${escapeHtml(`${SITE_CONFIG.address.cityState} · ${SITE_CONFIG.address.serviceArea}`)}</p>
      <p class="footer-contact" style="font-size:13px;color:${EMAIL_BRAND.textMuted};margin:5px 0;">Phone: <a href="${SITE_CONFIG.phoneHref}" style="color:${EMAIL_BRAND.text};text-decoration:none;">${escapeHtml(SITE_CONFIG.phone)}</a></p>
      <p class="footer-contact" style="font-size:13px;color:${EMAIL_BRAND.textMuted};margin:5px 0;">Text: <a href="${SITE_CONFIG.phoneSmsHref}" style="color:${EMAIL_BRAND.text};text-decoration:none;">${escapeHtml(SITE_CONFIG.phone)}</a></p>
      <p class="footer-contact" style="font-size:13px;color:${EMAIL_BRAND.textMuted};margin:5px 0;">Email: <a href="mailto:${escapeHtml(SITE_CONFIG.email)}" style="color:${EMAIL_BRAND.text};text-decoration:none;">${escapeHtml(SITE_CONFIG.email)}</a></p>
      <p class="footer-contact" style="font-size:13px;color:${EMAIL_BRAND.textMuted};margin:5px 0;">Web: <a href="${SITE_BASE_URL}" style="color:${EMAIL_BRAND.text};text-decoration:none;">${escapeHtml(SITE_BASE_URL.replace(/^https?:\/\//, ""))}</a></p>
    </div>
  `;
}

export function wrapEmailHtml(options: {
  title: string;
  subtitle?: string;
  content: string;
}): string {
  const { title, subtitle, content } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <style>${emailStyles}</style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.bg};color:${EMAIL_BRAND.text};">
  <div class="email-wrapper" style="max-width:600px;margin:0 auto;background-color:${EMAIL_BRAND.surface};">
    <div class="header" style="background-color:${EMAIL_BRAND.bg};padding:36px 30px 28px;text-align:center;border-bottom:1px solid ${EMAIL_BRAND.hairline};">
      ${buildLogoImage()}
      <h1 style="margin:20px 0 0 0;font-family:'Fraunces',Georgia,serif;font-size:26px;font-weight:400;color:${EMAIL_BRAND.text};">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="margin:8px 0 0 0;font-size:14px;color:${EMAIL_BRAND.textMuted};">${escapeHtml(subtitle)}</p>` : ""}
    </div>
    <div class="content" style="padding:36px 30px;background-color:${EMAIL_BRAND.surface};color:${EMAIL_BRAND.text};">
      ${content}
    </div>
    ${buildEmailFooter()}
  </div>
</body>
</html>`;
}

/** Canonical address for all outbound mail and internal notifications */
export const PLATFORM_EMAIL = SITE_CONFIG.email;

export async function getAdminRecipientEmails(
  _fallbackEmail?: string
): Promise<string[]> {
  return [PLATFORM_EMAIL];
}

export function formatFromAddress(_fromEmail?: string): string {
  return `${SITE_CONFIG.name} <${PLATFORM_EMAIL}>`;
}

export function getReplyToAddress(): string {
  return PLATFORM_EMAIL;
}
