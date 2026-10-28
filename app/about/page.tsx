import { InteriorHero, InteriorPage } from "@/components/approved/InteriorLayout";
import { RegistrationLink } from "@/components/RegistrationLink";
import { SaveContactLink } from "@/components/SaveContactLink";
import { Section } from "@/components/marketing";
import { AreaCard } from "@/components/marketing/AreaCard";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { Reveal } from "@/components/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { withBrandPageMetadata } from "@/lib/brand-page-metadata";
import { buildPageMetadata } from "@/lib/page-metadata";
import {
  generateBreadcrumbSchema,
  generateOrganizationSchema,
  generateWebPageSchema,
} from "@/lib/schema";
import { CITY_HERO_IMAGES } from "@/shared/cityServiceImages";
import { CITIES, TREASURE_VALLEY_CITIES } from "@/shared/contentData";
import { CTA_PRIMARY } from "@/shared/ctaCopy";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const SPEAKABLE_SUMMARY =
  "Boise Remodeling Co is a design-build remodeler in Meridian, Idaho, and one of the four companies of P5 Home Co. It is run by Nick Perkins. Idaho Registered Contractor #8381215. Two-year workmanship warranty on remodels.";

const COMPANY_ITEMS = [
  "Written scope before construction",
  "Dust barriers and floor protection daily",
  "Friday written update",
  "Written change orders only",
  "Two-year written workmanship guarantee",
] as const;

function HeroBreadcrumbs() {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-inverse-foreground/80 [&_a]:inline-flex [&_a]:items-center [&_a]:min-h-11 md:[&_a]:min-h-0">
        <li>
          <Link href="/" className="hover:text-inverse-foreground transition-colors">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="text-inverse-foreground font-normal">About</li>
      </ol>
    </nav>
  );
}

export const metadata = withBrandPageMetadata(
  buildPageMetadata({
    kind: "about",
    path: "/about",
    titleOverride: "About Boise Remodeling Co | Nick Perkins, Meridian, Idaho",
    descriptionOverride:
      "About Boise Remodeling Co: founder Nick Perkins, design-build kitchens, baths and whole-home remodels, Idaho Registered Contractor #8381215.",
  }),
  "/about",
);

