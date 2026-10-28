import { withBrandPageMetadata } from "@/lib/brand-page-metadata";
import type { Metadata } from "next";
import { HeroConversion } from "@/components/approved/HeroConversion";
import { InteriorPage } from "@/components/approved/InteriorLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCanonical, fitDescription } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import { SITE_CONFIG } from "@/shared/siteConfig";
import Link from "next/link";

/**
 * D5: the multi-step public estimator is replaced by a short request form.
 * Same lead path as consultation requests; no on-screen price.
 */
const TITLE = "Request a Remodel Quote";
const DESCRIPTION = fitDescription(
  "Request a remodel quote from Boise Remodeling Co. Share your project, city and photos. We reply within one business day with questions or a time to visit.",
);

export const metadata: Metadata = withBrandPageMetadata(
  {
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
  },
  "/estimate",
);

export default function EstimatePage() {
  const schemas = [
    generateWebPageSchema({
      title: TITLE,
      description: DESCRIPTION,
      url: "/estimate",
    }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Request a quote", url: "/estimate" },
    ]),
  ];

  return (
    <InteriorPage kind="estimate">
      <>
        <JsonLd data={schemas} />
        <section className="f-section f-container" style={{ maxWidth: "40rem", paddingTop: "3rem", paddingBottom: "5rem" }}>
          <p className="f-eyebrow">SHORT REQUEST</p>
          <h1 className="ed-h1" style={{ marginTop: "0.75rem" }}>
            Request a remodel quote
          </h1>
          <p className="ed-lede" style={{ marginTop: "1rem" }}>
            Share your project type, city and what you want done. Attach photos if you have them. We reply within one business day with questions or a time to visit. You get a written scope before any price.
          </p>
          <p className="ed-body" style={{ marginTop: "0.75rem" }}>
            Prefer to call?{" "}
            <a href={SITE_CONFIG.phoneHref} className="underline underline-offset-2">
              {SITE_CONFIG.phone}
            </a>
            . One number for every P5 company.
          </p>
          <div style={{ marginTop: "2rem" }}>
            <HeroConversion />
          </div>
          <p className="ed-body" style={{ marginTop: "2rem" }}>
            Have stamped drawings?{" "}
            <Link href="/remodel-plans-boise" className="underline underline-offset-2">
              Upload remodel plans
            </Link>{" "}
            for document intake (no on-screen price).
          </p>
        </section>
      </>
    </InteriorPage>
  );
}
