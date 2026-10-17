/**
 * Google Ads conversion helpers shared by the form and the estimator.
 *
 * "P5 Raw Form Submitted" receives a real accepted inquiry, with a per-lead
 * value so Google Ads can report ROAS by campaign. Values are the per-lead
 * estimates agreed with P5 on 14 Sept 2026 (form fallback in Google Ads is $50).
 * "P5 Estimator Completed" is a separate secondary action for finishing the
 * estimator. Never pass PII here: no names, phones, emails or free text - only
 * a service/project category and an opaque id.
 */
export const GOOGLE_ADS_ID = "AW-18354188204";
export const GOOGLE_ADS_LEAD_LABEL = "AW-18354188204/LE2vCPXstO8cEKzf-q9E";
/** "P5 Estimator Completed" (conversion action 7851740531). */
export const GOOGLE_ADS_ESTIMATOR_LABEL = "AW-18354188204/cEzmCPOagKAdEKzf-q9E";
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

export function googleAdsEstimatorParams(
  ctx: LeadContext = {},
  transactionId?: string,
): GoogleAdsLeadParams {
  const params: GoogleAdsLeadParams = {
    send_to: GOOGLE_ADS_ESTIMATOR_LABEL,
    value: googleAdsLeadValue(ctx),
    currency: "USD",
  };
  if (transactionId) params.transaction_id = transactionId;
  return params;
}

/**
 * Inquiry id only when this payload is a conversion-eligible accepted lead.
 * An estimator receipt is accepted without being that lead, so it stays blank.
 */
export function acceptedInquiryId(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { accepted?: unknown; conversionEligible?: unknown; inquiryId?: unknown };
  if (row.accepted !== true || row.conversionEligible !== true) return undefined;
  if (typeof row.inquiryId !== "string" || row.inquiryId.length === 0) return undefined;
  return row.inquiryId;
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
  gtag("event", "conversion", googleAdsLeadParams(ctx, dedupeKey));
  return true;
}

const sentEstimatorKeys = new Set<string>();
/** Same bound as trackAcceptedInquiry: 10 attempts, 500ms apart (5s). */
const ESTIMATOR_GTAG_RETRY_ATTEMPTS = 10;
const ESTIMATOR_GTAG_RETRY_MS = 500;

/**
 * Fires "P5 Estimator Completed" once per estimator dedupe key.
 * When this completion also created a conversion-eligible lead, the form
 * label is fired too, once per lead id, through trackGoogleAdsLeadConversion.
 */
export function trackGoogleAdsEstimatorConversion(
  ctx: LeadContext = {},
  dedupeKey?: string,
  leadId?: string,
  retryCount = 0,
): boolean {
  if (typeof window === "undefined") return false;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") {
    const pendingKey = `estimator:${dedupeKey ?? leadId ?? ""}`;
    if ((dedupeKey || leadId) && retryCount < ESTIMATOR_GTAG_RETRY_ATTEMPTS && !pendingLeadKeys.has(pendingKey)) {
      pendingLeadKeys.add(pendingKey);
      window.setTimeout(() => {
        pendingLeadKeys.delete(pendingKey);
        trackGoogleAdsEstimatorConversion(ctx, dedupeKey, leadId, retryCount + 1);
      }, ESTIMATOR_GTAG_RETRY_MS);
    }
    return false;
  }
  const storageKey = dedupeKey ? `google_ads_estimator:${dedupeKey}` : undefined;
  let estimatorSent = false;
  if (!storageKey || !sentEstimatorKeys.has(storageKey)) {
    let already = false;
    if (storageKey) {
      try {
        already = window.sessionStorage.getItem(storageKey) === "sent";
      } catch {
        already = false;
      }
    }
    if (!already) {
      if (storageKey) {
        sentEstimatorKeys.add(storageKey);
        try {
          window.sessionStorage.setItem(storageKey, "sent");
        } catch {
          // Ignore; in-memory guard is enough for this page load.
        }
      }
      gtag("event", "conversion", googleAdsEstimatorParams(ctx, dedupeKey));
      estimatorSent = true;
    }
  }
  const leadSent = leadId ? trackGoogleAdsLeadConversion(ctx, leadId) : false;
  return estimatorSent || leadSent;
}
