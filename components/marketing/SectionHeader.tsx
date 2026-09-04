import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";

export interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
  reveal?: boolean;
  /**
   * Kept for callers. Colour now comes from the band's ground (the family
   * surfaces re-point the semantic tokens), so this no longer changes anything.
   */
  inverse?: boolean;
  size?: "default" | "display";
  as?: "h1" | "h2" | "h3";
}

/**
 * The family section head: eyebrow, heading, one paragraph.
 *
 * This one component heads most inner-page sections on all four sites, so it
 * is the single biggest lever on how those pages read. It was a 52px heading
 * at its "display" size over 16px body in a 672px column. It now uses the
 * family type scale - `display` at the 72px h2, `default` at the 52px h2-sm -
 * with the eyebrow-and-rule and the 15px/1.75 body, and the measure set on the
 * heading itself so the heading can run wide while the paragraph stays at a
 * readable line length.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  reveal = true,
  size = "default",
  as: Heading = "h2",
}: SectionHeaderProps) {
  const content = (
    <div
      className={cn(
        align === "center" && "mx-auto text-center [&_.ed-eyebrow]:justify-center [&_.ed-statement-wide]:mx-auto [&_.ed-body]:mx-auto",
        className
      )}
    >
      {eyebrow && <p className="ed-eyebrow">{eyebrow}</p>}
      <Heading className={cn(size === "display" ? "ed-h2" : "ed-h2-sm", "ed-statement-wide")}>
        {title}
      </Heading>
      {description && <p className="ed-body mt-6">{description}</p>}
    </div>
  );

  const gap = className?.includes("mb-0") ? "mb-0" : "mb-[clamp(40px,5vw,72px)]";
  return reveal ? <Reveal className={gap}>{content}</Reveal> : <div className={gap}>{content}</div>;
}
