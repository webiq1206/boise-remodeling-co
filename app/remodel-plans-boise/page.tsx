import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Phone, Check, X } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { PageHeroBand } from "@/components/sections/PageHeroBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { buildCanonical } from "@/lib/page-metadata";
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateHowToSchema,
  generateServiceSchema,
  generateWebPageSchema,
} from "@/lib/schema";
import { SITE_IMAGES } from "@/shared/siteImages";
import { SITE_CONFIG } from "@/shared/siteConfig";
import {
  PLANS_DEFINITION,
  PLANS_DIRECT_ANSWER,
  PLANS_FAQS,
  PLANS_PRICING_DISCLAIMER,
  PLANS_PROCESS,
  PLANS_WHAT_WE_DO_NOT_USE,
  PLANS_WHAT_WE_READ,
} from "@/shared/content/plansContent";
import { PlansWizard } from "@/components/plans/PlansWizard";

const PATH = "/remodel-plans-boise";

/**
 * Length-budgeted the same way the RE-10 page is: anything past roughly 60
 * characters is written for nobody, because Google truncates it. Primary term
 * front-loaded, brand last.
 */
// 58 characters including the brand.
const TITLE_WITH_BRAND = "Remodel Estimate From Your Plans | Boise Remodeling Co";
const TITLE = "Remodel Estimate From Your Plans, Boise";
// 155 characters, benefit-led, ends on the action.
const DESCRIPTION =
  "Upload your floor plans and get a remodeling budget built from your own drawings, not a guess at your square footage. Boise and the Treasure Valley. Free.";

