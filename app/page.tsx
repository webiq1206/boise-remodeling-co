import { ApprovedHome } from "@/components/approved/ApprovedHome";
import { ConsultationForm } from "@/components/ConsultationForm";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { Section } from "@/components/marketing/Section";
import { Reveal } from "@/components/Reveal";
import { BudgetInclusionsSection } from "@/components/sections/BudgetInclusionsSection";
import { HomePageSchema } from "@/components/seo/HomePageSchema";
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical,fitDescription } from "@/lib/page-metadata";
import { CONSULT_BULLETS,SITE_TAGLINE } from "@/shared/siteContent";
import { SITE_IMAGES } from "@/shared/siteImages";
import { Check } from "lucide-react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Image from "next/image";

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

export const metadata: Metadata = withBrandPageMetadata(({
  title: { absolute: "Remodeling Contractor in Boise, ID | Boise Remodeling Co" },
  description:
    fitDescription("Design-build remodeling for Boise, Meridian, Eagle, Nampa & the Treasure Valley. Clear expectations and budget guidance. Schedule a free in-home consultation."),
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
}), "/");

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
      <ApprovedHome />
      <BudgetInclusionsSection />
      <Section id="consult" divider className="scroll-mt-16 relative overflow-hidden pb-28 md:pb-28">
        {/* Warm, dimmed lifestyle photo grounds the closing section. Directional
            scrims keep the left-column copy legible and fade the edges into the
            page ground; the form card floats above on its own shadow. */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <Image
            src={SITE_IMAGES.consultBg}
            unoptimized
            alt=""
            fill
            loading="lazy"
            sizes="100vw"
            className="object-cover opacity-[0.52] img-brand-grade"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-transparent to-background" />
        </div>
        {/* The ask. Full measure, heading at h2 scale, the form kept in its
            card because a form needs a defined field to sit in - this is one of
            the places a card is actually the right answer. */}
        <div className="ed-shell relative z-10">
          <div className="grid gap-[var(--ed-gutter)] lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <p className="ed-eyebrow">Begin a conversation</p>
                <h2 className="ed-h2 ed-statement">
                  Tell us about your{" "}
                  <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                    home
                  </em>
                  .
                </h2>
                <p className="ed-lede mt-8 max-w-[40ch]">
                  We will reach out within one business day to schedule your free
                  60 to 90 minute in-home visit.
                </p>
                <p className="ed-body mt-4">
                  You will leave with planning guidance, design direction, and no
                  obligation.
                </p>
                <ul
                  className="mt-8 grid list-none gap-3 border-t p-0 pt-6"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  {CONSULT_BULLETS.map((item) => (
                    <li key={item} className="ed-body flex items-center gap-3 text-[0.875rem]">
                      <Check
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: "var(--ed-accent)" }}
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
            <MarketingCard className="shadow-2xl" padding="lg">
              <ConsultationForm />
            </MarketingCard>
          </div>
        </div>
      </Section>
    </div>
  );
}
