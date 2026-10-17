import type { ReactNode } from "react";
import { EstimateContactBar } from "@/components/estimate/EstimateContactBar";

export default function EstimateLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <EstimateContactBar />
      {children}
    </>
  );
}
