"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * NO `tint`. It was a warm-hued dark panel used on three bands and it read as a
 * muddy off-colour against the greige the rest of the page uses - close enough
 * to look like a mistake rather than a choice. Removed from the union rather
 * than just unused, so it cannot be reached for again.
 */
type SectionVariant = "canvas" | "surface" | "greige" | "inverse";

const variantClasses: Record<SectionVariant, string> = {
  canvas: "bg-background text-foreground",
  surface: "bg-card text-card-foreground",
  greige: "bg-surface-greige text-foreground",
  inverse: "bg-inverse text-inverse-foreground",
};

/**
 * The P5 family surfaces (app/family.css).
 *
 * The site shipped as a uniformly dark page, so every band sat at the same
 * value and a long page had no rhythm - nothing told a scrolling reader that a
 * new idea had started. `surface` gives a section its ground from the family
 * layer, which derives all of these from tokens this site already defines, so
 * alternating light and dark costs no new brand colour.
 *
 * `variant` is left in place and unchanged so pages not yet adopted keep
 * rendering exactly as they do; pass `surface` instead to join the rhythm.
 */
type SectionSurface = "dark" | "deep" | "bone" | "muted" | "gradient";

const surfaceClasses: Record<SectionSurface, string> = {
  dark: "ed-on-dark",
  deep: "ed-on-deep",
  bone: "ed-on-bone",
  muted: "ed-on-muted",
  gradient: "ed-on-gradient",
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Gentle once-only reveal as the section enters view. Off for anything that must paint immediately. */
  reveal?: boolean;
  variant?: SectionVariant;
  /** Family ground. Takes precedence over `variant` when supplied. */
  surface?: SectionSurface;
  divider?: boolean;
  /**
   * `lg` and `xl` are the family's editorial rhythm; `default` and `sm` are the
   * original, tighter spacing, kept so untouched pages do not shift.
   */
  spacing?: "default" | "sm" | "none" | "lg" | "xl";
  /** Hairline above the section, for separating two bands of the same value. */
  edge?: boolean;
}

export function Section({
  reveal = true,
  variant = "canvas",
  surface,
  divider = false,
  spacing = "default",
  edge = false,
  className,
  children,
  ...props
}: SectionProps) {
    const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!reveal || !el) return;
    // Reduced motion, or a section already scrolled past (a page opened at an anchor), shows at once.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || el.getBoundingClientRect().bottom < 0) { setShown(true); return; }
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShown(true); obs.disconnect(); } }, { threshold: [0, 0.08], rootMargin: "0px 0px -6% 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [reveal]);
  return (
    <section
      ref={ref}
      className={cn(
        surface ? surfaceClasses[surface] : variantClasses[variant],
        spacing === "default" && "section-y",
        spacing === "sm" && "section-y-sm",
        spacing === "lg" && "ed-section",
        spacing === "xl" && "ed-section-lg",
        divider && "section-divider",
        edge && "ed-edge-top",
        reveal && "reveal-init",
        reveal && shown && "reveal-visible",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
