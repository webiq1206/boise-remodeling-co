"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { GALLERY_PROJECTS } from "@/shared/galleryData";
import { CITIES } from "@/shared/contentData";

function cityDisplayName(slug: string) {
  return CITIES.find((c) => c.slug === slug)?.name ?? slug;
}

export function FeaturedProjectSection() {
  // Feature the whole-home great-room transformation (great room with the
  // kitchen visible in the background) rather than the standalone kitchen.
  const project =
    GALLERY_PROJECTS.find((p) => p.serviceType === "whole-home-remodel") ??
    GALLERY_PROJECTS[0];
  const cityName = cityDisplayName(project.city);

  return (
    <section id="featured-project" className="relative overflow-hidden bg-background section-divider border-t border-border/60">
      <div className="container px-4 pt-16 md:pt-24 pb-10 md:pb-12">
        <Reveal className="max-w-3xl">
          <div className="brc-label mb-4">Featured project</div>
          <h2 className="font-serif text-[2rem] md:text-[2.75rem] lg:text-[3.25rem] leading-[1.08] tracking-tight mb-4 text-foreground">
            See what a thoughtful remodel can{" "}
            <em className="brc-accent">become</em>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {project.title} in {cityName}, Idaho. Drag to reveal the transformation.
          </p>
        </Reveal>
      </div>

      <Reveal delay={60}>
        <BeforeAfterSlider
          beforeSrc={project.beforeImageUrl}
          afterSrc={project.afterImageUrl}
          beforeAlt={`Before: ${project.title} in ${cityName}, Idaho`}
          afterAlt={`After: ${project.title} in ${cityName}, Idaho`}
          aspectClass="aspect-[16/10] md:aspect-[16/9]"
          caption={
            <>
              <p className="font-sans font-normal text-sm text-inverse-foreground mb-1">
                {project.title}
              </p>
              <p className="text-sm text-inverse-muted max-w-xl">{project.description}</p>
            </>
          }
        />
      </Reveal>

      <div className="container px-4 py-10 text-center">
        <Reveal delay={120}>
          <Button variant="brandOutline" asChild>
            <Link href="/testimonials">See more of our work</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
