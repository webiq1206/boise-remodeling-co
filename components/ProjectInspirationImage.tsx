import Image from "next/image";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

/** Unverified concept assets must never imply a completed customer project. */
export function ProjectInspirationImage({ beforeSrc, afterSrc, afterAlt, caption, aspectClass = "aspect-[4/3]", sizes = "(max-width: 1023px) 100vw, 55vw" }: {
  afterSrc: string;
  afterAlt: string;
  beforeSrc?: string;
  beforeAlt?: string;
  caption?: React.ReactNode;
  aspectClass?: string;
  sizes?: string;
}) {
  // Only this edited, same-camera concept has been reviewed for alignment.
  // Other legacy asset pairs remain single representative images.
  const isReviewedComparison = beforeSrc === "/images/gallery/gallery-kitchen-before.webp"
    && afterSrc === "/images/gallery/kitchen-refresh-design-after.webp";
  return (
    <figure>
      {isReviewedComparison ? (
        <BeforeAfterSlider
          beforeSrc={beforeSrc}
          afterSrc={afterSrc}
          beforeAlt="Kitchen with oak cabinets, dark counters, and the original appliance layout"
          afterAlt="Kitchen with white shaker cabinets, a farmhouse sink, quartz counters, and oak flooring"
          aspectClass="aspect-[3/2]"
          sizes={sizes}
        />
      ) : (
      <div className={`relative overflow-hidden ${aspectClass}`}>
        {/* These local WebP assets are already compressed. Serve them directly
            so gallery loading does not depend on an on-demand encoding job. */}
        <Image unoptimized={afterSrc.startsWith("/images/") && afterSrc.endsWith(".webp")} src={afterSrc} alt={afterAlt.replace(/^(?:Design inspiration|Before|After):\s*/, "")} fill sizes={sizes} quality={80} className="object-cover" />
      </div>
      )}
      {caption && (
        <figcaption className="bg-background p-4 text-sm leading-relaxed text-muted-foreground">
          <div className="[&_*]:!text-foreground">{caption}</div>
        </figcaption>
      )}
    </figure>
  );
}