export default function AboutPage() {
  const schemas = [
    generateOrganizationSchema(),
    generateWebPageSchema({
      title: "About Boise Remodeling Co",
      description: SPEAKABLE_SUMMARY,
      url: "/about",
      speakable: true,
    }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "About", url: "/about" },
    ]),
  ];

  return (
    <InteriorPage kind="about">
      <>
        <JsonLd data={schemas} />
        <div className="flex flex-col">
          <InteriorHero
            layout="editorial"
            imageSrc="/images/about/perkins-family-meridian-idaho.webp"
            imageAlt="Nick Perkins with his wife and five children at a pumpkin patch"
          >
            <HeroBreadcrumbs />
            <p data-speakable="summary" className="sr-only">
              {SPEAKABLE_SUMMARY}
            </p>
            <p className="ed-eyebrow" style={{ color: "rgb(255 255 255 / 0.72)" }}>
              Real people. A higher standard.
            </p>
            <h1 className="ed-display ed-statement-display text-inverse-foreground mb-8">
              About Boise Remodeling <em className="brc-accent">Co</em>
            </h1>
            <p className="text-base md:text-lg text-inverse-foreground/85 max-w-2xl leading-relaxed mb-6">
              Boise Remodeling Co is a design-build remodeler in Meridian, Idaho, and one of the four
              companies of P5 Home Co. It is run by Nick Perkins, a construction project manager with a
              bachelor&apos;s degree in Construction and more than a decade of work from small renovations
              to multimillion-dollar custom homes. He founded P5 in Colorado in 2020, moved to the Treasure
              Valley, and named the company for his five children.{" "}
              <a
                href="https://p5homeco.com/about"
                className="underline underline-offset-2 hover:text-inverse-foreground"
                rel="noopener noreferrer"
              >
                Read the full story on p5homeco.com/about
              </a>
              .
            </p>
            <p className="text-sm text-inverse-foreground/80 max-w-2xl leading-relaxed mb-8">
              P5 Home Co LLC, Idaho Registered Contractor #8381215. Insured, certificate on request.
              Two-year workmanship warranty on remodels.
            </p>
            <div className="flex flex-wrap gap-3 mb-4">
              <EstimateCTA variant="brand">
                {CTA_PRIMARY}
              </EstimateCTA>
              <SaveContactLink
                showIcon
                className="inline-flex min-h-11 items-center gap-2 rounded-sm border border-white/30 px-4 text-sm text-inverse-foreground"
              />
            </div>
          </InteriorHero>

          <Section divider>
            <div className="container px-4 max-w-3xl">
              <Reveal>
                <p className="ed-eyebrow">What we do</p>
                <h2 className="ed-h2">Kitchens, baths and whole homes.</h2>
                <p className="ed-lede mt-4">
                  Boise Remodeling Co remodels kitchens, bathrooms and whole homes with design, permits
                  and construction under one contract. Room additions and ADUs are handled by Boise
                  Construction Co. RE-10 inspection repairs are handled by Boise Handyman Co.
                </p>
                <p className="ed-body mt-4">
                  Boise Remodeling Co is a trade name of P5 Home Co LLC, Idaho Registered Contractor
                  #8381215. Your contract is with P5 Home Co LLC doing business as Boise Remodeling Co.
                </p>
                <p className="ed-body mt-4">
                  <RegistrationLink className="underline underline-offset-2" />. Bonded and insured.
                </p>
              </Reveal>
            </div>
          </Section>

          <Section variant="greige" divider>
            <div className="container px-4 max-w-3xl">
              <p className="ed-eyebrow">On every remodel</p>
              <h2 className="ed-h2">Five things you can count on.</h2>
              <ul className="mt-8 grid list-none gap-4 p-0">
                {COMPANY_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3 ed-body">
                    <Check className="h-4 w-4 mt-1 flex-shrink-0" style={{ color: "var(--ed-accent)" }} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section divider>
            <div className="container px-4 grid gap-10 lg:grid-cols-2 lg:items-center max-w-5xl">
              <Image
                src="/images/about/perkins-family-meridian-idaho.webp"
                alt="Nick Perkins with his wife and five children at a pumpkin patch"
                width={960}
                height={720}
                className="w-full h-auto rounded-sm"
              />
              <div>
                <p className="ed-eyebrow">Who you are hiring</p>
                <h2 className="ed-h2">Nick Perkins, founder.</h2>
                <p className="ed-body mt-4">
                  Construction project manager, bachelor&apos;s in Construction, more than a decade of
                  custom homes, remodels and developments. Husband, father of five, Meridian.
                </p>
                <p className="ed-body mt-4">&ldquo;Work hard. Keep your word. Treat people right.&rdquo;</p>
                <p className="ed-body mt-4">
                  Prefer to talk first? Call or text{" "}
                  <a href={SITE_CONFIG.phoneHref} className="underline underline-offset-2">
                    {SITE_CONFIG.phone}
                  </a>
                  . You will reach a person who does this work, not a call centre.
                </p>
              </div>
            </div>
          </Section>

          <Section divider>
            <div className="container px-4 max-w-5xl">
              <SectionHeader
                eyebrow="Treasure Valley"
                size="display"
                title={
                  <>
                    Service <em className="brc-accent">areas</em>
                  </>
                }
                description={`We serve homeowners in ${TREASURE_VALLEY_CITIES}, and surrounding communities.`}
                className="max-w-3xl"
              />
              <div className="grid sm:grid-cols-2 min-[1180px]:grid-cols-4 gap-4">
                {CITIES.map((city, i) => (
                  <Reveal key={city.slug} delay={Math.min(i, 7) * 50}>
                    <AreaCard city={city} imageSrc={CITY_HERO_IMAGES[city.slug]} />
                  </Reveal>
                ))}
              </div>
            </div>
          </Section>

          <Section surface="gradient" spacing="xl" edge>
            <div className="ed-shell">
              <div className="ed-split ed-split-center">
                <h2 className="ed-h2-sm ed-statement-wide">Ready to start your remodel?</h2>
                <div>
                  <p className="ed-body">
                    Schedule a free in-home visit for planning guidance, design direction, and an honest
                    project range.
                  </p>
                  <div className="mt-8">
                    <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </>
    </InteriorPage>
  );
}
