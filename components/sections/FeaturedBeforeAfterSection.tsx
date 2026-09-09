import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { ProjectInspirationImage } from "@/components/ProjectInspirationImage";
import type { GalleryProject } from "@/shared/galleryData";

interface FeaturedBeforeAfterSectionProps {
  project: GalleryProject;
  title?: React.ReactNode;
}

export function FeaturedBeforeAfterSection({
  project,
  title = (
    <>
      See the <em className="brc-accent">possibilities</em>
    </>
  ),
}: FeaturedBeforeAfterSectionProps) {
  return (
    <Section divider>
      <div className="container px-4 max-w-5xl">
        <SectionHeader
          eyebrow="Design inspiration"
          title={title}
          description="Explore a design direction for your own home. Final layouts and materials are tailored to your property."
          className="mb-8 max-w-3xl"
        />
        <Reveal>
          <MarketingCard className="overflow-hidden p-0">
            <ProjectInspirationImage
              beforeSrc={project.beforeImageUrl}
              afterSrc={project.afterImageUrl}
              beforeAlt={`Before: ${project.title}`}
              afterAlt={`After: ${project.title}`}
              aspectClass="aspect-[16/10] md:aspect-[21/9]"
            />
            <div className="p-6 md:p-8">
              <h3 className="font-serif font-normal text-lg text-foreground mb-2">
                {project.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {project.description}
              </p>
            </div>
          </MarketingCard>
        </Reveal>
      </div>
    </Section>
  );
}
