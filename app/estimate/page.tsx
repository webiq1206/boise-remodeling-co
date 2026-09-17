import {withBrandPageMetadata} from '@/lib/brand-page-metadata';
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCanonical } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import { fitDescription } from '@/lib/page-metadata';

const EstimateCalculator = dynamic(
  () =>
    import("@/components/EstimateCalculator").then((mod) => mod.EstimateCalculator),
  {
    loading: () => (
      <div className="container px-4 py-16 text-center text-sm text-muted-foreground">
        Loading project estimator...
      </div>
    ),
  },
);

const TITLE = "Remodel Cost Estimator";
const DESCRIPTION =
  fitDescription("Get an instant planning range for kitchen, bathroom, whole-home, addition, ADU, and basement remodels in Boise, Meridian, Eagle, Nampa, and the Treasure Valley. Free, no obligation.");

export const metadata: Metadata = withBrandPageMetadata(({
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
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/og-default.png"],
  },
}), "/estimate");

export default function EstimatePage() {
  const schemas = [
    generateWebPageSchema({
      title: "Remodel Cost Estimator",
      description: DESCRIPTION,
      url: "/estimate",
    }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Project Estimator", url: "/estimate" },
    ]),
  ];

  return (
    <>
      <JsonLd data={schemas} />

      {/* ONE SCREEN. The estimator is the page: the conversational app frame
          mounts beneath the site header and owns everything below it, with its
          own scroll area and a bottom-anchored input, so nothing here scrolls
          into unrelated content. */}
      <EstimateCalculator fitViewport />
    </>
  );
}
