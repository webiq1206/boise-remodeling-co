import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Ownership handoff for services that live on a sister P5 company (D2).
 * An editorial split: the explanation on the left at interior-hero scale, and
 * on the right a bone panel that holds the one outbound action (and the project
 * photograph when one is supplied), so the handoff reads as a designed page
 * rather than a paragraph floating in white space.
 */
export function ServiceReferral({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  alsoNote,
  imageSrc,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  alsoNote?: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  const external = ctaHref.startsWith("http");
  const buttonClass = "f-button f-dark";
  return (
    <section className="f-section f-container referral" aria-labelledby="referral-title">
      <div className="referral-grid">
        <div>
          <p className="f-eyebrow">{eyebrow}</p>
          <h1 id="referral-title" className="referral-title">{title}</h1>
          <p className="ed-lede referral-lede">{body}</p>
          {alsoNote ? <p className="ed-body referral-note">{alsoNote}</p> : null}
          <p className="ed-body referral-back">
            Looking for kitchen, bath, or whole-home remodeling?{" "}
            <Link href="/#request" className="underline underline-offset-2">
              Request a quote from Boise Remodeling Co
            </Link>
            .
          </p>
        </div>
        <aside className="referral-panel">
          {imageSrc ? (
            <figure className="referral-visual">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt={imageAlt || ""} width={1280} height={720} />
            </figure>
          ) : null}
          <div className="referral-panel-body">
            <p className="f-eyebrow">Next step</p>
            <p className="referral-panel-title">Send the list and photos. One written price comes back before any work starts.</p>
            {external ? (
              <a href={ctaHref} className={buttonClass} rel="noopener" data-cta="primary">
                {ctaLabel} <ArrowUpRight size={18} aria-hidden="true" />
              </a>
            ) : (
              <Link href={ctaHref} className={buttonClass} data-cta="primary">
                {ctaLabel} <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
