/**
 * Six-photo design mosaic: three wide frames and three square details, set so
 * every desktop row is full (wide + square, square + wide, wide + square) and
 * phones get a full-width frame, a pair of details, and so on, never a lone
 * half-width tile. Photos come from the company's own campaign library
 * (public/family/drive). They show the finish and feel we build toward, so the
 * note under the grid says so rather than presenting them as finished jobs.
 */
export interface GalleryPhoto {
  src: string;
  alt: string;
  label: string;
  /** Wide frames span two columns on desktop. */
  wide?: boolean;
}

export function DesignGallery({
  id = 'design-gallery',
  eyebrow,
  title,
  accent,
  intro,
  photos,
  note,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  accent: string;
  intro: string;
  photos: GalleryPhoto[];
  note: string;
}) {
  return (
    <section className="fr-gallery" id={id} aria-labelledby={`${id}-title`}>
      <div className="fr-gallery-inner">
        <div className="fr-gallery-top">
          <div>
            <p className="fr-gallery-eyebrow">{eyebrow}</p>
            <h2 id={`${id}-title`}>
              {title}
              <br />
              <em>{accent}</em>
            </h2>
          </div>
          <p className="fr-gallery-intro">{intro}</p>
        </div>
        <div className="fr-mosaic">
          {photos.map((p, i) => (
            <figure key={p.src} className={p.wide ? 'is-wide' : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.src}
                alt={p.alt}
                width={1200}
                height={p.wide ? 628 : 1200}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <figcaption>{p.label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="fr-gallery-note">{note}</p>
      </div>
    </section>
  );
}
