import type { Metadata } from "next";
import Image from "next/image";
import dynamic from "next/dynamic";
import { FAQSection } from "@/components/FAQSection";
import { ConsultationForm } from "@/components/ConsultationForm";
import { Reveal } from "@/components/Reveal";
import { HeroSection } from "@/components/sections/HeroSection";
import { ValueOverheadSection } from "@/components/sections/ValueOverheadSection";
import { WhyChooseUsSection } from "@/components/sections/WhyChooseUsSection";
import { ServicesGrid } from "@/components/sections/ServicesGrid";
import { ProcessSection } from "@/components/sections/ProcessSection";
import { BudgetInclusionsSection } from "@/components/sections/BudgetInclusionsSection";
import { ProjectGallerySection } from "@/components/sections/ProjectGallerySection";
import { BrandStatementBand } from "@/components/sections/BrandStatementBand";
import { EstimatePromptBand } from "@/components/marketing/EstimatePromptBand";
import { Section } from "@/components/marketing/Section";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { Check } from "lucide-react";
import { CONSULT_BULLETS, SITE_TAGLINE } from "@/shared/siteContent";
import { CTA_PRIMARY } from "@/shared/ctaCopy";
import { HomePageSchema } from "@/components/seo/HomePageSchema";
import { buildCanonical } from "@/lib/page-metadata";
import { SITE_IMAGES } from "@/shared/siteImages";

const EstimateCalculator = dynamic(
  () =>
    import("@/components/EstimateCalculator").then((mod) => mod.EstimateCalculator),
  {
    loading: () => (
      <div
        id="calculator"
        className="container px-4 py-16 text-center text-sm text-muted-foreground"
      >
        Loading estimate calculator...
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: { absolute: "Remodeling Contractor in Boise, ID | Boise Remodeling Co" },
  description:
    "Design-build remodeling for Boise, Meridian, Eagle, Nampa & the Treasure Valley. Clear expectations and budget guidance. Schedule a free in-home consultation.",
  alternates: {
    canonical: buildCanonical("/"),
    // Setting `alternates` replaces the root declaration, so the feed link has
    // to be repeated here or the homepage loses feed discovery entirely.
    types: {
      "application/rss+xml": [
        { url: "/feed.xml", title: "Boise Remodeling Co | Remodeling Guides and Insights" },
      ],
    },
  },
  openGraph: {
    title: "Boise Remodeling Co | Treasure Valley Design-Build",
    description:
      `${SITE_TAGLINE}. Kitchen, bathroom, whole-home, and addition remodeling across the Treasure Valley.`,
    type: "website",
    url: buildCanonical("/"),
    siteName: "Boise Remodeling Co",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Boise Remodeling Co" }],
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col pb-20 md:pb-0 bg-background">
      {/* PAGE ORDER IS THE SALES CONVERSATION, IN THE ORDER A HOMEOWNER HAS IT.

          1. Hero            who we are, and the one action we want
          2. Where the money goes   frames price before we quote one
          3. Estimator       the number - the question every visitor arrives with
          4. What's included what that number actually covers
          5. Services        what we do
          6. Our work        proof we do it well
          7. Why us          why this company rather than another
          8. Process         what happens after they say yes
          9. Brand band      the emotional close
          10. FAQ            the last objections
          11. Consultation   the ask

          The estimator sits third on purpose. It is the site's primary lead
          generator and the hero's own call to action points at it, so burying
          it below services, process, a featured project and the gallery meant
          the highest-intent visitors scrolled past five sections to reach the
          thing they came for. Everything above it now exists only to make the
          number land well; everything below it answers what the number raised. */}
      <HomePageSchema />
      <HeroSection />
      <ValueOverheadSection />
      <EstimateCalculator />
      <BudgetInclusionsSection />
      <ServicesGrid />
      {/* No longer excludes whole-home: the featured before/after slider that
          used to carry that project was removed, so the gallery is now the only
          place it appears. */}
      <ProjectGallerySection limit={6} showViewAll={true} />

      <EstimatePromptBand
        eyebrow="Still comparing options"
        title={
          <>
            Get your number without leaving{' '}
            <em className="brc-accent">home</em>
          </>
        }
        description="If you scrolled past the estimator above, come back anytime - or book a free in-home visit and we'll walk through scope, design direction, and a written project range together."
        bullets={[
          "Instant range based on real Treasure Valley costs",
          "Free in-home visit when you're ready for detail",
          "No obligation - we email you a copy of your estimate",
        ]}
      />

      <WhyChooseUsSection limit={5} />
      <ProcessSection />
      <BrandStatementBand />
      <FAQSection />
      <Section id="consult" divider className="scroll-mt-16 relative overflow-hidden pb-28 md:pb-28">
        {/* Warm, dimmed lifestyle photo grounds the closing section. Directional
            scrims keep the left-column copy legible and fade the edges into the
            page ground; the form card floats above on its own shadow. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src={SITE_IMAGES.consultBg}
            alt=""
            fill
            loading="lazy"
            sizes="100vw"
            className="object-cover opacity-[0.4] img-brand-grade"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-transparent to-background" />
        </div>
        <div className="container px-4 relative z-10">
          <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-12 items-start">
            <div className="md:col-span-2">
              <Reveal>
                <div className="brc-label mb-5">Begin a conversation</div>
                <h2 className="font-serif text-[2rem] md:text-[2.75rem] lg:text-[3.25rem] leading-[1.08] tracking-tight mb-4 text-foreground">
                  Tell us about your{" "}
                  <em className="brc-accent">home</em>.
                </h2>
                <p className="text-base leading-relaxed mb-8 text-muted-foreground">
                  We will reach out within one business day to schedule your free
                  60 to 90 minute in-home visit. You will leave with planning guidance,
                  design direction, and no obligation.
                </p>
                <div className="space-y-3">
                  {CONSULT_BULLETS.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 flex-shrink-0 text-accent-legible" />
                      {item}
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
            <MarketingCard className="md:col-span-3 shadow-2xl" padding="lg">
              <ConsultationForm />
            </MarketingCard>
          </div>
        </div>
      </Section>
    </div>
  );
}
