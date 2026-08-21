import Image from "next/image";
import { GRAIN_URL } from "@/lib/grain";
import { cn } from "@/lib/utils";

interface PageHeroBandProps {
  imageSrc: string;
  imageAlt: string;
  /** Optional extra scrim strength 0–1 (default 0.66). Values much above
      ~0.75 flatten the photograph into the charcoal ground - the band's text
      sits at the bottom where this gradient is already at full strength, so
      the top two-thirds of the image can stay visible. */
  scrim?: number;
  /** Shorter band on mobile, for pages whose real content is the tool below. */
  compact?: boolean;
  children: React.ReactNode;
}

/** Full-bleed photo hero band for index pages (Phase 3). */
export function PageHeroBand({
  imageSrc,
  imageAlt,
  compact = false,
  scrim = 0.66,
  children,
}: PageHeroBandProps) {
  return (
    <section
      /* 220px on a phone, not 320. On a tool page the hero is orientation,
         not the destination - every pixel it takes is a pixel of the actual
         calculator pushed below the fold. Desktop keeps the taller band
         because there the tool still fits beneath it. */
      className={cn(
        "relative flex items-end overflow-hidden bg-inverse border-b border-border/60",
        compact ? "min-h-[220px] md:min-h-[420px]" : "min-h-[320px] md:min-h-[420px]",
      )}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-[0.9] img-brand-grade"
      />
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse via-inverse/60 to-inverse/20"
        style={{ opacity: scrim }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/70 via-inverse/20 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.03 }}
      />
      <div
        /* pt-28 (112px) exists to clear the fixed header. On a compact band
           that plus pb-12 is 160px of padding around ~200px of content, which
           is most of why the tool sat below the fold. Compact clears the
           header and stops there. */
        className={cn(
          "relative z-10 w-full container px-4",
          compact ? "pt-20 pb-6 md:pt-32 md:pb-16" : "pt-28 pb-12 md:pt-32 md:pb-16",
        )}
      >
        {children}
      </div>
    </section>
  );
}
