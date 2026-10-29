import { HeroConversion } from "./HeroConversion";
import { brands } from "./family-content";
import { SITE_CONFIG } from "@/shared/siteConfig";

/**
 * Server-rendered home hero. Brand name is a hero-level signal; the image and
 * H1 ship in the first HTML response with no entrance animation so LCP does
 * not wait on the client bundle. Hero budget: brand, headline, support, CTA,
 * one dominant full-bleed photograph.
 */
export function ApprovedHomeHero() {
  const b = brands.remodeling;
  return (
    <>
      <section className="f-hero" data-p5-hero>
        <link rel="preload" as="image" href={b.hero} fetchPriority="high" />
        <img
          src={b.hero}
          alt="Open kitchen and living space with warm wood and stone in a Treasure Valley remodel"
          fetchPriority="high"
          width="1600"
          height="1000"
          className="f-hero-photo"
        />
        <div className="f-hero-shade" aria-hidden="true" />
        <div className="f-hero-copy">
          <p className="f-brand-mark">Boise Remodeling Co</p>
          <h1>
            Design-build remodeling in Boise
            <em> and the Treasure Valley</em>
          </h1>
          <p className="f-hero-support">
            One team designs, prices, and builds kitchens, baths, and whole-home remodels.
          </p>
          <div className="f-hero-cta-stack">
            <a href="#request" className="f-hero-cta-primary" data-cta="primary">
              Request a quote
            </a>
            <a href={SITE_CONFIG.phoneHref} className="f-hero-cta-phone">
              Call or text {SITE_CONFIG.phone}
            </a>
            <p className="f-hero-trust">
              Idaho Registered Contractor #8381215. Two-year warranty.
            </p>
          </div>
        </div>
      </section>

      <section className="home-direct" aria-label="About Boise Remodeling Co">
        <div className="f-container">
          <p data-speakable="summary">
            Boise Remodeling Co is a design-build remodeler in Meridian, Idaho. We write a clear
            scope before any price, then build kitchens, bathrooms, and whole-home remodels across
            the Treasure Valley under one accountable team.
          </p>
        </div>
      </section>

      <section className="fold-request" id="request" aria-label="Request a quote">
        <div className="f-container">
          <p className="fold-lede">
            Tell us what you want remodeled. We reply within one business day with questions or a
            time to visit. You get a written scope before any price.
          </p>
          <HeroConversion />
        </div>
      </section>
    </>
  );
}
