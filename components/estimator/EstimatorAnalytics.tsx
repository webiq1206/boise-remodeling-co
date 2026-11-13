"use client";

/**
 * Sends the framed estimator's events to this site's own analytics.
 *
 * EstimatorFrame.tsx repeats each estimator event on this page as a
 * "p5-estimator-event" window event. This component listens for it and reports
 * every one through trackEvent (lib/analytics.ts), with the brand and the
 * project the visitor chose. It renders nothing.
 *
 * The lead: "estimator_completed" is the only event that counts as a lead, and
 * it is counted once per page view. It sends three things:
 *   - the Google Ads lead conversion, through trackGoogleAdsLeadConversion
 *     (owner, 13 November 2026), so an estimator lead reaches Google Ads like
 *     a form lead and like the other family sites;
 *   - a GA4 generate_lead event, labelled instant_estimator;
 *   - the Meta Lead event (Pixel and Conversions API, deduplicated by one
 *     event id), so Meta campaigns for the instant estimate can optimize for
 *     finished estimates (owner, 13 November 2026). It carries a project
 *     category only, never contact details.
 * The site's form helper (trackAcceptedInquiry, lib/inquiryTracking.ts) is not
 * used: it needs the inquiry id this site's own API issues and acknowledges it
 * at /api/lead-conversion/ack, and the estimator's lead is accepted on
 * p5homeco.com. The conversion is keyed by an id made in the browser instead.
 * The key starts "instant:" so the Ads helper does not add a second
 * generate_lead of its own. No other estimator event may send a lead.
 */

import { useEffect, useRef } from "react";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { trackGoogleAdsLeadConversion } from "@/lib/googleAdsConversion";
import type { EstimatorEventDetail } from "./EstimatorFrame";

const ESTIMATOR_EVENT = "p5-estimator-event";
const EVENT_NAME = /^estimator_[a-z_]{1,40}$/;
const LEAD_EVENT = "estimator_completed";
const ESTIMATOR_LEAD_SOURCE = "instant_estimator";

export default function EstimatorAnalytics() {
  const leadSent = useRef(false);

  useEffect(() => {
    const onEstimatorEvent = (event: Event) => {
      const detail = (event as CustomEvent<EstimatorEventDetail>).detail;
      if (!detail || typeof detail.name !== "string" || !EVENT_NAME.test(detail.name)) return;
      const params = {
        estimator_brand: typeof detail.brand === "string" ? detail.brand : "",
        estimator_project: typeof detail.project === "string" ? detail.project : "",
      };
      trackEvent(detail.name, params);
      if (detail.name !== LEAD_EVENT || leadSent.current) return;
      leadSent.current = true;
      trackEvent("generate_lead", {
        lead_source: ESTIMATOR_LEAD_SOURCE,
        project_type: params.estimator_project || "unknown",
        ...params,
      });
      // No personal details: a project category and an opaque id only.
      const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      trackGoogleAdsLeadConversion({ projectType: params.estimator_project || undefined }, `instant:${id}`);
      trackMetaEvent(
        "Lead",
        { content_name: params.estimator_project || "unknown", content_category: ESTIMATOR_LEAD_SOURCE },
        undefined,
        `instant:${id}`,
      );
    };
    window.addEventListener(ESTIMATOR_EVENT, onEstimatorEvent);
    return () => window.removeEventListener(ESTIMATOR_EVENT, onEstimatorEvent);
  }, []);

  return null;
}
