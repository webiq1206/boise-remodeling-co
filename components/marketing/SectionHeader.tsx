import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  reveal?: boolean;
  inverse?: boolean;
  size?: "default" | "display";
  as?: "h1" | "h2" | "h3";
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  reveal = true,
  inverse = false,
  size = "default",
  as: Heading = "h2",
}: SectionHeaderProps) {
  const content = (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        align === "center" && eyebrow && "[&_.brc-label]:justify-center",
        className
      )}
    >
      {eyebrow && <div className="brc-label mb-4">{eyebrow}</div>}
      <Heading
        className={cn(
          " tracking-tight mb-4",
          size === "display"
            ? "font-serif text-[2rem] md:text-[2.75rem] lg:text-[3.25rem] leading-[1.08]"
            : "font-serif text-section-title md:text-section-title-lg",
          inverse ? "text-inverse-foreground" : "text-foreground"
        )}
      >
        {title}
      </Heading>
      {description && (
        <p
          className={cn(
            "text-base leading-relaxed",
            inverse ? "text-inverse-muted" : "text-muted-foreground"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );

  if (reveal) {
    return <Reveal className={cn("mb-14", className?.includes("mb-0") && "mb-0")}>{content}</Reveal>;
  }

  return <div className={cn("mb-14", className?.includes("mb-0") && "mb-0")}>{content}</div>;
}
