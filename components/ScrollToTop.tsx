"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();
  const previousPath = useRef(pathname);

  useLayoutEffect(() => {
    // History traversal owns its saved position. Observe it before the router
    // commits the restored pathname; do not compete with browser restoration.
    const onPopState = () => { previousPath.current = window.location.pathname; };
    window.addEventListener("popstate", onPopState, true);
    return () => window.removeEventListener("popstate", onPopState, true);
  }, []);

  useLayoutEffect(() => {
    // Initial hydration must not move a page the visitor already scrolled or
    // started interacting with. StrictMode replay also keeps the same path.
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (window.location.hash) return;
    // Ordinary route changes still start at the top, before paint rather than
    // in a delayed passive effect that can interrupt a pointer gesture.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
