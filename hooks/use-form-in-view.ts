"use client";

import { useEffect, useState } from "react";

/** Keep fixed actions clear of forms and optionally the mobile hero. */
export function useFormInView(pathname: string | null, clearMobileHero = false) {
  const [inView, setInView] = useState(clearMobileHero);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0;
        const bottom = top + (viewport?.height ?? window.innerHeight) + 80;
        const protectedContent = [...document.querySelectorAll("main form, [data-p5-estimator], #calculator, #re10-estimator, #plans-estimator")];
        if (clearMobileHero && window.innerWidth < 1024) {
          const hero = document.querySelector("main h1")?.closest("section, header");
          if (hero) protectedContent.push(hero);
        }
        setInView(protectedContent.some((form) => {
          const rect = form.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.bottom > top && rect.top < bottom;
        }));
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    document.addEventListener("focusin", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("focusin", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [pathname, clearMobileHero]);
  return inView;
}
