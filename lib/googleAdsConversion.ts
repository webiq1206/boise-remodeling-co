import { marketingConsent } from "@/lib/p5/marketingAttribution";
import { extractZip } from "@/shared/addressValidation";

/**
 * Google Ads conversion helpers shared by every lead path on this site.
 *
 * One Google Ads conversion action ("P5 Raw Form Submitted") receives every
 * accepted lead, with a per-lead value so Google Ads can report ROAS by
 * campaign. Values are the per-lead estimates agreed with P5 on 14 Sept 2026
 * (form fallback in Google Ads is $50). Never pass PII here: no names, phones,
 * emails or free text in the conversion params - only a service/project
 * category and an opaque id. Enhanced conversions send a separate user_data
 * set, and only the fields listed in googleAdsUserData.
 */
export const GOOGLE_ADS_ID = "AW-18354188204";
export const GOOGLE_ADS_LEAD_LABEL = "AW-18354188204/LE2vCPXstO8cEKzf-q9E";
/** "P5 Website Call (60s+)": swaps the visible number for a Google forwarding number. */
export const GOOGLE_ADS_WEBSITE_CALL_LABEL = "AW-18354188204/YHR0CIaPz_ccEKzf-q9E";
export const GOOGLE_ADS_PHONE_DISPLAY = "(208) 477-1169";
/** sessionStorage key written by GoogleAnalytics.tsx on the first page view. */
export const ENTRY_PATH_KEY = "p5_entry_path";

export interface LeadContext {
  /** Unified estimator service id (e.g. "re10", "cabinet-install"). */
  service?: string;
  /** Consultation form project type. */
  projectType?: string;
}

export type GoogleAdsLeadParams = {
  send_to: string;
  value: number;
  currency: "USD";
  transaction_id?: string;
};

/** The path the visitor landed on, which is what the ad campaign controls. */
export function readEntryPath(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(ENTRY_PATH_KEY) ?? window.location.pathname;
  } catch {
    return window.location.pathname;
  }
}

/** Per-lead value in USD for this site (brand: remodeling). */
export function googleAdsLeadValue(ctx: LeadContext = {}): number {
  // Remodeling leads: kitchens, baths, whole-home. One value for the campaign.
  void ctx;
  return 200;
}

export function googleAdsLeadParams(
  ctx: LeadContext = {},
  transactionId?: string,
): GoogleAdsLeadParams {
  const params: GoogleAdsLeadParams = {
    send_to: GOOGLE_ADS_LEAD_LABEL,
    value: googleAdsLeadValue(ctx),
    currency: "USD",
  };
  if (transactionId) params.transaction_id = transactionId;
  return params;
}

const sentLeadKeys = new Set<string>();
const pendingLeadKeys = new Set<string>();

/**
 * Fires the Google Ads lead conversion once per dedupe key (per page load and,
 * where storage allows, per browser session). Returns true when it was sent.
 */
export function trackGoogleAdsLeadConversion(ctx: LeadContext = {}, dedupeKey?: string, retryCount=0): boolean {
  if (typeof window === "undefined") return false;
  const storageKey = dedupeKey ? `google_ads_lead:${dedupeKey}` : undefined;
  if (storageKey) {
    if (sentLeadKeys.has(storageKey)) return false;
    try {
      if (window.sessionStorage.getItem(storageKey) === "sent") return false;
    } catch {
      // Storage can be unavailable under strict privacy settings; the in-memory guard still applies.
    }
  }
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") {
    // Only called after an accepted submission. A lazy tag must not lose it.
    if(dedupeKey&&retryCount<20&&!pendingLeadKeys.has(dedupeKey)){
      pendingLeadKeys.add(dedupeKey);
      window.setTimeout(()=>{pendingLeadKeys.delete(dedupeKey);trackGoogleAdsLeadConversion(ctx,dedupeKey,retryCount+1);},500);
    }
    return false;
  }
  if (storageKey) {
    sentLeadKeys.add(storageKey);
    try {
      window.sessionStorage.setItem(storageKey, "sent");
    } catch {
      // Ignore; in-memory guard is enough for this page load.
    }
  }
  applyGoogleAdsUserData(contactFromStoredDraft(dedupeKey));
  gtag("event", "conversion", googleAdsLeadParams(ctx, dedupeKey));
  return true;
}

