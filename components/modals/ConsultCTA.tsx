"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { useModals } from "./modalsContext";
import { trackEvent } from "@/lib/analytics";

interface ConsultCTAProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  onExtraClick?: () => void;
}

/** Pages that already embed the consultation form inline at #consult. */
const PAGES_WITH_INLINE_CONSULT_SECTION = new Set(["/", "/contact"]);

/**
 * Sitewide secondary CTA. On the two pages that already embed the
 * consultation form inline (home, contact) this scrolls to that section;
 * everywhere else it opens the consult modal in place, so the visitor never
 * loses their context (an in-progress estimate, a service page they were
 * reading) to a full navigation just to ask for a visit.
 *
 * Tracked once here rather than at each call site, same reasoning as
 * EstimateCTA - every "Schedule a free visit" click reports through one event
 * regardless of which page it fired from or which branch (anchor vs modal) ran.
 */
export function ConsultCTA({ onExtraClick, children, ...props }: ConsultCTAProps) {
  const pathname = usePathname();
  const { openConsult } = useModals();
  const hasInlineSection = pathname ? PAGES_WITH_INLINE_CONSULT_SECTION.has(pathname) : false;

  if (hasInlineSection) {
    const href = pathname === "/" ? "/#consult" : "#consult";
    return (
      <Button {...props} asChild>
        <a
          href={href}
          onClick={() => {
            trackEvent("secondary_cta_clicked", { location: pathname ?? "", method: "anchor" });
            onExtraClick?.();
          }}
        >
          {children}
        </a>
      </Button>
    );
  }

  return (
    <Button
      {...props}
      onClick={() => {
        trackEvent("secondary_cta_clicked", { location: pathname ?? "", method: "modal" });
        onExtraClick?.();
        openConsult();
      }}
    >
      {children}
    </Button>
  );
}
