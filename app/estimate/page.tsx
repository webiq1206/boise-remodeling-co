import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Section } from "@/components/marketing/Section";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { PageHeroBand } from "@/components/sections/PageHeroBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCanonical } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import { SITE_IMAGES } from "@/shared/siteImages";
import { CONSULT_BULLETS } from "@/shared/siteContent";
import { CTA_SECONDARY } from "@/shared/ctaCopy";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { Check } from "lucide-react";

const EstimateCalculator = dynamic(
  () =>
    import("@/components/EstimateCalculator").then((mod) => mod.EstimateCalculator),
  {
    loading: () => (
      <div className="container px-4 py-16 text-center text-sm text-muted-foreground">
        Loading project estimator...
      </div>
    ),
  },
);

const TITLE = "Remodel Cost Estimator | Treasure Valley";
const DESCRIPTION =
  "Get an instant planning range for kitchen, bathroom, whole-home, addition, ADU, and basement remodels in Boise, Meridian, Eagle, Nampa, and the Treasure Valley. Free, no obligation.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | Boise Remodeling Co` },
  description: DESCRIPTION,
  alternates: { canonical: buildCanonical("/estimate") },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonical("/estimate"),
    type: "website",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Boise Remodeling Co" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/og-default.png"],
  },
};

export default function EstimatePage() {
  const schemas = [
    generateWebPageSchema({
      title: "Remodel Cost Estimator",
      description: DESCRIPTION,
      url: "/estimate",
    }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Project Estimator", url: "/estimate" },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />

      <PageHeroBand
        compact
        imageSrc={SITE_IMAGES.budgetDetail}
        imageAlt="Quartz kitchen island detail in a remodeled Treasure Valley home"
        scrim={0.75}
      >
        {/* THE TOOL IS THE PAGE, and on a phone the hero was hiding it. At
            469px of heading and marketing copy, the first thing a visitor had
            to choose sat at y=868 on an 812px screen - below the fold, on a
            page whose entire purpose is that choice. Desktop has room for the
            full band; mobile gets the orientation and nothing else. */}
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Project Estimator" }]} />
        <div className="brc-label text-inverse-muted mt-4 mb-3 md:mt-6 md:mb-4">Free planning tool</div>
        <h1 className="font-sans font-light text-[clamp(1.75rem,7vw,4.5rem)] leading-[1.08] tracking-tight text-inverse-foreground max-w-3xl mb-2 md:mb-4">
          Treasure Valley remodel{" "}
          <em className="brc-accent">estimator</em>
        </h1>
        {/* One short line on a phone; the full pitch on desktop. */}
        <p className="text-body text-inverse-foreground/85 max-w-2xl md:hidden">
          An instant planning range in about 60 seconds.
        </p>
        <p className="hidden md:block text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed">
          Answer a few questions about your project and get an instant planning range based on real
          Treasure Valley remodel costs - takes about 60 seconds, no obligation.
        </p>
      </PageHeroBand>

      <EstimateCalculator />

      <Section variant="greige" divider>
        <div className="container px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="brc-label mb-4">What happens next</div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-foreground mb-4">
              Your range is a starting point - not a quote
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
              The estimator gives you a realistic planning band for your project type, size, and
              finish level. When you&apos;re ready for detail, book a free in-home visit and we&apos;ll
              walk through scope, design direction, and a written project range together.
            </p>
            <ConsultCTA variant="brandOutline">
              {CTA_SECONDARY} <ArrowRight className="ml-2 h-4 w-4" />
            </ConsultCTA>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
              Have architectural drawings instead?{" "}
              <Link href="/remodel-plans-boise" className="text-accent-legible hover:underline">
                Get a plan-based estimate
              </Link>
              .
            </p>
          </div>
          <MarketingCard padding="lg">
            <p className="text-sm font-normal text-foreground mb-4">Your free visit includes</p>
            <ul className="space-y-3">
              {CONSULT_BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                  {bullet}
                </li>
              ))}
            </ul>
          </MarketingCard>
        </div>
      </Section>
    </>
  );
}
