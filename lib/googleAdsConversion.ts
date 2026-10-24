import { marketingConsent } from "@/lib/p5/marketingAttribution";

/**
 * Google Ads conversion helpers shared by every lead path on this site.
 *
 * The consultation form fires "P5 Raw Form Submitted". Estimator intake and
 * estimator completion fire the estimator action instead, with a per-lead
 * value so Google Ads can report ROAS by campaign. Values are the per-lead
 * estimates agreed with P5 on 14 Sept 2026 (form fallback in Google Ads is
 * $50). Never pass PII here: no names, phones, emails or free text - only a
 * service/project category and an opaque id.
 */
export const GOOGLE_ADS_ID = "AW-18354188204";
export const GOOGLE_ADS_LEAD_LABEL = "AW-18354188204/LE2vCPXstO8cEKzf-q9E";
/** Estimator completion, Google Ads action 7851740531. */
export const GOOGLE_ADS_ESTIMATOR_LABEL = "AW-18354188204/cEzmCPOagKAdEKzf-q9E";
/** "P5 Website Call (60s+)": swaps the visible number for a Google forwarding number. */
export const GOOGLE_ADS_WEBSITE_CALL_LABEL = "AW-18354188204/YHR0CIaPz_ccEKzf-q9E";
export const GOOGLE_ADS_PHONE_DISPLAY = "(208) 477-1169";
/** Click on a tel: link. Separate from the forwarding-number call conversion. */
export const GOOGLE_ADS_CALL_CLICK_LABEL = "AW-18354188204/ng9fCPiOhaAdEKzf-q9E";
/** Click on an sms: link. */
export const GOOGLE_ADS_TEXT_CLICK_LABEL = "AW-18354188204/lTxsCOqahaAdEKzf-q9E";
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
  sendTo: string = GOOGLE_ADS_LEAD_LABEL,
): GoogleAdsLeadParams {
  const params: GoogleAdsLeadParams = {
    send_to: sendTo,
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
  gtag("event", "conversion", googleAdsLeadParams(ctx, dedupeKey, GOOGLE_ADS_ESTIMATOR_LABEL));
  return true;
}

const clickedEvents = new WeakSet<object>();

/** Same gates as the Google tag bootstrap, plus a denied marketing consent. */
function googleTagAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.webdriver === true) return false;
  try {
    if (window.sessionStorage?.getItem("p5_analytics_disabled") === "1") return false;
  } catch {
    /* A blocked store does not by itself stop the tag. */
  }
  const host = window.location?.hostname?.toLowerCase() ?? "";
  if (host !== "boiseremodeling.co" && host !== "www.boiseremodeling.co") return false;
  return marketingConsent() !== "denied";
}

export function trackGoogleAdsContactClick(method: "call" | "text", retryCount = 0): boolean {
  if (!googleTagAllowed()) return false;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") {
    if (retryCount < 10) {
      window.setTimeout(() => trackGoogleAdsContactClick(method, retryCount + 1), 500);
    }
    return false;
  }
  gtag("event", "conversion", {
    send_to: method === "call" ? GOOGLE_ADS_CALL_CLICK_LABEL : GOOGLE_ADS_TEXT_CLICK_LABEL,
  });
  return true;
}

/** Staff tools are not ad traffic. A forwarding number is still a tel: tap. */
function publicContactSurface(): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location?.pathname || "/";
  if (path === "/admin" || path.startsWith("/admin/")) return false;
  if (path === "/portal" || path.startsWith("/portal/")) return false;
  return true;
}

/** One Ads conversion per click event. Any tel: or sms: link counts. The number is not compared, because a Google forwarding number replaces the business number. A later click is a new event and fires again. */
export function trackDelegatedContactClick(event: { target: EventTarget | null }): void {
  if (!event || clickedEvents.has(event)) return;
  const target = event.target as { closest?: (selector: string) => { getAttribute?: (name: string) => string | null } | null } | null;
  const href = target?.closest?.("a[href]")?.getAttribute?.("href") || "";
  const method = href.startsWith("tel:") ? "call" : href.startsWith("sms:") ? "text" : null;
  if (!method || !publicContactSurface()) return;
  clickedEvents.add(event);
  trackGoogleAdsContactClick(method);
}
