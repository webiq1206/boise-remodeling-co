import Image from "next/image";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

/** Unverified concept assets must never imply a completed customer project. */
export function ProjectInspirationImage({ beforeSrc, afterSrc, afterAlt, caption, aspectClass = "aspect-[4/3]" }: {
  afterSrc: string;
  afterAlt: string;
  beforeSrc?: string;
  beforeAlt?: string;
  caption?: React.ReactNode;
  aspectClass?: string;
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
          beforeAlt="Representative kitchen before the design refresh, with oak cabinets and the original appliance layout"
          afterAlt="Design concept for the same kitchen, with white shaker cabinets, quartz counters and oak flooring"
          beforeLabel="Original concept"
          afterLabel="Refresh concept"
          aspectClass="aspect-[3/2]"
        />
      ) : (
      <div className={`relative overflow-hidden ${aspectClass}`}>
        <Image src={afterSrc} alt={`Design inspiration: ${afterAlt.replace(/^After: /, "")}`} fill sizes="(max-width: 768px) 100vw, 1200px" quality={80} className="object-cover" />
      </div>
      )}
      <figcaption className="bg-background p-4 text-sm leading-relaxed text-muted-foreground">
        <p>{isReviewedComparison
          ? "Illustrative design comparison. Generated imagery shows a finish refresh in the same room, not a completed customer project. Drag the divider or use the arrow keys to compare."
          : "Representative design imagery"}</p>
        {caption && <div className="mt-3 [&_*]:!text-foreground">{caption}</div>}
      </figcaption>
    </figure>
  );
}
