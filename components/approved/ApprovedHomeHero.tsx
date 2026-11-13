import { ApprovedVideoHero } from "./ApprovedVideoHero";
import { ProofStrip } from "@/components/family/ProofStrip";
import { DOPL_LICENSE_SEARCH, REGISTRATION_LINE } from "@/components/RegistrationLine";
import { FAMILY_BRAND } from "@/lib/familyBrand";
import { SERVICES } from "@/shared/contentData";
import { CTA_PRIMARY } from "@/shared/ctaCopy";

/** The published "planning from" figure on the kitchen service page, read from the same data. */
const KITCHEN_PLANNING_FROM = SERVICES.find((service) => service.slug === "kitchen-remodel")?.planningFrom;

/**
 * Approved full-bleed remodeling video, a uniform black overlay, the existing
 * two-line brand statement and the site's primary action.
 *
 * Owner decision, 13 November 2026: the CTA goes to the central estimator at
 * /instant-estimate, the same destination as the header and the bottom bar
 * (FAMILY_BRAND.cta), with the in-page label "Get an instant estimate". The
 * band under the proof strip (InstantEstimateBand) carries "Request a quote"
 * as the path to a person. The poster and H1 are in the first HTML.
 */
export function ApprovedHomeHero() {
  return (
    <>
      <ApprovedVideoHero
        eyebrow="Design-build remodeling in Boise"
        title="Boise home remodeling."
        titleAccent="One team, start to finish."
        support="We design, price and build kitchens, baths and whole-home remodels."
        primary={{ label: CTA_PRIMARY, href: FAMILY_BRAND.cta.href }}
      />
      {/* Facts already published on this site, nothing new: the DOPL-linked registration,
          the written scope, the warranty term and the kitchen planning-from figure. */}
      <ProofStrip
        items={[
          {
            label: "Registered",
            text: REGISTRATION_LINE,
            href: DOPL_LICENSE_SEARCH,
            linkTitle: "Idaho contractor registration 8381215",
            newTab: true,
          },
          { label: "Scope first", text: "Written scope before any price" },
          { label: "Warranty", text: "One-year workmanship warranty" },
          ...(KITCHEN_PLANNING_FROM
            ? [{ label: "Planning", text: `Kitchen remodels planning from ${KITCHEN_PLANNING_FROM}` }]
            : []),
        ]}
      />
    </>
  );
}
