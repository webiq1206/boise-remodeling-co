import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import {
  FEATURED_EAGLE_WHOLE_HOME,
  type FeaturedProjectSet,
} from "@/shared/featuredProjects";

interface FeaturedProjectRoomsSectionProps {
  project?: FeaturedProjectSet;
  /** Compact band for mid-page scroll rhythm (home / landings). */
  compact?: boolean;
  id?: string;
}

/**
 * Multi-room featured project strip. Rooms share one visual identity so the
 * set reads as a single Treasure Valley property, not a collage of stock shots.
 */
export function FeaturedProjectRoomsSection({
  project = FEATURED_EAGLE_WHOLE_HOME,
  compact = false,
  id = "featured-project-rooms",
}: FeaturedProjectRoomsSectionProps) {
  const [lead, ...rest] = project.rooms;
  const accent = { color: "var(--ed-accent)" };

  return (
    <section
      id={id}
      className={
        compact
          ? "relative overflow-hidden bg-background"
          : "relative overflow-hidden bg-background section-divider border-t border-border/60"
      }
      aria-label={`${project.title} design inspiration`}
    >
      {!compact && (
        <div className="container px-4 pt-16 md:pt-24 pb-8 md:pb-10">
          <Reveal className="max-w-3xl">
            <p className="ed-eyebrow">Featured design</p>
            <h2 className="ed-h2 ed-statement-wide">
              One home,{" "}
              <em className="not-italic" style={accent}>
                room by room
              </em>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-[52ch]">
              {project.description}
            </p>
          </Reveal>
        </div>
      )}

      {lead && (
        <Reveal>
          <figure className="relative">
            <div className={`relative overflow-hidden ${compact ? "aspect-[16/10] md:aspect-[21/9]" : "aspect-[16/10] md:aspect-[16/9]"}`}>
              <Image
                src={lead.src}
                alt={lead.alt}
                fill
                unoptimized
                sizes="100vw"
                className="object-cover img-brand-grade"
                priority={false}
              />
            </div>
            <figcaption className="sr-only">
              {project.title}: {lead.label}
            </figcaption>
          </figure>
        </Reveal>
      )}

      {rest.length > 0 && (
        <div className={`ed-shell ${compact ? "py-6 md:py-8" : "py-8 md:py-12"}`}>
          {compact && (
            <Reveal>
              <p className="ed-eyebrow">{project.city.toUpperCase()}</p>
              <h2 className="ed-h2-sm ed-statement-wide mt-2">
                {project.title}
              </h2>
              <p className="ed-body mt-3 max-w-[52ch]">{project.description}</p>
            </Reveal>
          )}
          <ul className="mt-6 md:mt-8 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4 md:gap-4">
            {rest.map((room, i) => (
              <li key={room.key}>
                <Reveal delay={Math.min(i, 3) * 40}>
                  <figure className="m-0">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={room.src}
                        alt={room.alt}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover img-brand-grade"
                        loading="lazy"
                      />
                    </div>
                    <figcaption className="ed-small mt-2 text-muted-foreground">
                      {room.label}
                    </figcaption>
                  </figure>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
