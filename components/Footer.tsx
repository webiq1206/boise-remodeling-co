import { SiteFooter } from "@/components/family/SiteFooter";

/**
 * Boise Remodeling Co footer: the shared family SiteFooter, set up by
 * lib/familyBrand.ts. Everything this site's footer carried is there: every
 * service, the pillar guides, the guides and downloads hubs, the blog, about,
 * design ideas, plans estimate and contact, every service area, the phone,
 * text and email, Save our contact, the public NAP line (publicFooterLine)
 * with hours, the DOPL-linked registration line, the DBA disclosure and the
 * legal links, plus the P5 Home Co family row.
 *
 * hideRegistration: pages that must not state the registration line
 * (registrationPresentation in components/RegistrationLine.tsx).
 */
export function Footer({ hideRegistration = false }: { hideRegistration?: boolean }) {
  return <SiteFooter hideRegistration={hideRegistration} />;
}
