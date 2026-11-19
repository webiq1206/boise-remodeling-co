import Image from '@/components/VersionedImage';

export interface ArticleInlineFigureProps {
  src: string;
  alt: string;
  caption?: string;
}

/** Editorial inline figure for long blog posts and guides (Phase 4). */
export function ArticleInlineFigure({ src, alt, caption }: ArticleInlineFigureProps) {
  return (
    <figure className="my-10 not-prose">
      <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-border/60 bg-muted">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 720px"
          className="object-cover img-brand-grade"
        />
      </div>
      {caption && (
        <figcaption className="mt-3 text-xs text-muted-foreground leading-relaxed">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
