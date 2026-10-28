"use client";

import { usePathname } from "next/navigation";
import { EstimateContactBar } from "@/components/estimate/EstimateContactBar";

/**
 * Nested `/estimate/*` estimator routes keep a compact Call/Text bar.
 * The public `/estimate` short-request wizard owns the screen with site nav
 * and its own Back/Next bar, so this chrome stays off that path.
 */
export function EstimateRouteChrome() {
  const pathname = usePathname();
  if (!pathname || pathname === "/estimate") return null;
  return <EstimateContactBar />;
}
