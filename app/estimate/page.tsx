import { withBrandPageMetadata } from "@/lib/brand-page-metadata";
import type { Metadata } from "next";
import { EstimateRequestWizard } from "@/components/estimate/EstimateRequestWizard";
import { InteriorPage } from "@/components/approved/InteriorLayout";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCanonical, fitDescription } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";

/**
 * D2 / C10: short quote request as a step wizard (no on-screen price).
 * Same lead path as consultation requests.
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
        <EstimateRequestWizard />
      </>
    </InteriorPage>
  );
}
