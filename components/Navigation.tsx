"use client";
/**
 * Site chrome routing for Boise Remodeling Co. The header and the mobile action
 * bar themselves are the shared family components (components/family/), set up
 * by lib/familyBrand.ts; this file only decides where they render.
 *
 * - Estimator routes: no marketing header or bar. The estimator is a one-page
 *   app with its own brand bar, progress and exit (owner report 2026-09-23).
 * - Portal routes: a plain lockup bar.
 * - The /estimate request wizard keeps the header and owns the bottom of the
 *   screen with its own Back/Next bar, so the family bar stays off it
 *   (FAMILY_BRAND.bar.hiddenOn), as does the RE-10 flow.
 */
import { ApprovedBrand } from "@/components/approved/ApprovedBrand";
import { MobileActionBar } from "@/components/family/MobileActionBar";
import { SiteHeader } from "@/components/family/SiteHeader";
import { isEstimatorPath } from "@/lib/p5/estimatorRoutes";
import { isPortalPath } from "@/lib/portalRoutes";
import { isShortRequestPath } from "@/lib/shortRequestRoutes";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();
  if (isEstimatorPath(pathname)) return null;
  if (isPortalPath(pathname)) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <nav className="container flex h-16 items-center justify-between gap-4 px-6">
          <Link href="/" className="flex h-full min-h-11 items-center" aria-label="Boise Remodeling Co, home">
            <ApprovedBrand />
          </Link>
        </nav>
      </header>
    );
  }
  return <SiteHeader />;
}

/** Rendered after the footer so the bar's clearance spacer sits at the end of the page. */
export function SiteActionBar() {
  const pathname = usePathname();
  if (isEstimatorPath(pathname) || isPortalPath(pathname) || isShortRequestPath(pathname)) return null;
  return <MobileActionBar />;
}
