import { HeroConversion } from "./HeroConversion";
import { brands } from "./family-content";
import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * Server-rendered home hero. The image and H1 are in the first HTML response
 * with no entrance animation, so LCP does not wait on the client bundle.
 * C3: brand, one headline, one support line, one primary CTA in the first screen.
 */
export function ApprovedHomeHero() {
  const b = brands.remodeling;
  return (
    <>
      <section className="f-hero">
        <link rel="preload" as="image" href={b.hero} fetchPriority="high" />
        <img
          src={b.hero}
          alt="Open kitchen and living space with warm wood and stone"
          fetchPriority="high"
          width="1600"
          height="1000"
        />
        <div className="f-hero-shade" />
        <div className="f-hero-copy">
          <p className="f-eyebrow">{b.kicker}</p>
          <h1>Design-build remodeling in Boise and the Treasure Valley</h1>
          <p className="f-hero-support">
            One team designs, prices and builds kitchens, baths and whole-home remodels.
          </p>
          <div className="f-hero-cta-stack">
            <a
              href="#request"
              className="f-hero-cta-primary"
              data-cta="primary"
            >
              Request a quote
            </a>
            <a href={SITE_CONFIG.phoneHref} className="f-hero-cta-phone">
              Call or text {SITE_CONFIG.phone}
            </a>
            {/* C5: one true reassurance line near the primary CTA */}
            <p className="f-hero-trust">
              Idaho Registered Contractor #8381215. Two-year warranty.
            </p>
          </div>
        </div>
      </section>
      <section className="fold-request" id="request" aria-label="Request a quote">
        <div className="f-container">
          <p className="fold-lede">
            Tell us what you want remodeled. We reply within one business day with questions or a time to visit. You get a written scope before any price.
          </p>
          <HeroConversion />
        </div>
      </section>
    </>
  );
}
