"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { requestHideMobileNavBar } from "@/lib/mobileNavBar";
import { ModalsContext, type ModalType } from "./modalsContext";

// Both modals load on first open. Every page mounts this provider, so a static
// import put the dialog, the consultation form and its validation code into
// the startup JavaScript of pages that never open either one.
const ConsultDialog = dynamic(() => import("./ConsultDialog").then((m) => m.ConsultDialog), { ssr: false });
const EstimateCalculator = dynamic(() => import("@/components/EstimateCalculator").then((m) => m.EstimateCalculator), { ssr: false });

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<ModalType>(null);
  // Stays mounted after the first open so the dialog keeps its close animation.
  const [consultMounted, setConsultMounted] = useState(false);

  const openConsult = useCallback(() => {
    setConsultMounted(true);
    setOpen("consult");
  }, []);
  const openEstimate = useCallback(() => setOpen("estimate"), []);
  const close = useCallback(() => setOpen(null), []);
  const revise = useCallback(() => setOpen("estimate"), []);

  // The global mobile Call/Text bar sits above the dialog overlay; hide it
  // while a conversion modal is open so it never covers the dialog. Ref-counted
  // so it can't fight the inline estimate bar over the same flag.
  useEffect(() => {
    if (open === null) return;
    return requestHideMobileNavBar();
  }, [open]);

  return (
    <ModalsContext.Provider value={{ openConsult, openEstimate, close }}>
      {children}

      {consultMounted && <ConsultDialog open={open === "consult"} onClose={close} onRevise={revise} />}

      {/* The estimator is its own full-screen experience beneath the site
          header (not a dialog inside a dialog): it owns the screen with its
          own scroll area and bottom-anchored input, and Exit returns here. */}
      {open === "estimate" && (
        <div data-clarity-mask="true" style={{ display: "contents" }}>
          <EstimateCalculator inModal sectionId="estimate-modal" onExit={close} onBookVisit={openConsult} />
        </div>
      )}
    </ModalsContext.Provider>
  );
}
