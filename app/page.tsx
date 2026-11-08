import { ApprovedHome } from "@/components/approved/ApprovedHome";
import { ApprovedHomeHero } from "@/components/approved/ApprovedHomeHero";
import { HeroConversion } from "@/components/approved/HeroConversion";
import { Reveal } from "@/components/Reveal";
import { BudgetInclusionsSection } from "@/components/sections/BudgetInclusionsSection";
import { HomePageSchema } from "@/components/seo/HomePageSchema";
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical,fitDescription } from "@/lib/page-metadata";
import { TextReplyLine } from "@/components/TextReplyLine";
import { HashTargetRecovery } from "@/components/HashTargetRecovery";
import { CONSULT_BULLETS,SITE_TAGLINE } from "@/shared/siteContent";
import { Check } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = withBrandPageMetadata(({
  title: { absolute: "Design-Build Remodeling in Boise, Idaho | Boise Remodeling Co" },
  description:
    fitDescription("Design-build remodeling in Boise from one team that writes the scope before the price. Kitchens, baths and whole-home remodels. Free in-home visit."),
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
    <div className="flex flex-col bg-background">
      <HashTargetRecovery />
      {/* PAGE ORDER IS THE SALES CONVERSATION, IN THE ORDER A HOMEOWNER HAS IT.

          1. Hero            who we are, and the one action we want, then the proof strip
          2. Where the money goes   frames price before we quote one
          3. Estimator       the number - the question every visitor arrives with
          4. What's included what that number actually covers
          5. Services        what we do
          6. Our work        proof we do it well
          7. Why us          why this company rather than another
          8. Process         what happens after they say yes
          9. Brand band      the emotional close
          10. FAQ            the last objections
          11. Final CTA band the ask: the short request (#request, #consult), form first, the longer form one tap away

          The estimator sits third on purpose. It is the site's primary lead
          generator and the hero's own call to action points at it, so burying
          it below services, process, a featured project and the gallery meant
          the highest-intent visitors scrolled past five sections to reach the
          thing they came for. Everything above it now exists only to make the
          number land well; everything below it answers what the number raised. */}
      <HomePageSchema />
      <ApprovedHome hero={<ApprovedHomeHero />} />
      <BudgetInclusionsSection />
      <div id="contact" className="scroll-mt-24" aria-hidden="true" />
      {/* The ask. A bone band after the dark budget section, with the form as the one
          bright object on the screen: white card, accent top rule, deep shadow. Every
          "Request a quote" (header, bottom bar, hero, in-page buttons) lands on /#request;
          #consult ("Schedule a free visit") lands on the same form. The form comes first in
          the markup, so a phone lands on its heading and first field. */}
      <section className="fr-request family-site family-remodeling" style={{ "--f-accent": "#7D9479" } as React.CSSProperties}>
        <div className="f-section f-container">
          <div className="fr-request-grid">
            <div id="request" className="home-request lg:col-start-2 lg:row-start-1" role="region" aria-label="Request a quote">
              <span id="consult" className="home-request-anchor" aria-hidden="true" />
              <div className="fr-request-card">
                <HeroConversion />
              </div>
            </div>
            <div className="fr-request-copy lg:col-start-1 lg:row-start-1">
              <Reveal>
                <p className="f-eyebrow">BEGIN A CONVERSATION</p>
                <h2>Tell us about<br /><em style={{ color: "var(--f-accent)" }}>your home.</em></h2>
                <p>We answer your questions and help you schedule your free 60 to 90 minute in-home visit.</p>
                <TextReplyLine className="fr-request-reply" />
                <p>You will leave with planning guidance, design direction, and no obligation.</p>
                <ul className="fr-request-list">
                  {CONSULT_BULLETS.map((item) => (
                    <li key={item}>
                      <Check className="h-4 w-4" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
