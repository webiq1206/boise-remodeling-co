import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Phone, MessageSquare, AlertTriangle } from "lucide-react";
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
  generateServiceSchema,
  generateWebPageSchema,
} from "@/lib/schema";
import { SITE_IMAGES } from "@/shared/siteImages";
import { SITE_CONFIG } from "@/shared/siteConfig";
import {
  RE10_BENEFITS,
  RE10_COORDINATION_ONLY,
  RE10_DEFINITION,
  RE10_DIRECT_ANSWER,
  RE10_FAQS,
  RE10_PRICING_DISCLAIMER,
  RE10_PROCESS,
  RE10_SERVICE_AREAS,
  RE10_SERVICES,
} from "@/shared/content/re10Content";
import { Re10Faqs } from "@/components/re10/Re10Faqs";
import { Re10Wizard } from "@/components/re10/Re10Wizard";
import { Re10ContactTracking } from "@/components/re10/Re10ContactTracking";

const PATH = "/re-10-repairs-boise";

/**
 * Title and description are length-budgeted deliberately.
 *
 * The first draft ran to 80 characters once the brand was appended, which
 * Google truncates around 60 - so the words after the pipe were being written
 * for nobody. Primary term front-loaded, one secondary term, brand last.
 */
// 56 characters including the brand.
const TITLE_WITH_BRAND = "RE-10 and Inspection Repairs Boise | Boise Remodeling Co";
// The social/OG variant does not carry the brand, which the card shows anyway.
const TITLE = "RE-10 and Inspection Repairs in Boise";
// 154 characters, benefit-led, ends on the action.
const DESCRIPTION =
  "RE-10 repairs completed before closing. We handle inspection repair lists for agents, buyers and sellers across Boise and the Treasure Valley. Send yours.";

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

