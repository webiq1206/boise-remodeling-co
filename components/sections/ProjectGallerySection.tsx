"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { GALLERY_PROJECTS, type GalleryProject } from "@/shared/galleryData";
import { CITIES } from "@/shared/contentData";

function cityDisplayName(slug: string) {
  return CITIES.find((c) => c.slug === slug)?.name ?? slug;
}

function ProjectMeta({ project, lead = false }: { project: GalleryProject; lead?: boolean }) {
  const cityName = cityDisplayName(project.city);
  return (
    <>
      <p className="ed-eyebrow ed-eyebrow-accent !mb-3">{cityName}, Idaho</p>
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

/** A featured comparison followed by a responsive grid of comparisons. */
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
            <p className="ed-eyebrow">Our work</p>
            <h2 className="ed-h2 ed-statement">
              Transformations across the Treasure Valley
            </h2>
            <p className="ed-body mt-7">
              Recent kitchen, bathroom, whole-home and addition projects. Drag
              any slider to compare before and after.
            </p>
            <div className="mt-10 hidden lg:block">
              <ProjectMeta project={lead} lead />
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div style={{ border: "1px solid var(--ed-line)" }}>
              <BeforeAfterSlider
                beforeSrc={lead.beforeImageUrl}
                afterSrc={lead.afterImageUrl}
                beforeAlt={`Before: ${lead.title} in ${cityDisplayName(lead.city)}, Idaho`}
                afterAlt={`After: ${lead.title} in ${cityDisplayName(lead.city)}, Idaho`}
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
              <p className="ed-eyebrow !mb-0">More projects</p>
              <p className="ed-small hidden sm:block">Drag each image to compare</p>
            </div>
            <div
              className="ed-comparison-grid mt-6"
              aria-label="More before and after projects"
            >
              {rest.map((project) => (
                <article
                  key={`${project.serviceType}-${project.city}`}
                  className="flex flex-col"
                  style={{ border: "1px solid var(--ed-line)" }}
                >
                  <BeforeAfterSlider
                    beforeSrc={project.beforeImageUrl}
                    afterSrc={project.afterImageUrl}
                    beforeAlt={`Before: ${project.title} in ${cityDisplayName(project.city)}, Idaho`}
                    afterAlt={`After: ${project.title} in ${cityDisplayName(project.city)}, Idaho`}
                    aspectClass="aspect-[4/3]"
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
              <Link href="/testimonials">See more of our work</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
