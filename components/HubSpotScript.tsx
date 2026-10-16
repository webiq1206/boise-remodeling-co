"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isEstimatorPath } from "@/lib/p5/estimatorRoutes";
import { isPortalPath } from "@/lib/portalRoutes";

/**
 * Public P5 Home Co HubSpot portal. Portal IDs are public; this is the same
 * account p5homeco.com already loads. lazyOnload injects the script after the
 * window load event, so tracking stays and the file is off the LCP path.
 * Admin, portal, and estimator screens are not marketing pages.
 */
const HUBSPOT_PORTAL_ID = "247066159";

export function HubSpotScript() {
  const pathname = usePathname();
  if (process.env.NODE_ENV !== "production") return null;
  if (isPortalPath(pathname) || isEstimatorPath(pathname) || pathname?.startsWith("/admin")) return null;
  return (
    <Script
      id="hs-script-loader"
      src={`https://js-na2.hs-scripts.com/${HUBSPOT_PORTAL_ID}.js`}
      strategy="lazyOnload"
    />
  );
}
