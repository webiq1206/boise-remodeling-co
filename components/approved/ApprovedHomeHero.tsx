import { TextReplyLine } from "@/components/TextReplyLine";
import { contractorDescription } from "@/lib/schema";
import { HeroConversion } from "./HeroConversion";
import { brands } from "./family-content";

/**
 * Server-rendered home hero. The image and H1 are in the first HTML response
 * with no entrance animation, so LCP does not wait on the client bundle.
 * The short request follows the hero. It is not inside the first screen.
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
          <h1>
            Boise home remodeling.
            <br />
            <em>Love where you live.</em>
          </h1>
          <p className="f-hero-summary">{contractorDescription()}</p>
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
