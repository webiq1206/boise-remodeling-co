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
import { EstimateCTA } from "@/components/modals/EstimateCTA";
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
          <p className="ed-eyebrow mt-8" style={{ color: "rgb(255 255 255 / 0.72)" }}>Treasure Valley</p>
          <h1 className="ed-display ed-statement-display text-inverse-foreground">
            Treasure Valley service{" "}
            <em className="brc-accent">areas</em>
          </h1>
          <p className="ed-lede mt-8 max-w-[44ch] text-inverse-foreground/85">
            We serve homeowners across {TREASURE_VALLEY_CITIES}, and surrounding communities with
            kitchen, bathroom, whole-home, and addition remodeling under one design-build team.
          </p>
          <p className="sr-only" data-speakable="summary">
            Treasure Valley design-build remodeling service areas.
          </p>
          <div className="flex flex-wrap gap-3">
            <EstimateCTA variant="brand">
              {CTA_PRIMARY} <ArrowRight className="h-4 w-4" />
            </EstimateCTA>
            <ConsultCTA variant="heroGhost">{CTA_SECONDARY}</ConsultCTA>
          </div>
        </PageHeroBand>

        <Section surface="dark" spacing="xl">
          <div className="ed-shell">
            <SectionHeader
              eyebrow="Treasure Valley"
              title={<>Eight cities, one design-build team</>}
              description="Kitchen, bath, whole-home, and addition remodeling across Ada and Canyon County."
              align="left"
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

        <BlogEndCta />
      </div>
    </>
  );
}
