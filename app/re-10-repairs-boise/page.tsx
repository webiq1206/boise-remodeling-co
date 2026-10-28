import { InteriorPage } from "@/components/approved/InteriorLayout";
import { ServiceReferral } from "@/components/marketing/ServiceReferral";
import { JsonLd } from "@/components/seo/JsonLd";
import { withBrandPageMetadata } from "@/lib/brand-page-metadata";
import { buildCanonical, fitDescription } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import type { Metadata } from "next";

const PATH = "/re-10-repairs-boise";
const HANDYMAN = "https://boisehandyman.co/re-10-repairs-boise";

/**
 * D2: Boise Handyman Co owns RE-10. Remodeling keeps a one-paragraph referral
 * and drops nav/footer links. The upload tool that still lives in this repo
 * should be ported to Handyman; until then, send customers there.
 */
const TITLE = "RE-10 Repairs in Boise";
const DESCRIPTION = fitDescription(
  "RE-10 and inspection repairs in Boise are handled by Boise Handyman Co. Send your list and photos for a written price before work starts.",
);

export const metadata: Metadata = withBrandPageMetadata(
  {
    title: { absolute: `${TITLE} | Boise Remodeling Co` },
    description: DESCRIPTION,
    alternates: { canonical: HANDYMAN },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: buildCanonical(PATH),
      type: "website",
      images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Boise Remodeling Co" }],
    },
  },
  PATH,
);

export default function Re10ReferralPage() {
  const schemas = [
    generateWebPageSchema({
      title: TITLE,
      description: DESCRIPTION,
      url: PATH,
    }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "RE-10 repairs", url: PATH },
    ]),
  ];

  return (
    <InteriorPage kind="services">
      <>
        <JsonLd data={schemas} />
        <ServiceReferral
          eyebrow="Handled by Boise Handyman Co"
          title="RE-10 and inspection repairs"
          body="Boise Handyman Co is the P5 company for RE-10 and home-inspection repair lists. Send the list and photos; they reply with one written price before work starts. Boise Remodeling Co focuses on kitchens, baths and whole-home remodels."
          ctaLabel="Go to Boise Handyman Co RE-10"
          ctaHref={HANDYMAN}
          alsoNote="RE-10 repair lists are priced from the document by Handyman, not by the remodeling team."
        />
      </>
    </InteriorPage>
  );
}
