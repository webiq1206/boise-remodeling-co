"use client";

/**
 * The P5 family estimator, framed into this site.
 *
 * There is ONE estimator. It lives on p5homeco.com and is the same code,
 * pricing, property lookup and QuickBooks connection for every site in the
 * family. This component only frames it, so a fix or a price change made
 * there reaches this site without a deploy here. Do not copy estimator logic
 * into this repository.
 *
 * What this file does, and nothing more:
 *   - passes the campaign tags and the page the visitor is on, so the lead is
 *     attributed to this site and this page;
 *   - tells the estimator how much room the screen has, so each question fits
 *     the screen with nothing below the fold;
 *   - makes the frame exactly as tall as the estimator's content;
 *   - repeats the estimator's events (started, project selected, completed
 *     and so on) on this page as a "p5-estimator-event" window event, once
 *     each. EstimatorAnalytics.tsx listens and sends them to this site's own
 *     analytics. Nothing is sent to analytics from this file.
 *
 * Keep this file identical across the family sites. Site differences are
 * props.
 */

import { useEffect, useRef, useState } from "react";

const ESTIMATOR_ORIGIN = "https://p5homeco.com";
const CAMPAIGN_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid"];
const EVENT_NAME = /^estimator_[a-z_]{1,40}$/;

/** The detail of the "p5-estimator-event" window event. */
export type EstimatorEventDetail = { name: string; brand: string; project: string };

/** Campaign details this site already remembered for the visit, if it keeps them. */
function remembered(key: string): Record<string, unknown> {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(key) ?? "{}") as unknown;
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export type EstimatorFrameProps = {
  /** This site's id in the estimator: remodeling, construction, handyman or cabinet. */
  brand: string;
  /** Opens straight into one project, for example "kitchen-remodel". Omit to let the visitor choose. */
  project?: string | null;
  /** Accessible name of the frame. */
  title: string;
  /** Height in pixels of this site's sticky header, so a question screen fits under it. */
  headerOffset?: number;
};

export default function EstimatorFrame({ brand, project = null, title, headerOffset = 0 }: EstimatorFrameProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [height, setHeight] = useState(640);

  // The address is built in the browser, because it carries the visitor's
  // campaign tags and the page they are on.
  useEffect(() => {
    const here = new URLSearchParams(window.location.search);
    const query = new URLSearchParams({ brand });
    const chosen = project ?? here.get("project");
    if (chosen && /^[a-z0-9-]{1,40}$/.test(chosen)) query.set("project", chosen);
    // A visitor usually lands on another page first, where the site's analytics
    // bootstrap remembered the campaign for the visit. This page's own address
    // wins; what was remembered fills the gaps.
    const latest = remembered("p5_attribution_latest_v1");
    const first = remembered("p5_attribution_first_v1");
    for (const key of CAMPAIGN_KEYS) {
      const value = here.get(key) ?? (typeof latest[key] === "string" ? (latest[key] as string) : null);
      if (value) query.set(key, value.slice(0, 300));
      if (key !== "fbclid" && typeof first[key] === "string" && first[key]) query.set(`first_${key}`, (first[key] as string).slice(0, 300));
    }
    query.set("landing_page", window.location.pathname.slice(0, 300));
    const referrer = typeof latest.referrer === "string" && latest.referrer ? latest.referrer : document.referrer;
    if (referrer && !referrer.startsWith(window.location.origin)) query.set("referrer", referrer.slice(0, 300));
    setSrc(`${ESTIMATOR_ORIGIN}/estimator/embed?${query.toString()}`);
  }, [brand, project]);

  useEffect(() => {
    let moved = false;
    const room = () => Math.max(480, window.innerHeight - headerOffset);
    const sendRoom = () => frame.current?.contentWindow?.postMessage({ type: "p5-estimator-viewport", height: room() }, ESTIMATOR_ORIGIN);

    const onMessage = (event: MessageEvent) => {
      // Only the estimator, in this frame, is listened to.
      if (event.origin !== ESTIMATOR_ORIGIN || event.source !== frame.current?.contentWindow) return;
      const data = event.data as { type?: unknown; height?: unknown; name?: unknown; project?: unknown } | null;
      if (!data || typeof data !== "object") return;
      if (data.type === "p5-estimator-ready") {
        sendRoom();
      } else if (data.type === "p5-estimator-height" && typeof data.height === "number" && Number.isFinite(data.height)) {
        setHeight(Math.min(20000, Math.max(480, Math.ceil(data.height))));
      } else if (data.type === "p5-estimator-step") {
        // The first step is the page loading: leave the visitor where they are.
        // After that, each new question starts at the top of the frame.
        if (moved && frame.current) {
          const top = frame.current.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
        }
        moved = true;
      } else if (data.type === "p5-estimator" && typeof data.name === "string" && EVENT_NAME.test(data.name)) {
        const detail: EstimatorEventDetail = { name: data.name, brand, project: typeof data.project === "string" ? data.project.slice(0, 40) : "" };
        window.dispatchEvent(new CustomEvent<EstimatorEventDetail>("p5-estimator-event", { detail }));
      }
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("resize", sendRoom);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("resize", sendRoom);
    };
  }, [brand, headerOffset]);

  return (
    <div data-estimator-frame={brand} style={{ width: "100%", minHeight: height }}>
      {src ? (
        <iframe
          ref={frame}
          src={src}
          title={title}
          loading="eager"
          style={{ display: "block", width: "100%", height, border: 0, overflow: "hidden", background: "transparent" }}
        />
      ) : null}
    </div>
  );
}
