import type { ReactNode } from "react";
import { EstimateRouteChrome } from "@/components/estimate/EstimateRouteChrome";

export default function EstimateLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EstimateRouteChrome />
      {children}
    </>
  );
}