export default function Re10RepairsPage() {
  const schemas = [
    generateWebPageSchema({
      title: "RE-10 Repairs in Boise and the Treasure Valley",
      description: DESCRIPTION,
      url: PATH,
    }),
    // Service schema so the offering is a named entity rather than an inference
    // from body copy.
    generateServiceSchema(
      "RE-10 and Home Inspection Repairs",
      "Inspection response repairs for real estate transactions: review of the RE-10 and inspection report, written scope and pricing, multi-trade coordination, access scheduling, completion, and photo documentation for the transaction file.",
    ),
    generateFAQSchema(RE10_FAQS),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "RE-10 Repairs", url: PATH },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <Re10ContactTracking />

      {/* ------------------------------------------------------------ hero */}
      <PageHeroBand
        imageSrc={SITE_IMAGES.processInProgress}
        imageAlt="Boise Remodeling Co carpenter completing inspection repairs in a Treasure Valley home before closing"
        scrim={0.86}
      >
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "RE-10 Repairs" }]} />
        <div className="brc-label text-inverse-muted mt-6 mb-4">
          For agents, buyers and sellers
        </div>
        <h1 className="font-sans font-light text-display tracking-tight text-inverse-foreground max-w-3xl mb-4">
          RE-10 repairs completed correctly and{" "}
          <em className="brc-accent">on schedule</em>
        </h1>
        <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-7">
          We complete inspection-related repairs for Boise-area real estate transactions, with one
          point of contact, clear scheduling against your closing date, and documentation you can
          put straight in the file.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="brand" asChild>
            <Link href="#re10-estimator">
              Upload your RE-10 and get an instant estimate <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="brandInverseOutline" asChild>
            <a href={SITE_CONFIG.phoneHref} data-testid="link-re10-call">
              <Phone className="mr-2 h-4 w-4" /> {SITE_CONFIG.phone}
            </a>
          </Button>
        </div>
      </PageHeroBand>

      {/* ------------------------------- direct answer, above everything else */}
      <Section spacing="sm">
        <div className="container px-4 max-w-3xl mx-auto">
          <p className="text-lg md:text-xl text-foreground leading-relaxed font-light">
            {RE10_DIRECT_ANSWER}
          </p>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            <strong className="font-normal text-foreground">What is an RE-10?</strong>{" "}
            {RE10_DEFINITION}
          </p>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            Have architectural drawings instead?{" "}
            <Link href="/remodel-plans-boise" className="text-accent-legible hover:underline">
              Get a plan-based estimate
            </Link>
            .
          </p>
        </div>
      </Section>

      <Re10Wizard />

      {/* ------------------------------------------- realtor trust statement */}
      <Section variant="greige" divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Why this is different work"
            size="display"
            title={
              <>
                An inspection repair is not a{" "}
                <em className="brc-accent">remodel</em>
              </>
            }
            className="mb-6"
          />
          <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
            <p>
              A remodel has one client and a flexible date. An RE-10 has a contractual deadline, two
              sides who have already argued about the price, an inspection report behind every line,
              an occupant whose home it still is, and a closing that does not move because a
              contractor was slow.
            </p>
            <p>
              That is a coordination problem as much as a construction one. We treat it that way: we
              ask for the deadline and the closing date before we quote, we confirm access in
              writing, we tell you the same day if something behind a wall changes the scope, and we
              document what was done so nobody has to take anyone&apos;s word for it.
            </p>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------- benefits */}
      <Section divider>
        <div className="container px-4">
          <SectionHeader
            eyebrow="Why agents use us"
            size="display"
            title={
              <>
                What you actually get out of{" "}
                <em className="brc-accent">handing this over</em>
              </>
            }
            className="mb-10 max-w-3xl"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {RE10_BENEFITS.map((b) => (
              <MarketingCard key={b.title} padding="lg">
                <h3 className="text-base font-normal text-foreground mb-2.5">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.body}</p>
              </MarketingCard>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------- services provided */}
      <Section variant="greige" divider>
        <div className="container px-4">
          <SectionHeader
            eyebrow="What we repair"
            size="display"
            title={
              <>
                The repairs that actually appear on an{" "}
                <em className="brc-accent">inspection response</em>
              </>
            }
            className="mb-10 max-w-3xl"
          />
          <div className="grid md:grid-cols-3 gap-5">
            {RE10_SERVICES.map((group) => (
              <MarketingCard key={group.heading} padding="lg">
                <h3 className="text-base font-normal text-foreground mb-4">{group.heading}</h3>
                <ul className="space-y-2.5">
                  {group.items.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                      <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                      {i}
                    </li>
                  ))}
                </ul>
              </MarketingCard>
            ))}
          </div>

          {/* Said plainly and in the same breath as what we DO handle. An agent
              finding this out on closing week is the worst possible moment. */}
          <div className="mt-8 max-w-3xl">
            <MarketingCard padding="lg">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="h-4 w-4 text-accent-legible flex-shrink-0 mt-1" />
                <h3 className="text-base font-normal text-foreground">
                  What we coordinate rather than perform
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                These need a licensed specialist or an engineer. We will tell you so up front and,
                where we can, point you to the right trade rather than leave you to find one.
              </p>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {RE10_COORDINATION_ONLY.map((i) => (
                  <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                    {i}
                  </li>
                ))}
              </ul>
            </MarketingCard>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------- one company */}
      <Section divider>
        <div className="container px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="brc-label mb-4">One company, whole list</div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-foreground mb-4">
              Stop calling four contractors for one repair list
            </h2>
            <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
              <p>
                A typical inspection response spans drywall, paint, a door, a leaking supply valve,
                a GFCI outlet and some exterior caulking. Hiring that out separately means four
                schedules, four minimum charges, four sets of paperwork and four chances for one of
                them to miss your date.
              </p>
              <p>
                We review the whole list at once, group the work so travel and set-up are shared
                across it, and give you a single scope, a single schedule and a single invoice. It
                is usually cheaper than the alternative, and it is always less work for you.
              </p>
            </div>
          </div>
          <MarketingCard padding="lg">
            <p className="text-sm font-normal text-foreground mb-4">
              What one point of contact means in practice
            </p>
            <ul className="space-y-3">
              {[
                "One scope covering every trade on the list",
                "One schedule built around your repair deadline",
                "One person to call when something changes",
                "One invoice and one documentation package",
                "Shared travel and set-up instead of per-trade minimums",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </MarketingCard>
        </div>
      </Section>

      {/* ------------------------------------------------------------ process */}
      <Section variant="inverse" divider>
        <div className="container px-4">
          <SectionHeader
            eyebrow="How it works"
            size="display"
            inverse
            title={
              <>
                From repair list to{" "}
                <em className="brc-accent">signed-off file</em>
              </>
            }
            className="mb-10 max-w-3xl"
          />
          <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-9">
            {RE10_PROCESS.map((s) => (
              <li key={s.step}>
                <div className="brc-display-num text-inverse-muted/70 text-2xl mb-2">{s.step}</div>
                <h3 className="text-base font-normal text-inverse-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-inverse-foreground/70 leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* ------------------------------------------------------ deadlines */}
      <Section divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Built around your dates"
            size="display"
            title={
              <>
                We ask for the deadline{" "}
                <em className="brc-accent">first</em>
              </>
            }
            className="mb-6"
          />
          <div className="space-y-4 text-sm md:text-base text-muted-foreground leading-relaxed">
            <p>
              Inspection repairs sit inside a chain of dates: the inspection response deadline, the
              re-inspection, the final walkthrough, the appraisal and the closing itself. A repair
              finished the day after the walkthrough is not finished as far as the transaction is
              concerned.
            </p>
            <p>
              So we prioritize transaction-related repairs, and we will tell you clearly what can
              reasonably be completed inside your timeframe. What we will not do is promise a date we
              have not checked against material lead times and property access. Send the documents as
              early as you can, even if the repair list is not final.
            </p>
            <p className="text-foreground">{RE10_PRICING_DISCLAIMER}</p>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------- communication and docs */}
      <Section variant="greige" divider>
        <div className="container px-4 max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-start">
          <div>
            <div className="brc-label mb-4">Communication</div>
            <h2 className="font-sans font-light text-2xl md:text-3xl tracking-tight text-foreground mb-4">
              You should never have to chase us for an update
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Communication is the thing agents actually complain about, more than price and more
              than quality. It is the part we treat as deliverable work rather than courtesy.
            </p>
          </div>
          <MarketingCard padding="lg">
            <ul className="space-y-3">
              {[
                "A named point of contact from the first email",
                "Written confirmation of scheduling and access",
                "Status updates as the work progresses",
                "Immediate notice of material delays",
                "Same-day notice of unexpected property conditions",
                "Written approval before any additional work",
                "Completion photos, invoices and receipts",
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </MarketingCard>
        </div>
      </Section>

      {/* ----------------------------------------------- pre-listing work */}
      <Section divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Before the inspection"
            size="display"
            title={
              <>
                Pre-listing repairs and seller{" "}
                <em className="brc-accent">preparation</em>
              </>
            }
            className="mb-6"
          />
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-6">
            Handling the likely inspection items before a property is listed usually costs less than
            negotiating them afterwards, and it removes the leverage a repair list gives a buyer. We
            do the same work ahead of a listing that we do in response to one.
          </p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {[
              "Pre-listing repairs and inspection preparation",
              "Deferred maintenance and safety corrections",
              "Repairing visibly damaged areas",
              "Minor cosmetic improvements",
              "Addressing likely buyer objections early",
              "Preparing a property for photography and showings",
            ].map((i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                <Check className="h-4 w-4 text-accent-legible flex-shrink-0 mt-0.5" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* ------------------------------------------------------------- FAQ */}
      <Re10Faqs />

      {/* --------------------------------------------------- service area */}
      <Section variant="greige" divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Service area"
            size="display"
            title={
              <>
                Across Ada and{" "}
                <em className="brc-accent">Canyon County</em>
              </>
            }
            className="mb-6"
          />
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-5">
            Boise Remodeling Co provides RE-10 and home inspection repair services for real estate
            agents, buyers and sellers in {RE10_SERVICE_AREAS.slice(0, -1).join(", ")} and{" "}
            {RE10_SERVICE_AREAS[RE10_SERVICE_AREAS.length - 1]}. We are based in{" "}
            {SITE_CONFIG.address.cityState} and work across the Treasure Valley.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            More on how we work:{" "}
            <Link href="/services" className="underline underline-offset-4 hover:text-foreground">
              our services
            </Link>
            ,{" "}
            <Link href="/areas" className="underline underline-offset-4 hover:text-foreground">
              areas we serve
            </Link>
            ,{" "}
            <Link href="/about" className="underline underline-offset-4 hover:text-foreground">
              about the company
            </Link>{" "}
            and{" "}
            <Link href="/testimonials" className="underline underline-offset-4 hover:text-foreground">
              what clients say
            </Link>
            . Planning a larger project instead?{" "}
            <Link href="/estimate" className="underline underline-offset-4 hover:text-foreground">
              Use the remodel estimator
            </Link>
            .
          </p>
        </div>
      </Section>

      {/* -------------------------------------------------- final conversion */}
      <Section id="submit" variant="inverse">
        <div className="container px-4 max-w-3xl mx-auto text-center">
          <div className="brc-label text-inverse-muted mb-4">Send it over</div>
          <h2 className="font-sans font-light text-2xl md:text-4xl tracking-tight text-inverse-foreground mb-5">
            Submit your RE-10 for review
          </h2>
          <p className="text-sm md:text-base text-inverse-foreground/80 leading-relaxed mb-8 max-w-xl mx-auto">
            The sooner we see the repair list, the sooner we can tell you what it involves, what it
            is likely to cost, and whether it fits your closing date. Send the RE-10, the inspection
            report and any photos.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="brand" asChild>
              <Link href="/contact#consult">
                Submit an RE-10 for review <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="brandInverseOutline" asChild>
              <a href={SITE_CONFIG.phoneHref} data-testid="link-re10-call-footer">
                <Phone className="mr-2 h-4 w-4" /> {SITE_CONFIG.phone}
              </a>
            </Button>
            <Button variant="brandInverseOutline" asChild>
              <a href={SITE_CONFIG.phoneSmsHref} data-testid="link-re10-text">
                <MessageSquare className="mr-2 h-4 w-4" /> Text us
              </a>
            </Button>
          </div>
          <p className="mt-7 text-xs text-inverse-foreground/60 leading-relaxed">
            {SITE_CONFIG.name} &middot; {SITE_CONFIG.address.cityState} &middot;{" "}
            {SITE_CONFIG.address.serviceArea}
          </p>
        </div>
      </Section>
    </>
  );
}
