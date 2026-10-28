"use client";

import { useEffect, useState } from "react";

/** Established C10 design-review keyboard band (px). Never fall back below this. */
const KEYBOARD_FALLBACK_FLOOR_PX = 280;

/**
 * Pixels the on-screen keyboard (or other bottom chrome) currently covers.
 *
 * Fixed/sticky bottom bars are laid out against the *layout* viewport, while
 * the software keyboard shrinks the *visual* viewport. Reading that gap lets
 * callers lift the Back/Next bar (C10) so controls stay reachable.
 *
 * Playwright Chromium phone emulation often focuses a field without shrinking
 * visualViewport. When `data-estimate-keyboard` is set on a phone-width
 * viewport and no VV gap is reported, fall back to a 280px band (never below
 * that floor) so design-review keyboard sims clear the bar at every required
 * short-phone size, including 320×568 and 360×640.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const measure = () => {
      const vv = window.visualViewport;
      const gap = vv ? window.innerHeight - (vv.height + vv.offsetTop) : 0;
      if (gap > 40) {
        setInset(Math.round(gap));
        return;
      }
      const focused = document.body.dataset.estimateKeyboard === "true";
      const phone = window.matchMedia("(max-width: 767px)").matches;
      if (focused && phone) {
        setInset(KEYBOARD_FALLBACK_FLOOR_PX);
        return;
      }
      setInset(0);
    };

    measure();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    vv?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    document.addEventListener("focusin", measure);
    document.addEventListener("focusout", measure);
    const observer = new MutationObserver(measure);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-estimate-keyboard"],
    });
    return () => {
      vv?.removeEventListener("resize", measure);
      vv?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("focusin", measure);
      document.removeEventListener("focusout", measure);
      observer.disconnect();
    };
  }, []);

  return inset;
}
