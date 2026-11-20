import { InteriorPage } from '@/components/approved/InteriorLayout';
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { PlansWizard } from "@/components/plans/PlansWizard";
import { PageHeroBand } from "@/components/sections/PageHeroBand";
import { JsonLd } from "@/components/seo/JsonLd";
import { familyButtonClass } from "@/components/family/Button";
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical } from "@/lib/page-metadata";
import {
generateBreadcrumbSchema,
generateFAQSchema,
generateWebPageSchema,
} from "@/lib/schema";
import {
PLANS_DIRECT_ANSWER,
PLANS_FAQS,
PLANS_NEXT_STEPS,
PLANS_WHAT_TO_SEND,
} from "@/shared/content/plansContent";
import { CTA_PRIMARY, estimatorHref } from "@/shared/ctaCopy";
import { localAlt } from "@/shared/localAlt";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { SITE_IMAGES } from "@/shared/siteImages";
import { Check,Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

const PATH = "/remodel-plans-boise";

/**
 * SEO audit SW-1 (owner decision, 20 November 2026): this page sends plans
 * with a project request. The plan-reading estimator it used to describe was
 * retired on 24 September 2026; the form here is the shared document
 * estimator, which takes a request and shows no price. Nothing on this page
 * may promise a price from drawings. See shared/content/plansContent.ts.
 */
const TITLE_WITH_BRAND = "Send your remodel plans for review | Boise Remodeling Co";
const TITLE = "Send your remodel plans for review";
const DESCRIPTION =
  "Send your floor plans, photos and documents with a remodeling project request. Our team reviews the drawings and your scope before preparing an estimate.";

export const metadata: Metadata = withBrandPageMetadata(({
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
}), "/remodel-plans-boise");

export default function RemodelPlansPage() {
  const schemas = [
    generateWebPageSchema({
      title: "Send your remodel plans with a project request",
      description: DESCRIPTION,
      url: PATH,
    }),
    generateFAQSchema(PLANS_FAQS),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Send your plans", url: PATH },
    ]),
  ];

  return (
    <InteriorPage kind="remodel-plans-boise"><>
      <JsonLd data={schemas} />

      {/* ------------------------------------------------------------ hero */}
      <PageHeroBand
        compact
        imageSrc={SITE_IMAGES.budgetDetail}
        imageAlt={localAlt("Sage green kitchen island with a white quartz top in a remodeled kitchen", { subject: "kitchen remodel" })}
        scrim={0.75}
      >
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Send your plans" }]} />
        <p className="ed-eyebrow mt-8" style={{ color: "rgb(255 255 255 / 0.72)" }}>
          For homeowners, architects and designers
        </p>
        <h1 className="ed-display ed-statement-display text-inverse-foreground">
          Send your remodel plans with{" "}
          <em className="brc-accent">a project request</em>
        </h1>
        <p className="ed-lede mt-8 max-w-[44ch] text-inverse-foreground/85">
          Attach your floor plans, schedules and photos to a project request. Our team reviews the
          drawings and your scope before preparing an estimate.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="#plans-wizard" className={familyButtonClass({ variant: "primary", size: "lg" })}>
            Send your plans
          </Link>
          <a href={SITE_CONFIG.phoneHref} data-testid="link-plans-call" className={familyButtonClass({ variant: "secondary", size: "lg" })}>
            <Phone className="h-4 w-4" aria-hidden="true" /> {SITE_CONFIG.phone}
          </a>
        </div>
      </PageHeroBand>

      {/* ------------------------------- direct answer, above everything else */}
      <Section spacing="sm">
        <div className="container px-4 max-w-3xl mx-auto">
          <p className="text-lg md:text-xl text-foreground leading-relaxed font-light">
            {PLANS_DIRECT_ANSWER}
          </p>
        </div>
      </Section>

      <PlansWizard />

      {/* ----------------------------------------------- what to send, next */}
      <Section variant="greige" divider>
        <div className="container px-4">
          <SectionHeader
            eyebrow="What to send"
            size="display"
            title={
              <>
                The sheets and photos that{" "}
                <em className="brc-accent">help most</em>
              </>
            }
            className="mb-10 max-w-3xl"
          />
          <div className="grid md:grid-cols-2 gap-5">
            <MarketingCard padding="lg">
              <h3 className="text-base font-normal text-foreground mb-4">Attach what you have</h3>
              <ul className="space-y-3">
                {PLANS_WHAT_TO_SEND.map((w) => (
                  <li key={w} className="flex gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-accent" aria-hidden="true" />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </MarketingCard>
            <MarketingCard padding="lg">
              <h3 className="text-base font-normal text-foreground mb-4">What happens next</h3>
              <ol className="space-y-4">
                {PLANS_NEXT_STEPS.map((s, i) => (
                  <li key={s.title} className="text-sm text-muted-foreground leading-relaxed">
                    <span className="block text-foreground">{i + 1}. {s.title}</span>
                    {s.body}
                  </li>
                ))}
              </ol>
            </MarketingCard>
          </div>
        </div>
      </Section>

      {/* --------------------------------------------------------------- FAQ
          Rendered server-side, every answer in the raw HTML. The same array
          feeds the FAQPage JSON-LD above, so the schema cannot drift from what
          a reader sees. */}
      <Section id="faq" divider>
        <div className="ed-shell">
          <div className="ed-split ed-split-narrow">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="ed-eyebrow">Common questions</p>
              <h2 className="ed-h2 ed-statement">
                What people ask before sending{" "}
                <em className="brc-accent">their plans</em>
              </h2>
            </div>
            {/* Native disclosure: every answer stays in the HTML, one question open at a time. */}
            <div className="lx-faq w-full border-t" style={{ borderColor: "var(--ed-line)" }}>
              {PLANS_FAQS.map((f, i) => (
                <details key={f.question} name="plans-faq" open={i === 0} className="border-b" style={{ borderColor: "var(--ed-line)" }}>
                  <summary><h3 className="ed-h4 text-left">{f.question}</h3></summary>
                  <p className="ed-body text-[0.9375rem]">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------------ close */}
      <Section variant="greige" divider>
        <div className="container px-4 max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Next step"
            size="display"
            title={
              <>
                Send the plans with{" "}
                <em className="brc-accent">your request</em>
              </>
            }
            className="mb-6"
          />
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-7">
            Free, with no obligation. If you would rather talk it through first, call{" "}
            {SITE_CONFIG.phone}. For a preliminary price range on screen before you talk to anyone,
            use the instant estimate.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="#plans-wizard" className={familyButtonClass({ variant: "primary", size: "lg" })}>
              Send your plans
            </Link>
            <Link href={estimatorHref()} className={familyButtonClass({ variant: "secondary", size: "lg" })}>
              {CTA_PRIMARY}
            </Link>
          </div>

          {/* Contextual outbound links, so this page is part of the cluster
              rather than a leaf nobody can navigate out of. */}
          <p className="mt-10 text-sm text-muted-foreground leading-relaxed">
            No drawings yet?{" "}
            <Link href="/estimate" className="underline underline-offset-4 hover:text-foreground">
              Send project details
            </Link>{" "}
            and photos instead, and the{" "}
            <Link
              href="/guides/boise-remodeling-cost-guide"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Boise remodeling cost guide
            </Link>{" "}
            covers what projects run in the Treasure Valley. Buying or selling and working from an
            inspection list instead? That is{" "}
            <a
              href="https://boisehandyman.co/re-10-repairs-boise"
              className="underline underline-offset-4 hover:text-foreground"
              rel="noopener"
            >
              RE-10 repairs (Boise Handyman Co)
            </a>
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
    </></InteriorPage>
  );
}