export interface GoogleAdsLeadContact {
  email?: string;
  phone?: string;
  name?: string;
  postalCode?: string;
}

/** True when the existing tag bootstrap would load Google and consent is not denied. */
export function googleAdsUserDataAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (navigator.webdriver === true) return false;
  try {
    if (window.sessionStorage.getItem("p5_analytics_disabled") === "1") return false;
  } catch {
    /* A blocked store does not by itself stop the tag. */
  }
  const host = window.location?.hostname?.toLowerCase() ?? "";
  if (host !== "boiseremodeling.co" && host !== "www.boiseremodeling.co") return false;
  return marketingConsent() !== "denied";
}

/** Fields the advertising tag may receive. Street address and free text never qualify. */
export function googleAdsUserData(contact: GoogleAdsLeadContact = {}): Record<string, string | Record<string, string>> | null {
  const payload: Record<string, string | Record<string, string>> = {};
  const email = (contact.email ?? "").trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) payload.email = email;
  const digits = (contact.phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) payload.phone_number = `+1${digits}`;
  const address: Record<string, string> = {};
  const parts = (contact.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts[0]) address.first_name = parts[0];
  if (parts.length > 1) address.last_name = parts.slice(1).join(" ");
  const postal = (contact.postalCode ?? "").trim();
  if (/^\d{5}(?:-\d{4})?$/.test(postal)) address.postal_code = postal;
  if (Object.keys(address).length > 0) {
    address.country = "US";
    payload.address = address;
  }
  return Object.keys(payload).length > 0 ? payload : null;
}

export function applyGoogleAdsUserData(contact?: GoogleAdsLeadContact | null): boolean {
  if (!contact || !googleAdsUserDataAllowed()) return false;
  const payload = googleAdsUserData(contact);
  if (!payload) return false;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return false;
  try {
    gtag("set", "user_data", payload);
  } catch {
    return false;
  }
  return true;
}

function contactFromStoredDraft(dedupeKey?: string): GoogleAdsLeadContact | undefined {
  if (!dedupeKey || (!dedupeKey.startsWith("estimator:") && !dedupeKey.startsWith("intake:"))) return;
  let storage: Storage;
  try {
    storage = window.localStorage;
  } catch {
    return;
  }
  if (!storage) return;
  const estimatorId = dedupeKey.startsWith("estimator:") ? dedupeKey.slice("estimator:".length) : "";
  const intakeId = dedupeKey.startsWith("intake:") ? dedupeKey.slice("intake:".length) : "";
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith("p5-project-draft-v2") || key.endsWith(":recovery-v1")) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      const value = JSON.parse(raw) as {
        id?: unknown;
        contact?: { name?: unknown; email?: unknown; phone?: unknown };
        answers?: Record<string, unknown>;
        intake?: { projectId?: unknown };
      };
      const projectId = typeof value.intake?.projectId === "string" ? value.intake.projectId : "";
      const matches = (estimatorId && value.id === estimatorId) || (intakeId && projectId === intakeId);
      if (!matches) continue;
      const address = typeof value.answers?.address === "string" ? value.answers.address : "";
      const location = typeof value.answers?.location === "string" ? value.answers.location : "";
      return {
        name: typeof value.contact?.name === "string" ? value.contact.name : "",
        email: typeof value.contact?.email === "string" ? value.contact.email : "",
        phone: typeof value.contact?.phone === "string" ? value.contact.phone : "",
        postalCode: extractZip(address) || extractZip(location),
      };
    }
  } catch {
    return;
  }
  return;
}
