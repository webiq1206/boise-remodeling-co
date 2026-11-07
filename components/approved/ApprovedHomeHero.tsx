import { ApprovedVideoHero } from "./ApprovedVideoHero";
import { ProofStrip } from "@/components/family/ProofStrip";
import { DOPL_LICENSE_SEARCH, REGISTRATION_LINE } from "@/components/RegistrationLine";
import { FAMILY_BRAND } from "@/lib/familyBrand";
import { SERVICES } from "@/shared/contentData";
import { AEO } from "@/shared/content/p5Visibility";

/** The published "planning from" figure on the kitchen service page, read from the same data. */
const KITCHEN_PLANNING_FROM = SERVICES.find((service) => service.slug === "kitchen-remodel")?.planningFrom;

/**
 * Approved full-bleed remodeling video, a uniform black overlay, the existing
 * two-line brand statement and the site's common request action.
 *
 * The CTA goes where every other "Request a quote" on the site goes, the short
 * request in the final CTA band (/#request): one label, one destination, as the
 * approved checks pin it. The poster and H1 are in the first HTML.
 */
export function ApprovedHomeHero() {
  return (
    <>
      <ApprovedVideoHero
        eyebrow="Design-build remodeling in Boise"
        title="Boise home remodeling."
        titleAccent="One team, start to finish."
        support="We design, price and build kitchens, baths and whole-home remodels."
        answer={AEO.home}
        primary={{ label: FAMILY_BRAND.cta.label, href: FAMILY_BRAND.cta.href }}
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
          { label: "Warranty", text: "Written workmanship warranty" },
          ...(KITCHEN_PLANNING_FROM
            ? [{ label: "Planning", text: `Kitchen remodels planning from ${KITCHEN_PLANNING_FROM}` }]
            : []),
        ]}
      />
    </>
  );
}
