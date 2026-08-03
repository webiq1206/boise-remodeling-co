import { ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { AreaCard } from "@/components/marketing/AreaCard";
import { BlogEndCta } from "@/components/marketing/BlogEndCta";
import { EstimatePromptBand } from "@/components/marketing/EstimatePromptBand";
import { PageHeroBand } from "@/components/sections/PageHeroBand";
import { CITY_HERO_IMAGES } from "@/shared/cityServiceImages";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Reveal } from "@/components/Reveal";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  generateBreadcrumbSchema,
  generateWebPageSchema,
} from "@/lib/schema";
import { CITIES, TREASURE_VALLEY_CITIES } from "@/shared/contentData";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/shared/ctaCopy";
import { Button } from "@/components/ui/button";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { SITE_IMAGES } from "@/shared/siteImages";

export const metadata = buildPageMetadata({
  kind: "about",
  path: "/areas",
  titleOverride: "Treasure Valley Service Areas",
  descriptionOverride:
    "Design-build remodeling across the Treasure Valley: Boise, Meridian, Eagle, Nampa, Kuna, Star, Middleton, and Caldwell, Idaho.",
});

export default function AreasHubPage() {
  const schemas = [
    generateWebPageSchema({
      title: "Treasure Valley Service Areas",
      description: `Design-build remodeling serving ${TREASURE_VALLEY_CITIES}.`,
      url: "/areas",
    }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Service Areas", url: "/areas" },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <div className="flex flex-col pb-20 md:pb-0">
        <PageHeroBand
          imageSrc={SITE_IMAGES.hero}
          imageAlt="Remodeled Treasure Valley home interior with kitchen and living space"
        >
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Service Areas" }]} />
          <div className="brc-label text-inverse-muted mt-6 mb-4">Treasure Valley</div>
          <h1 className="font-sans font-light text-display tracking-tight text-inverse-foreground max-w-3xl mb-4">
            Treasure Valley service{" "}
            <em className="brc-accent">areas</em>
          </h1>
          <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-4">
            We serve homeowners across {TREASURE_VALLEY_CITIES}, and surrounding communities with
            kitchen, bathroom, whole-home, and addition remodeling under one design-build team.
          </p>
          <p className="sr-only" data-speakable="summary">
            Treasure Valley design-build remodeling service areas.
          </p>
          <div className="flex flex-wrap gap-3">
            <ConsultCTA variant="brand">
              {CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
            </ConsultCTA>
            <Button variant="heroGhost" asChild>
              <a href="/#consult">{CTA_SECONDARY}</a>
            </Button>
          </div>
        </PageHeroBand>

        <Section variant="greige" divider>
          <div className="container px-4">
            <SectionHeader
              eyebrow="Treasure Valley"
              title={<>Eight cities, one design-build team</>}
              description="Kitchen, bath, whole-home, and addition remodeling across Ada and Canyon County."
              className="mb-10 max-w-2xl mx-auto text-center [&_.brc-label]:justify-center"
              align="center"
            />
            <div className="grid sm:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
              {CITIES.map((city, i) => (
                <Reveal key={city.slug} delay={i * 40}>
                  <AreaCard city={city} imageSrc={CITY_HERO_IMAGES[city.slug]} />
                </Reveal>
              ))}
            </div>
          </div>
        </Section>

        <EstimatePromptBand
          title={
            <>
              Planning a remodel in your{' '}
              <em className="brc-accent">city</em>?
            </>
          }
          description="Permit paths and housing stock differ across Ada and Canyon County. Get an instant planning range for your city, then book a free in-home visit for local guidance."
        />

        <Section>
          <div className="container px-4">
            <BlogEndCta />
          </div>
        </Section>
      </div>
    </>
  );
}
