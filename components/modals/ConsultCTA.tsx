"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { familyButtonClass } from "@/components/family/Button";
import { useModals } from "./modalsContext";
import { trackEvent } from "@/lib/analytics";

interface ConsultCTAProps {
  onExtraClick?: () => void;
  children: ReactNode;
  className?: string;
  /** Kept so existing call sites compile; the free visit is always a text link. */
  variant?: string;
  size?: string;
  "data-testid"?: string;
}

/** Pages that already embed the consultation form inline at #consult. */
const PAGES_WITH_INLINE_CONSULT_SECTION = new Set(["/", "/contact"]);

/**
 * Sitewide secondary CTA ("Schedule a free visit"). It is never a second filled
 * or outlined button: one primary per group (C5), so the free visit is the
 * family tertiary text link beside "Request a quote". On the two pages that
 * already embed the consultation form inline (home, contact) it scrolls to that
 * section; everywhere else it opens the consult modal in place, so the visitor
 * never loses their context to a full navigation just to ask for a visit.
 *
 * Tracked once here rather than at each call site, same reasoning as
 * EstimateCTA - every "Schedule a free visit" click reports through one event
 * regardless of which page it fired from or which branch (anchor vs modal) ran.
 */
export function ConsultCTA({ onExtraClick, children, className, variant, size, ...rest }: ConsultCTAProps) {
  void variant;
  void size;
  const pathname = usePathname();
  const { openConsult } = useModals();
  const hasInlineSection = pathname ? PAGES_WITH_INLINE_CONSULT_SECTION.has(pathname) : false;
  const cls = familyButtonClass({ variant: "tertiary", className });

  if (hasInlineSection) {
    const href = pathname === "/" ? "/#consult" : "#consult";
    return (
      <a
        {...rest}
        href={href}
        className={cls}
        onClick={() => {
          trackEvent("secondary_cta_clicked", { location: pathname ?? "", method: "anchor" });
          onExtraClick?.();
        }}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      {...rest}
      type="button"
      className={cls}
      onClick={() => {
        trackEvent("secondary_cta_clicked", { location: pathname ?? "", method: "modal" });
        onExtraClick?.();
        openConsult();
      }}
    >
      {children}
    </button>
  );
}