export const metadata: Metadata = {
  title: { absolute: TITLE_WITH_BRAND },
  description: DESCRIPTION,
  alternates: { canonical: buildCanonical(PATH) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonical(PATH),
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

export default function RemodelPlansPage() {
  const schemas = [
    generateWebPageSchema({
      title: "Remodel Estimates From Your Plans in Boise and the Treasure Valley",
      description: DESCRIPTION,
      url: PATH,
    }),
    generateServiceSchema(
      "Remodel Estimating From Construction Drawings",
      "Remodeling budgets built from uploaded construction drawings: room areas, ceiling heights and schedule counts read off the floor plans, confirmed by the homeowner, and priced at current Treasure Valley costs.",
    ),
    // The four steps are a real procedure with a real outcome, and the process
    // section renders exactly these strings, so the schema cannot drift.
    generateHowToSchema({
      name: "How to get a remodel estimate from your construction plans",
      description: PLANS_DIRECT_ANSWER,
      url: PATH,
      steps: PLANS_PROCESS.map((s) => ({ name: s.title, text: s.body })),
    }),
    generateFAQSchema(PLANS_FAQS),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Estimate From Plans", url: PATH },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />

      {/* ------------------------------------------------------------ hero */}
      <PageHeroBand
        imageSrc={SITE_IMAGES.budgetDetail}
        imageAlt="Construction drawings for a Boise remodel laid out during estimating"
        scrim={0.86}
      >
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Estimate From Plans" }]} />
        <div className="brc-label text-inverse-muted mt-6 mb-4">
          For homeowners, architects and designers
        </div>
        <h1 className="font-sans font-light text-display tracking-tight text-inverse-foreground max-w-3xl mb-4">
          A remodel estimate built from{" "}
          <em className="brc-accent">your own drawings</em>
        </h1>
        <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-7">
          Send us your floor plans. We read the room areas, ceiling heights and schedules off the
          sheets, show you exactly what we measured, and price the work from that rather than from a
          typical house of the same size.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="brand" asChild>
            <Link href="#plans-estimator">
              Upload your plans <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="brandInverseOutline" asChild>
            <a href={SITE_CONFIG.phoneHref} data-testid="link-plans-call">
              <Phone className="mr-2 h-4 w-4" /> {SITE_CONFIG.phone}
            </a>
          </Button>
        </div>
      </PageHeroBand>

      {/* ------------------------------- direct answer, above everything else */}
      <Section spacing="sm">
        <div className="container px-4 max-w-3xl mx-auto">
          <p className="text-lg md:text-xl text-foreground leading-relaxed font-light">
            {PLANS_DIRECT_ANSWER}
          </p>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            <strong className="font-normal text-foreground">What is a plan-set estimate?</strong>{" "}
            {PLANS_DEFINITION}
          </p>
        </div>
      </Section>

      <PlansWizard />

      {/* ------------------------------------------------------------ process */}
      <Section variant="greige" divider>
        <div className="container px-4">
          <SectionHeader
            eyebrow="How it works"
            size="display"
            title={
              <>
                Four steps, and you correct us{" "}
                <em className="brc-accent">before we price</em>
              </>
            }
            className="mb-10 max-w-3xl"
          />
          <ol className="grid sm:grid-cols-2 gap-5">
            {PLANS_PROCESS.map((s, i) => (
              <li key={s.title}>
                <MarketingCard padding="lg">
                  <div className="brc-label text-muted-foreground mb-2">Step {i + 1}</div>
                  <h3 className="text-base font-normal text-foreground mb-2.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                </MarketingCard>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* --------------------------------------------- what we read, and not */}
      <Section divider>
        <div className="container px-4">
          <SectionHeader
            eyebrow="What a drawing can and cannot tell us"
            size="display"
            title={
              <>
                We use what is printed, and{" "}
                <em className="brc-accent">nothing else</em>
              </>
            }
            className="mb-10 max-w-3xl"
          />
          <div className="grid md:grid-cols-2 gap-5">
            <MarketingCard padding="lg">
              <h3 className="text-base font-normal text-foreground mb-4">What we measure</h3>
              <ul className="space-y-3">
                {PLANS_WHAT_WE_READ.map((w) => (
                  <li key={w} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent" aria-hidden="true" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </MarketingCard>
            <MarketingCard padding="lg">
              <h3 className="text-base font-normal text-foreground mb-4">What we will not guess at</h3>
              <ul className="space-y-3">
                {PLANS_WHAT_WE_DO_NOT_USE.map((w) => (
                  <li key={w} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <X className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </MarketingCard>
          </div>
          <p className="mt-8 max-w-3xl text-sm text-muted-foreground leading-relaxed">
            A tight number built on a measurement we got wrong is worse than a wide one, because you
            can plan around a wide range and you cannot recover from a precise figure that is wrong.
            So a measurement only narrows your price when it was printed on the sheet and we can
            quote it back to you. Everything else stays as wide as it would have been with no plans
            at all, and we tell you which is which.
          </p>
        </div>
      </Section>

      {/* --------------------------------------------------------------- FAQ
          Rendered server-side, every answer in the raw HTML. The same array
          feeds the FAQPage JSON-LD above, so the schema cannot drift from what
          a reader sees. */}
      <Section id="faq" variant="greige" divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Common questions"
            size="display"
            title={
              <>
                What people ask before sending{" "}
                <em className="brc-accent">their plans</em>
              </>
            }
            className="mb-10"
          />
          <div className="space-y-8">
            {PLANS_FAQS.map((f) => (
              <div key={f.question}>
                <h3 className="text-base font-normal text-foreground mb-2">{f.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ close */}
      <Section divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Next step"
            size="display"
            title={
              <>
                Send the floor plans and see{" "}
                <em className="brc-accent">a real number</em>
              </>
            }
            className="mb-6"
          />
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-4">
            Free, no obligation, and no contact details until after you have seen what we read. If
            you would rather talk it through first, call {SITE_CONFIG.phone}.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-7">
            {PLANS_PRICING_DISCLAIMER}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="brand" asChild>
              <Link href="#plans-estimator">
                Upload your plans <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <a href={SITE_CONFIG.phoneHref}>
                <Phone className="mr-2 h-4 w-4" /> {SITE_CONFIG.phone}
              </a>
            </Button>
          </div>

          {/* Contextual outbound links, so this page is part of the cluster
              rather than a leaf nobody can navigate out of. */}
          <p className="mt-10 text-sm text-muted-foreground leading-relaxed">
            No drawings yet? The{" "}
            <Link href="/estimate" className="underline underline-offset-4 hover:text-foreground">
              online estimator
            </Link>{" "}
            prices from a few questions instead, and the{" "}
            <Link
              href="/guides/boise-remodeling-cost-guide"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Boise remodeling cost guide
            </Link>{" "}
            covers what projects run in the Treasure Valley. Buying or selling and working from an
            inspection list instead? That is{" "}
            <Link
              href="/re-10-repairs-boise"
              className="underline underline-offset-4 hover:text-foreground"
            >
              RE-10 and inspection repairs
            </Link>
            . For the work itself, see{" "}
            <Link
              href="/services/whole-home-remodel"
              className="underline underline-offset-4 hover:text-foreground"
            >
              whole-home remodeling
            </Link>{" "}
            and{" "}
            <Link href="/services/room-addition" className="underline underline-offset-4 hover:text-foreground">
              room additions
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
