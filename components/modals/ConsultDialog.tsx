"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HeroConversion, type AttachedEstimatePayload } from "@/components/approved/HeroConversion";
import type { StoredEstimate } from "@/shared/estimateEngine";
import { FINISH_LABELS, PROJECT_LABELS, formatPlanningCurrency } from "@/shared/estimateEngine";

/**
 * The planning range the estimator left in this tab (sessionStorage "brc_estimate"), read the
 * way the long consultation form read it: only a finished range counts, a new range re-attaches
 * itself, and it is attached by default with one tap to remove it.
 */
function useCarriedEstimate() {
  const [estimate, setEstimate] = useState<StoredEstimate | null>(null);
  const [attached, setAttached] = useState(true);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    function load() {
      try {
        const raw = sessionStorage.getItem("brc_estimate");
        if (!raw) {
          lastKey.current = null;
          setEstimate(null);
          return;
        }
        const parsed: StoredEstimate = JSON.parse(raw);
        // Defensive: never surface a range the visitor did not finish building.
        if (!parsed.project || !parsed.finish || !parsed.sqft || !parsed.priceLow) return;
        const key = `${parsed.project}|${parsed.finish}|${parsed.sqft}|${parsed.priceLow}|${parsed.priceHigh}|${parsed.confidenceLabel}`;
        if (key === lastKey.current) return;
        lastKey.current = key;
        setEstimate(parsed);
        setAttached(true);
      } catch {
        /* storage unavailable or not JSON: nothing to carry */
      }
    }
    load();
    window.addEventListener("brc_estimate_updated", load);
    return () => window.removeEventListener("brc_estimate_updated", load);
  }, []);

  function clear() {
    try {
      sessionStorage.removeItem("brc_estimate");
    } catch {
      /* storage unavailable */
    }
  }

  return { estimate, attached, setAttached, clear };
}

/** The same fields the long consultation form sent; the server recomputes the range from them. */
function estimatePayload(estimate: StoredEstimate): AttachedEstimatePayload {
  return {
    project: estimate.project,
    finish: estimate.finish,
    priceLow: estimate.priceLow,
    priceHigh: estimate.priceHigh,
    roi: estimate.roi,
    confidence: estimate.confidenceLabel,
    sqft: estimate.sqft,
    refinements: estimate.refinements,
    layoutLabel: estimate.layoutLabel,
    upgradeLabels: estimate.upgradeLabels,
  };
}

/**
 * The consultation dialog, loaded by ModalProvider the first time it opens.
 *
 * Owner request, 11 November 2026 (every form short and clear, nothing optional shown until
 * asked for): the dialog shows the same short request as the homepage and the contact page.
 * It used to show the long consultation form (project type, name, phone, required email,
 * required property address, optional note). That form is still in
 * components/ConsultationForm.tsx (variant="full") but no page mounts it. Same
 * /api/consultation pipeline and the same accepted-inquiry tracking; project type and address
 * are offered on step 2, after the request is sent. A planning range carried over from the
 * estimator still rides the request, shown as the removable "Planning range attached" line.
 */
export function ConsultDialog({ open, onClose, onRevise }: { open: boolean; onClose: () => void; onRevise: () => void }) {
  const { estimate, attached, setAttached, clear } = useCarriedEstimate();
  const projectLabel = estimate?.project ? PROJECT_LABELS[estimate.project]?.label : null;
  const finishLabel = estimate?.finish ? FINISH_LABELS[estimate.finish]?.label : null;

  const chip = !estimate ? null : attached ? (
    <div className="fold-estimate" data-testid="estimate-attached">
      <div>
        <p className="fold-estimate-title">Planning range attached</p>
        <p data-testid="text-estimate-summary">
          {[projectLabel, finishLabel, estimate.sqft ? `${estimate.sqft.toLocaleString()} sqft` : null]
            .filter(Boolean)
            .join(", ")}
        </p>
        <p className="fold-estimate-range" data-testid="text-estimate-range">
          {formatPlanningCurrency(estimate.priceLow)} to {formatPlanningCurrency(estimate.priceHigh)}
        </p>
      </div>
      <div className="fold-estimate-actions">
        <button type="button" className="fold-secondary" onClick={() => setAttached(false)} data-testid="button-drop-estimate">
          Remove
        </button>
        <button type="button" className="fold-secondary" onClick={onRevise} data-testid="button-revise-estimate">
          Revise
        </button>
      </div>
    </div>
  ) : (
    <div className="fold-estimate">
      <p data-testid="status-estimate-dropped">Sending without a planning range.</p>
      <button type="button" className="fold-secondary" onClick={() => setAttached(true)} data-testid="button-reattach-estimate">
        Attach it
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto" data-clarity-mask="true">
        <DialogHeader>
          <DialogTitle className="font-sans font-light text-xl text-foreground">
            Schedule your free in-home visit
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            No obligation - we&apos;ll walk your space and give you an honest planning range.
          </DialogDescription>
        </DialogHeader>
        {/* The dialog is a portal on <body>, outside the page shell: this wrapper carries the
            shell classes so the short request looks the same here as on the page. */}
        <div className="approved-shell site-remodeling consult-dialog-form">
          <HeroConversion
            blockId="consult-dialog-form"
            recovery
            showTitle={false}
            intro={chip}
            estimate={estimate && attached ? estimatePayload(estimate) : null}
            onAccepted={clear}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
