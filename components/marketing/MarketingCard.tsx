import { cn } from "@/lib/utils";

export interface MarketingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `none` is for image cards: the photo runs edge to edge and the body pads itself. */
  padding?: "default" | "lg" | "none";
}

/* A call site that passes its own padding (p-5, px-4, ...) owns it at every
   width. Without this, tailwind-merge dropped only the base p-6 and kept
   md:p-8, so those cards doubled their padding from 768px up. */
const OWN_PADDING = /(^|\s)p[xytrbl]?-/;

export function MarketingCard({
  className,
  padding = "default",
  children,
  ...props
}: MarketingCardProps) {
  const ownPadding = OWN_PADDING.test(className ?? "");
  return (
    <div
      className={cn(
        "marketing-card",
        padding === "default" && !ownPadding && "p-6 md:p-8",
        padding === "lg" && !ownPadding && "p-7 md:p-10",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
