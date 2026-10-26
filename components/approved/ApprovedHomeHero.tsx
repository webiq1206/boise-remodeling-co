import { TextReplyLine } from "@/components/TextReplyLine";
import { HeroConversion } from "./HeroConversion";
import { brands } from "./family-content";

/**
 * Server-rendered home hero. The image and H1 are in the first HTML response
 * with no entrance animation, so LCP does not wait on the client bundle.
 * The supporting line sits under the H1, on the photograph. The direct answer
 * follows the hero, then the short request. The request is not inside the
 * first screen.
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
          <h1>Home remodeling contractors in Boise</h1>
          <p className="f-hero-support">
            Love where you live. Design-build remodeling for Boise and the Treasure Valley.
          </p>
        </div>
      </section>
      <section className="home-direct">
        <div className="f-container">
          <p>
            Home remodeling contractors in Boise should give you a clear plan before anyone opens a wall. Boise Remodeling Co is a design-build team for kitchens, bathrooms, additions, and whole-home work across Ada and Canyon County. Book a free in-home visit, get planning ranges in writing, and move ahead with a dedicated project manager when you are ready.
          </p>
        </div>
      </section>
      <section className="fold-request" id="request" aria-label="Request a call">
        <div className="f-container">
          <p className="fold-lede">
            Tell us what to fix or renovate. We follow up within one business day.{" "}
            <TextReplyLine as="span" className="fold-text-reply" />
          </p>
          <HeroConversion />
        </div>
      </section>
    </>
  );
}
