import { HeroPhoto } from "@/components/family/HeroPhoto";
import { ProofStrip } from "@/components/family/ProofStrip";
import { DOPL_LICENSE_SEARCH, REGISTRATION_LINE } from "@/components/RegistrationLine";
import { FAMILY_BRAND } from "@/lib/familyBrand";
import { SERVICES } from "@/shared/contentData";

/** The published "planning from" figure on the kitchen service page, read from the same data. */
const KITCHEN_PLANNING_FROM = SERVICES.find((service) => service.slug === "kitchen-remodel")?.planningFrom;

/**
 * Homepage hero on the shared family HeroPhoto, restoring the October 8
 * composition (commit 39979f5): the kitchen-island photograph, a directional
 * scrim, two declaratives with the second line in the brand accent, one CTA and
 * one quiet link. The second line is not the October 8 tagline: the owner's
 * homepage SEO commit (#108) removed that phrase as an accent line.
 *
 * The CTA goes where every other "Request a quote" on the site goes, the short
 * request in the final CTA band (/#request): one label, one destination, as the
 * approved checks pin it. Server-rendered, so the image and H1 are in the first HTML.
 */
export function ApprovedHomeHero() {
  return (
    <>
      <HeroPhoto
        image={{
          src: "/family/remodeling-hero-kitchen-island.webp",
          width: 1536,
          height: 1024,
          position: "62% 50%",
          alt: "Representative open kitchen with a dark island, glass pendant lights and white cabinets",
        }}
        phoneImage={{
          src: "/family/remodeling-hero-kitchen-island-phone.webp",
          width: 760,
          height: 1024,
          position: "50% 30%",
        }}
        eyebrow="Design-build remodeling in Boise"
        title="Boise home remodeling."
        titleAccent="One team, start to finish."
        support="We design, price and build kitchens, baths and whole-home remodels."
        primary={{ label: FAMILY_BRAND.cta.label, href: FAMILY_BRAND.cta.href }}
        link={{ label: `Call or text ${FAMILY_BRAND.phone.display}`, href: FAMILY_BRAND.phone.telHref }}
        microcopy="Free in-home visit, no obligation."
        // White cabinetry in daylight: the standard scrim measured under 3:1 behind the accent line.
        scrim="strong"
      />
      {/* Facts already published on this site, nothing new: the DOPL-linked registration,
          the written scope, the warranty term and the kitchen planning-from figure. */}
      <ProofStrip
        items={[
          {
            label: "Registered",
            text: REGISTRATION_LINE,
            href: DOPL_LICENSE_SEARCH,
            linkTitle: "Look up registration 8381215 on Idaho DOPL",
            newTab: true,
          },
          { label: "Scope first", text: "Written scope before any price" },
          { label: "Warranty", text: "Two-year workmanship warranty" },
          ...(KITCHEN_PLANNING_FROM
            ? [{ label: "Planning", text: `Kitchen remodels planning from ${KITCHEN_PLANNING_FROM}` }]
            : []),
        ]}
      />
    </>
  );
}
