"use client";

import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { familyButtonClass } from "@/components/family/Button";
import { trackEvent } from "@/lib/analytics";
import { REQUEST_PATH, estimatorHref } from "@/shared/ctaCopy";

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
  /** Estimator project to open on (see ESTIMATOR_PROJECT_BY_SERVICE). Omit to let the visitor choose. */
  project?: string | null;
  /**
   * "estimator" (default) is the central estimator at /instant-estimate.
   * "request" is the short request form at /#request, for pages whose project
   * the estimator cannot price and for the "Request a quote" path to a person.
   */
  destination?: "estimator" | "request";
}

/**
 * Sitewide primary CTA, drawn as the family primary button (components/family/
 * Button: charcoal fill, paper label, accent bar; paper fill on dark grounds).
 * Tracked once here rather than at each of the ~20+ call sites, so every
 * primary click - hero, footer, service pages, result screens - reports through
 * the same event.
 *
 * Owner decision, 13 November 2026: the primary action is the central
 * estimator, "Get an instant estimate" to /instant-estimate, the same place as
 * the header and the bottom bar (FAMILY_BRAND.cta). "Request a quote" keeps its
 * one destination, the short request at /#request (destination="request").
 * Links to the /estimate request page use CTA_PROJECT_DETAILS instead.
 */
export function EstimateCTA({ onExtraClick, children, variant, size, tone = "light", block = false, project = null, destination = "estimator", className, ...props }: EstimateCTAProps) {
  const secondary = /outline/i.test(variant ?? "");
  const pathname = usePathname();
  const href = destination === "request" ? REQUEST_PATH : estimatorHref(project);

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
        trackEvent("primary_cta_clicked", { location: pathname ?? "", destination });
        onExtraClick?.();
      }}
    >
      {children}
    </a>
  );
}
