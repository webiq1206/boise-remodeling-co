import { withBrandPageMetadata } from "@/lib/brand-page-metadata";
import type { Metadata } from "next";
import { HeroConversion } from "@/components/approved/HeroConversion";
import { InteriorPage } from "@/components/approved/InteriorLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCanonical, fitDescription } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";

/**
 * The short request, the same form as the homepage and the contact page (owner, 11 November
 * 2026: every form short and very clean). It was a six-screen wizard with a required email
 * (components/estimate/EstimateRequestWizard, kept in the repo, mounted nowhere). No on-screen
 * price. Same /api/consultation lead path and the same accepted-inquiry tracking; project type
 * and photos are offered on step 2, after the request is sent.
 */
const TITLE = "Request a Remodel Quote";
const DESCRIPTION = fitDescription(
  "Request a remodel quote from Boise Remodeling Co. Share your project, city and photos. We answer your questions and help you find a time to visit.",
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
        <div className="estimate-short-form f-container">
          <h1 className="estimate-short-form-title">Request a remodel quote</h1>
          <HeroConversion blockId="estimate-request-form" recovery showTitle={false} />
        </div>
      </>
    </InteriorPage>
  );
}
