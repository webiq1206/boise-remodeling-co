"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { Button } from "@/components/ui/button";
import { ProjectInspirationImage } from "@/components/ProjectInspirationImage";
import { GALLERY_PROJECTS, type GalleryProject } from "@/shared/galleryData";

function ProjectMeta({ project, lead = false }: { project: GalleryProject; lead?: boolean }) {
  return (
    <>
      <p className="ed-eyebrow ed-eyebrow-accent !mb-3">Design inspiration</p>
      <h3 className={lead ? "ed-h3" : "ed-h4"}>{project.title}</h3>
      <p className={`ed-body mt-3 ${lead ? "" : "text-[0.875rem]"}`}>{project.description}</p>
    </>
  );
}

interface ProjectGallerySectionProps {
  limit?: number;
  showViewAll?: boolean;
  excludeServiceTypes?: string[];
}

export function ProjectGallerySection({
  limit = 6,
  showViewAll = true,
  excludeServiceTypes = [],
}: ProjectGallerySectionProps) {
  const projects = GALLERY_PROJECTS.filter(
    (p) => !excludeServiceTypes.includes(p.serviceType),
  ).slice(0, limit);
  const [lead, ...rest] = projects;
  if (!lead) return null;

  return (
    <Section id="gallery" surface="bone" spacing="xl" edge className="overflow-hidden">
      <div className="ed-shell">
        {/* LEAD: the slider at the size it deserves, heading alongside. */}
        <div className="grid gap-[var(--ed-gutter)] lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <Reveal>
            <p className="ed-eyebrow">Design inspiration</p>
            <h2 className="ed-h2 ed-statement">
              Ideas for your Treasure Valley home
            </h2>
            <p className="ed-body mt-7">
              Explore kitchen, bathroom, whole-home and addition design ideas.
              These representative images illustrate possibilities for your own remodel.
            </p>
            <div className="mt-10 hidden lg:block">
              <ProjectMeta project={lead} lead />
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div style={{ border: "1px solid var(--ed-line)" }}>
              <ProjectInspirationImage
                beforeSrc={lead.beforeImageUrl}
                afterSrc={lead.afterImageUrl}
                beforeAlt={`Before: ${lead.title}`}
                afterAlt={`After: ${lead.title}`}
                aspectClass="aspect-[4/3]"
              />
            </div>
            <div className="mt-6 lg:hidden">
              <ProjectMeta project={lead} lead />
            </div>
          </Reveal>
        </div>

        {/* THE RAIL: everything else, browsed sideways. */}
        {rest.length > 0 && (
          <Reveal delay={120}>
            <div className="mt-[clamp(48px,6vw,88px)] flex items-end justify-between gap-6">
              <p className="ed-eyebrow !mb-0">More design ideas</p>
              <p className="ed-small">Swipe or scroll to explore</p>
            </div>
            <div
              className="ed-rail mt-6 [scrollbar-color:var(--ed-line)_transparent]"
              style={{ ["--ed-rail-w" as string]: "31%" }}
              aria-label="More remodeling design ideas"
            >
              {rest.map((project) => (
                <article
                  key={`${project.serviceType}-${project.city}`}
                  className="flex flex-col"
                  style={{ border: "1px solid var(--ed-line)" }}
                >
                  <ProjectInspirationImage
                    beforeSrc={project.beforeImageUrl}
                    afterSrc={project.afterImageUrl}
                    beforeAlt={`Before: ${project.title}`}
                    afterAlt={`After: ${project.title}`}
                    aspectClass="aspect-[4/3]"
                    sizes="(max-width: 768px) 80vw, 33vw"
                  />
                  <div className="p-6">
                    <ProjectMeta project={project} />
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        )}

        {showViewAll && (
          <div className="mt-12">
            <Button variant="brandOutline" asChild>
              <Link href="/testimonials">Explore remodeling ideas</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
