"use client";

import { useEffect } from "react";

/**
 * Lands a direct visit to a fragment (boiseremodeling.co/#request) on its target in Safari.
 *
 * WebKit has no scroll anchoring, and the root uses `scroll-behavior: smooth`. On a direct
 * entry Safari starts the fragment scroll while web fonts and late layout are still settling,
 * and that smooth scroll can be cancelled part way, leaving the visitor at the top of a long
 * page instead of on the request form. CI caught it: the WebKit direct-entry journey in
 * scripts/test-request-history-browser.mjs timed out with #request never in view.
 *
 * Once the page settles, bring the fragment target into view if it is not already visible.
 * It runs only on mount (a direct load or a Back/Forward remount), never on in-page hash
 * clicks, and stands down as soon as the visitor scrolls, taps or types themselves.
 */
export function HashTargetRecovery() {
  useEffect(() => {
    let id = "";
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (!id) return;

    let done = false;
    const userEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const stop = () => {
      done = true;
    };
    for (const name of userEvents) window.addEventListener(name, stop, { passive: true, capture: true });

    const settle = () => {
      if (done) return;
      const target = document.getElementById(id);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) return;
      target.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    };

    const timers = [150, 600, 1500].map((ms) => window.setTimeout(settle, ms));
    if (document.readyState !== "complete") window.addEventListener("load", settle, { once: true });
    document.fonts?.ready.then(settle).catch(() => {});
    const expiry = window.setTimeout(stop, 2500);

    return () => {
      stop();
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(expiry);
      window.removeEventListener("load", settle);
      for (const name of userEvents) window.removeEventListener(name, stop, { capture: true });
    };
  }, []);

  return null;
}
