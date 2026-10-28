import { TextReplyLine } from "@/components/TextReplyLine";
import { HeroConversion } from "./HeroConversion";
import { brands } from "./family-content";
import { SITE_CONFIG } from "@/shared/siteConfig";
import Link from "next/link";

/**
 * Server-rendered home hero. The image and H1 are in the first HTML response
 * with no entrance animation, so LCP does not wait on the client bundle.
 * Phase 7/8: keyword-first H1, one supporting sentence, one primary CTA inside
 * the first viewport on mobile, phone and trust line under it.
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
            One team designs, prices and builds your kitchen, bath or whole-home remodel, with the scope in writing before the price.
          </p>
          <div className="f-hero-cta-stack" style={{ marginTop: "1.25rem", display: "grid", gap: "0.75rem", maxWidth: "22rem" }}>
            <a
              href="#request"
              className="inline-flex min-h-[52px] items-center justify-center rounded-sm bg-[var(--ed-ink,#2C302F)] px-5 text-[0.9375rem] font-medium text-[var(--ed-paper,#FBFAF6)]"
              data-cta="primary"
            >
              Request a quote
            </a>
            <a href={SITE_CONFIG.phoneHref} className="text-[0.9375rem] font-medium underline-offset-2 hover:underline">
              Call or text {SITE_CONFIG.phone}
            </a>
            <p className="text-[0.8125rem] opacity-90">
              Idaho Registered Contractor #8381215. Two-year workmanship warranty.
            </p>
            <Link href="#how-we-build" className="text-[0.875rem] underline-offset-2 hover:underline">
              See how it works
            </Link>
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
