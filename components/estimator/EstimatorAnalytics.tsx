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
 * it is counted once per page view. The site's accepted-lead helper
 * (trackAcceptedInquiry, lib/inquiryTracking.ts) needs the inquiry id this
 * site's own API issues and then acknowledges it at /api/lead-conversion/ack.
 * The estimator's lead is accepted on p5homeco.com, so there is no such id
 * here. The lead is therefore sent as a plain generate_lead event, labelled
 * instant_estimator. No other estimator event may send a lead.
 */

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";
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
    };
    window.addEventListener(ESTIMATOR_EVENT, onEstimatorEvent);
    return () => window.removeEventListener(ESTIMATOR_EVENT, onEstimatorEvent);
  }, []);

  return null;
}
