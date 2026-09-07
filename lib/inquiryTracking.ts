"use client";

import { trackEvent, trackMetaEvent } from "@/lib/analytics";

const INQUIRY_ID_KEY = "brc_inquiry_id";
const INQUIRY_STARTED_KEY = "brc_inquiry_started_at";
const CONVERSION_KEY_PREFIX = "brc_lead_conversion_";
const INQUIRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const INQUIRY_ROTATED_EVENT = "brc_inquiry_rotated";

export interface AcceptedInquiryResponse {
  accepted: true;
  inquiryId: string;
  duplicate: boolean;
  conversionEligible: boolean;
  delivery: "sent" | "pending_retry";
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function getOrCreateInquiryId(): string {
  if (typeof window === "undefined") return createId();
  try {
    const existing = window.localStorage.getItem(INQUIRY_ID_KEY);
    const startedAt = Number(window.localStorage.getItem(INQUIRY_STARTED_KEY));
    if (
      existing &&
      (!Number.isFinite(startedAt) || startedAt <= 0 || Date.now() - startedAt < INQUIRY_MAX_AGE_MS)
    ) {
      if (!startedAt) window.localStorage.setItem(INQUIRY_STARTED_KEY, String(Date.now()));
      return existing;
    }
    const id = createId();
    window.localStorage.setItem(INQUIRY_ID_KEY, id);
    window.localStorage.setItem(INQUIRY_STARTED_KEY, String(Date.now()));
    return id;
  } catch {
    const existing = window.sessionStorage.getItem(INQUIRY_ID_KEY);
    if (existing) return existing;
    const id = createId();
    window.sessionStorage.setItem(INQUIRY_ID_KEY, id);
    window.sessionStorage.setItem(INQUIRY_STARTED_KEY, String(Date.now()));
    return id;
  }
}

/** Prepares a fresh id for the next project inquiry after this one is complete. */
export function rotateInquiryId(): string {
  const id = createId();
  if (typeof window === "undefined") return id;
  try {
    window.localStorage.setItem(INQUIRY_ID_KEY, id);
    window.localStorage.setItem(INQUIRY_STARTED_KEY, String(Date.now()));
  } catch {
    window.sessionStorage.setItem(INQUIRY_ID_KEY, id);
    window.sessionStorage.setItem(INQUIRY_STARTED_KEY, String(Date.now()));
  }
  window.dispatchEvent(new CustomEvent(INQUIRY_ROTATED_EVENT, { detail: { inquiryId: id } }));
  return id;
}

/**
 * Emits one new-lead signal for one durably accepted inquiry.
 *
 * Server conversionEligible is authoritative. The browser marker prevents a
 * repeat on the same device, while the Google transaction_id and Meta eventID
 * give the advertising platforms the same stable dedupe key across callbacks.
 * No name, email, phone or address is sent.
 */
export function trackAcceptedInquiry(
  response: AcceptedInquiryResponse,
  projectType: string,
  retryCount = 0,
): void {
  if (!response.conversionEligible || typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  // Do not burn the browser marker before the analytics library is ready.
  // A short retry covers lazy loading without blocking the success UI.
  if (typeof gtag !== "function") {
    if (retryCount < 10) {
      window.setTimeout(() => trackAcceptedInquiry(response, projectType, retryCount + 1), 500);
    }
    return;
  }

  const marker = `${CONVERSION_KEY_PREFIX}${response.inquiryId}`;
  try {
    if (window.localStorage.getItem(marker)) {
      acknowledgeConversion(response.inquiryId);
      return;
    }
    window.localStorage.setItem(marker, "1");
  } catch {
    if (window.sessionStorage.getItem(marker)) {
      acknowledgeConversion(response.inquiryId);
      return;
    }
    window.sessionStorage.setItem(marker, "1");
  }

  trackEvent("generate_lead", {
    project_type: projectType,
    inquiry_id: response.inquiryId,
    event_id: response.inquiryId,
  });
  trackEvent("conversion", {
    send_to: "AW-18354188204/LE2vCPXstO8cEKzf-q9E",
    transaction_id: response.inquiryId,
  });
  trackMetaEvent(
    "Lead",
    { content_name: projectType, content_category: "project_inquiry" },
    undefined,
    response.inquiryId,
  );
  acknowledgeConversion(response.inquiryId);
}

function acknowledgeConversion(inquiryId: string): void {
  try {
    fetch("/api/lead-conversion/ack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ inquiryId }),
    }).catch(() => {});
  } catch {
    /* A later safe retry can acknowledge the same stable conversion id. */
  }
}