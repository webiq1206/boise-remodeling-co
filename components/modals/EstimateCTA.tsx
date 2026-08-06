"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface EstimateCTAProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  onExtraClick?: () => void;
}

/**
 * Sitewide primary CTA. Tracked once here rather than at each of the ~20+
 * call sites, so every "Get an estimate" click - nav, hero, footer, service
 * pages, result screens - reports through the same event.
 */
export function EstimateCTA({ onExtraClick, children, ...props }: EstimateCTAProps) {
  const pathname = usePathname();
  const href = pathname === "/" ? "/#calculator" : "/estimate";

  return (
    <Button {...props} asChild>
      <a
        href={href}
        onClick={() => {
          trackEvent("primary_cta_clicked", { location: pathname ?? "" });
          onExtraClick?.();
        }}
      >
        {children}
      </a>
    </Button>
  );
}
