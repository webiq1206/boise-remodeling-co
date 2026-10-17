import { contractorDescription } from "@/lib/schema";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { brands } from "./family-content";

const Arrow = () => <ArrowUpRight size={18} aria-hidden="true" />;

/**
 * Server-rendered home hero. The image and H1 are in the first HTML response
 * with no entrance animation, so LCP does not wait on the client bundle.
 */
export function ApprovedHomeHero() {
  const b = brands.remodeling;
  return (
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
        <p>{contractorDescription()}</p>
        <p>{b.intro}</p>
        <div className="f-actions">
          <a className="f-button" href="/estimate">
            {b.action}
            <Arrow />
          </a>
          <a className="f-link" href="#services">
            {b.secondary}
            <ArrowRight size={18} />
          </a>
        </div>
        <span className="estimator-promise">
          Describe your project. Our team will review it and prepare your estimate.
        </span>
      </div>
    </section>
  );
}
