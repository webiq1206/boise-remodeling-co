"use client";

import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { ProjectInspirationImage } from "@/components/ProjectInspirationImage";
import { GALLERY_PROJECTS } from "@/shared/galleryData";

export function FeaturedProjectSection() {
  // Feature the whole-home great-room transformation (great room with the
  // kitchen visible in the background) rather than the standalone kitchen.
  const project =
    GALLERY_PROJECTS.find((p) => p.serviceType === "whole-home-remodel") ??
    GALLERY_PROJECTS[0];

  return (
    <section id="featured-project" className="relative overflow-hidden bg-background section-divider border-t border-border/60">
      <div className="container px-4 pt-16 md:pt-24 pb-10 md:pb-12">
        <Reveal className="max-w-3xl">
          <p className="ed-eyebrow">Featured design</p>
          <h2 className="ed-h2 ed-statement-wide">
            See what a thoughtful remodel can{" "}
            <em className="brc-accent">become</em>
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            {project.title}. Explore a possible direction for your own home.
          </p>
        </Reveal>
      </div>

      <Reveal delay={60}>
        <ProjectInspirationImage
          beforeSrc={project.beforeImageUrl}
          afterSrc={project.afterImageUrl}
          beforeAlt={`Before: ${project.title}`}
          afterAlt={`After: ${project.title}`}
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
            <Link href="/testimonials">Explore remodeling ideas</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
