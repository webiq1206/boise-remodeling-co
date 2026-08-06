"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface NavEstimateButtonProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  /** Plain anchor styling for mobile sticky bar text links. */
  asLink?: boolean;
  className?: string;
  children: React.ReactNode;
  onExtraClick?: () => void;
  /**
   * Which surface this instance renders on, for analytics. The mobile sticky
   * bar gets its own event (mobile_sticky_cta_clicked) since it is the one
   * surface competing directly with a wizard's own sticky controls; header
   * and mobile-menu instances report as the generic primary CTA click.
   */
  surface?: "header" | "mobile-menu" | "mobile-sticky";
}

/**
 * Header and mobile-bar estimate entry: homepage scrolls to #calculator;
 * every other page goes to the dedicated /estimate page.
 */
export function NavEstimateButton({
  asLink = false,
  className,
  children,
  onExtraClick,
  surface = "header",
  ...props
}: NavEstimateButtonProps) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const href = onHome ? "/#calculator" : "/estimate";
  const { variant: _v, size: _s, ...linkAttrs } = props as Record<string, unknown>;

  const handleClick = () => {
    trackEvent(surface === "mobile-sticky" ? "mobile_sticky_cta_clicked" : "primary_cta_clicked", {
      location: pathname ?? "",
      surface,
    });
    onExtraClick?.();
  };

  if (asLink) {
    return (
      <a
        href={href}
        className={className}
        onClick={handleClick}
        {...(linkAttrs as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }

  return (
    <Button {...props} className={cn(className)} asChild>
      <a href={href} onClick={handleClick}>
        {children}
      </a>
    </Button>
  );
}
