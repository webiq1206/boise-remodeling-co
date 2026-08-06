"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { isPortalPath } from "@/lib/portalRoutes";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (isPortalPath(pathname)) return null;
  return <Footer />;
}
