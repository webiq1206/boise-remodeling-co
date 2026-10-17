/**
 * Google Ads conversion helpers shared by the form and the estimator.
 *
 * "P5 Raw Form Submitted" receives a real accepted lead, with a per-lead
 * value so Google Ads can report ROAS by campaign. Values are the per-lead
 * estimates agreed with P5 on 14 Sept 2026 (form fallback in Google Ads is $50).
 * Finishing the estimator submits a lead too, so an intake: or estimator: key
 * also sends "P5 Estimator Completed". Never pass PII here: no names, phones,
 * emails or free text - only a service/project category and an opaque id.
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

const sentLeadKeys = new Set<string>();
const pendingLeadKeys = new Set<string>();

/** Ten half-second checks: about five seconds for a lazy gtag, then give up. */
export const GTAG_READY_WAIT_MS = 500;
export const GTAG_READY_ATTEMPTS = 10;

/** Shared estimator finishes. The component stays on trackGoogleAdsLeadConversion. */
export function isEstimatorCompletionKey(dedupeKey?: string): boolean {
  return !!dedupeKey && (dedupeKey.startsWith("intake:") || dedupeKey.startsWith("estimator:"));
}

function alreadySent(storageKey?: string): boolean {
  if (!storageKey) return false;
  if (sentLeadKeys.has(storageKey)) return true;
  try {
    return window.sessionStorage.getItem(storageKey) === "sent";
  } catch {
    return false;
  }
}

function markSent(storageKey?: string): void {
  if (!storageKey) return;
  sentLeadKeys.add(storageKey);
  try {
    window.sessionStorage.setItem(storageKey, "sent");
  } catch {
    // Storage can be unavailable under strict privacy settings; the in-memory guard still applies.
  }
}

type ConversionDispatch = {
  storageKey?: string;
  params: GoogleAdsLeadParams;
};

function dispatchesFor(ctx: LeadContext, dedupeKey?: string): ConversionDispatch[] {
  if (isEstimatorCompletionKey(dedupeKey)) {
    return [
      { storageKey: `google_ads_estimator:${dedupeKey}`, params: googleAdsEstimatorParams(ctx, dedupeKey) },
      { storageKey: `google_ads_lead:${dedupeKey}`, params: googleAdsLeadParams(ctx, dedupeKey) },
    ];
  }
  return [{ storageKey: dedupeKey ? `google_ads_lead:${dedupeKey}` : undefined, params: googleAdsLeadParams(ctx, dedupeKey) }];
}

/**
 * Fires Google Ads conversions once per dedupe key (per page load and, where
 * storage allows, per browser session). An intake: or estimator: key is an
 * estimator finish that also submits a lead, so it sends both labels with
 * transaction_id set to that key. Any other key is a consultation inquiry and
 * sends the form label only. A missing gtag retries for about five seconds.
 * Returns true when at least one conversion was sent.
 */
export function trackGoogleAdsLeadConversion(ctx: LeadContext = {}, dedupeKey?: string, retryCount = 0): boolean {
  if (typeof window === "undefined") return false;
  const pending = dispatchesFor(ctx, dedupeKey).filter((item) => !alreadySent(item.storageKey));
  if (pending.length === 0) return false;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") {
    if (dedupeKey && retryCount < GTAG_READY_ATTEMPTS && !pendingLeadKeys.has(dedupeKey)) {
      pendingLeadKeys.add(dedupeKey);
      window.setTimeout(() => {
        pendingLeadKeys.delete(dedupeKey);
        trackGoogleAdsLeadConversion(ctx, dedupeKey, retryCount + 1);
      }, GTAG_READY_WAIT_MS);
    }
    return false;
  }
  let sent = false;
  for (const item of pending) {
    markSent(item.storageKey);
    try {
      gtag("event", "conversion", item.params);
      sent = true;
    } catch {
      // A thrown tag must not break the submission that already succeeded.
    }
  }
  return sent;
}
