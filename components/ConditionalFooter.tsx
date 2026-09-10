"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { isPortalPath } from "@/lib/portalRoutes";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (isPortalPath(pathname)) return null;
  // The estimator owns the whole screen as a one-page app; a footer below it
  // would be the one thing on the page that forces a scroll.
  if ((pathname === "/estimate" || pathname === "/estimate/p5-preview")) return null;
  return <Footer />;
}
