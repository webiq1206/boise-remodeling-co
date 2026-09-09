import Image from "next/image";

/** Unverified concept assets must never imply a completed customer project. */
export function ProjectInspirationImage({ afterSrc, afterAlt, caption, aspectClass = "aspect-[4/3]" }: {
  afterSrc: string;
  afterAlt: string;
  beforeSrc?: string;
  beforeAlt?: string;
  caption?: React.ReactNode;
  aspectClass?: string;
}) {
  return (
    <figure>
      <div className={`relative overflow-hidden ${aspectClass}`}>
        <Image src={afterSrc} alt={`Design inspiration: ${afterAlt.replace(/^After: /, "")}`} fill sizes="(max-width: 768px) 100vw, 1200px" quality={80} className="object-cover" />
      </div>
      <figcaption className="bg-background p-4 text-sm leading-relaxed text-muted-foreground">
        <p>Representative design imagery</p>
        {caption && <div className="mt-3 [&_*]:!text-foreground">{caption}</div>}
      </figcaption>
    </figure>
  );
}
