"use client";

import { useEffect } from "react";

/** The fragments every "Request a quote" and "Schedule a free visit" link lands on. */
const FORM_TARGETS = new Set(["request", "consult"]);

function targetOf(hash: string): HTMLElement | null {
  let id = "";
  try {
    id = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return null;
  }
  return id ? document.getElementById(id) : null;
}

/**
 * The target sits where a fragment jump puts it: its top just under the sticky header (the root's
 * scroll-padding-top), so the form heading and first field are the first thing on screen. A page
 * that cannot scroll that far (the target near the end) counts as landed once it is at the bottom.
 */
function landed(target: HTMLElement): boolean {
  const top = target.getBoundingClientRect().top;
  const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  if (Math.abs(top - padding) <= 6) return true;
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  return atBottom && top >= 0 && top < padding;
}

/**
 * Lands a visit to a fragment (boiseremodeling.co/#request) on its target.
 *
 * Direct entry: WebKit has no scroll anchoring, and the root uses `scroll-behavior: smooth`.
 * On a direct entry Safari starts the fragment scroll while web fonts and late layout are still
 * settling, and that smooth scroll can be cancelled part way, leaving the visitor at the top of a
 * long page instead of on the request form. CI caught it: the WebKit direct-entry journey in
 * scripts/test-request-history-browser.mjs timed out with #request never in view. Once the page
 * settles, bring the fragment target into view if it has not landed. It runs only on mount (a
 * direct load or a Back/Forward remount) and stands down as soon as the visitor scrolls, taps or
 * types themselves.
 *
 * In-page taps (owner request, 1 November 2026: a tap on "Request a quote" lands directly on the
 * form): a link to #request or #consult on this page jumps there instantly instead of running a
 * long smooth scroll that a touch can cancel half way. The browser still performs the fragment
 * navigation itself, so the URL, the history entry and Back/Forward are unchanged.
 */
export function HashTargetRecovery() {
  useEffect(() => {
    const root = document.documentElement;
    let restore = 0;
    const jumpInstantly = () => {
      root.style.scrollBehavior = "auto";
      window.clearTimeout(restore);
      restore = window.setTimeout(() => {
        root.style.scrollBehavior = "";
      }, 600);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
      if (!FORM_TARGETS.has(url.hash.slice(1))) return;
      jumpInstantly();
    };
    const onHashChange = () => {
      const target = targetOf(window.location.hash);
      if (!target || !FORM_TARGETS.has(target.id)) return;
      // A client-side router may scroll after the hash changes; settle on the form either way.
      for (const ms of [0, 120, 400]) {
        window.setTimeout(() => {
          if (!landed(target)) {
            jumpInstantly();
            target.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
          }
        }, ms);
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("hashchange", onHashChange);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("hashchange", onHashChange);
      window.clearTimeout(restore);
      root.style.scrollBehavior = "";
    };
  }, []);

  useEffect(() => {
    if (!targetOf(window.location.hash)) return;

    let done = false;
    const userEvents = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    const stop = () => {
      done = true;
    };
    for (const name of userEvents) window.addEventListener(name, stop, { passive: true, capture: true });

    const settle = () => {
      if (done) return;
      const target = targetOf(window.location.hash);
      if (!target) return;
      if (FORM_TARGETS.has(target.id) ? landed(target) : (() => {
        const rect = target.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight;
      })()) return;
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
