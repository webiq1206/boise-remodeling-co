"use client";

import { useEffect, useState } from "react";

/** Keep the fixed navigation action clear of visible form fields. */
export function useFormInView(pathname: string | null) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const top = viewport?.offsetTop ?? 0;
        const bottom = top + (viewport?.height ?? window.innerHeight) + 80;
        setInView([...document.querySelectorAll("main form")].some((form) => {
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
  }, [pathname]);
  return inView;
}
