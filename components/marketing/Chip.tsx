import { cn } from "@/lib/utils";

export interface ChipProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Chip({ children, active, className, onClick }: ChipProps) {
  const Comp = onClick ? "button" : "span";

  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-sm px-3 py-1 text-xs font-normal tracking-wide transition-colors duration-200 ease-out",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-[hsl(var(--surface-muted))] text-foreground",
        /* A Chip is a <span> label when it has no onClick and a real control
           when it does - and only the control needs to be thumb-sized. On the
           blog index these ARE the page's filter, and they measured 27px tall
           on a phone. Padded to 44 on mobile only, so the desktop chip row
           keeps its compact rhythm. */
        onClick &&
          "min-h-11 lg:min-h-0 cursor-pointer hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
    </Comp>
  );
}
