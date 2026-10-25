import { contractorDescription } from "@/lib/schema";
import { HeroConversion } from "./HeroConversion";
import { brands } from "./family-content";

/**
 * Server-rendered home hero. The image and H1 are in the first HTML response
 * with no entrance animation, so LCP does not wait on the client bundle.
 */
export function ApprovedHomeHero() {
  const b = brands.remodeling;
  return (
    <section className="f-hero fold-hero" id="request">
      <div className="fold-hero-photo">
        <link rel="preload" as="image" href={b.hero} fetchPriority="high" />
        <img
          src={b.hero}
          alt="Open kitchen and living space with warm wood and stone"
          fetchPriority="high"
          width="1600"
          height="1000"
        />
      </div>
      <div className="f-hero-copy fold-hero-copy">
        <p className="f-eyebrow">{b.kicker}</p>
        <h1>
          Boise home remodeling.
          <br />
          <em>Love where you live.</em>
        </h1>
        <p className="f-hero-summary">{contractorDescription()}</p>
        <p className="fold-lede">
          Tell us what to fix or renovate. We follow up within one business day.
        </p>
        <HeroConversion />
      </div>
    </section>
  );
}
