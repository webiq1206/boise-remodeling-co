"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { RegistrationLine, registrationPresentation } from "@/components/RegistrationLine";
import { isEstimatorPath } from "@/lib/p5/estimatorRoutes";
import { isShortRequestPath } from "@/lib/shortRequestRoutes";
import { isPortalPath } from "@/lib/portalRoutes";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (isPortalPath(pathname)) return null;
  // The estimator owns the screen. The marketing footer stays off it. The
  // registration line is a fixed strip the frame measures and sits above, so
  // the words stay visible and are not covered.
  if (isEstimatorPath(pathname)) {
    return (
      <div
        data-registration-footer
        className="fixed inset-x-0 bottom-0 z-[96] overflow-visible bg-inverse px-4 pt-3 text-center text-xs leading-5 text-inverse-muted"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <RegistrationLine plain />
      </div>
    );
  }
  // Public /estimate short-request wizard owns the viewport; hide marketing footer.
  if (isShortRequestPath(pathname)) return null;
  return <Footer hideRegistration={registrationPresentation(pathname) === "hidden"} />;
}
