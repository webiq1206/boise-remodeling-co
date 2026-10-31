"use client";

import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { familyButtonClass } from "@/components/family/Button";
import { trackEvent } from "@/lib/analytics";

interface EstimateCTAProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick"> {
  onExtraClick?: () => void;
  children: ReactNode;
  /** Old variant names map onto the family set: any outline variant is the
      secondary (outline) button, everything else the primary. */
  variant?: string;
  /** "lg" is the 48px button (bands, heroes); everything else is the 44px default. */
  size?: "lg" | "md" | "sm" | "default" | "icon" | null;
  /** "dark" on charcoal grounds: the paper-filled primary with the accent bar. */
  tone?: "light" | "dark";
  /** Full width on phones, natural width from 640px. */
  block?: boolean;
}

/**
 * Sitewide primary CTA, drawn as the family primary button (components/family/
 * Button: charcoal fill, paper label, accent bar; paper fill on dark grounds).
 * Tracked once here rather than at each of the ~20+ call sites, so every
 * "Request a quote" click - nav, hero, footer, service pages, result screens -
 * reports through the same event.
 */
export function EstimateCTA({ onExtraClick, children, variant, size, tone = "light", block = false, className, ...props }: EstimateCTAProps) {
  const secondary = /outline/i.test(variant ?? "");
  const pathname = usePathname();
  const href = pathname === "/" ? "/#request" : "/estimate";

  return (
    <a
      {...props}
      href={href}
      className={familyButtonClass({
        variant: secondary ? "secondary" : tone === "dark" ? "hero" : "primary",
        tone,
        size: size === "lg" ? "lg" : "md",
        className: [block ? "fam-btn--block-phone" : "", className ?? ""].filter(Boolean).join(" "),
      })}
      onClick={() => {
        trackEvent("primary_cta_clicked", { location: pathname ?? "" });
        onExtraClick?.();
      }}
    >
      {children}
    </a>
  );
}
