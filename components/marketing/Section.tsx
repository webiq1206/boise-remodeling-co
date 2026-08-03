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

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  variant?: SectionVariant;
  divider?: boolean;
  spacing?: "default" | "sm" | "none";
}

export function Section({
  variant = "canvas",
  divider = false,
  spacing = "default",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        variantClasses[variant],
        spacing === "default" && "section-y",
        spacing === "sm" && "section-y-sm",
        divider && "section-divider",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
}
