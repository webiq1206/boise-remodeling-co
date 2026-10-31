import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Short ownership handoff for services that live on a sister P5 company (D2).
 * One paragraph, the owning company name, and one outbound button.
 * Optional imageSrc: finished project photo (required for ADU - never empty lot).
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
  return (
    <section className="f-section f-container" style={{ maxWidth: "42rem", paddingTop: "2.5rem", paddingBottom: "5rem" }}>
      {imageSrc ? (
        <figure className="referral-visual" style={{ margin: "0 0 1.75rem", borderRadius: "2px", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={imageAlt || ""}
            width={1280}
            height={720}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </figure>
      ) : null}
      <p className="f-eyebrow">{eyebrow}</p>
      <h1 className="ed-h1" style={{ marginTop: "0.75rem" }}>
        {title}
      </h1>
      <p className="ed-lede" style={{ marginTop: "1.25rem" }}>
        {body}
      </p>
      {alsoNote ? (
        <p className="ed-body" style={{ marginTop: "1rem", color: "var(--muted-foreground, #5c5f5b)" }}>
          {alsoNote}
        </p>
      ) : null}
      <p style={{ marginTop: "2rem" }}>
        {external ? (
          <a
            href={ctaHref}
            className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[var(--ed-ink,#2C302F)] px-5 text-sm font-medium text-[var(--ed-paper,#FBFAF6)]"
            rel="noopener"
            data-cta="primary"
          >
            {ctaLabel}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ) : (
          <Link
            href={ctaHref}
            className="inline-flex min-h-12 items-center gap-2 rounded-sm bg-[var(--ed-ink,#2C302F)] px-5 text-sm font-medium text-[var(--ed-paper,#FBFAF6)]"
            data-cta="primary"
          >
            {ctaLabel}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        )}
      </p>
      <p className="ed-body" style={{ marginTop: "1.5rem" }}>
        Looking for kitchen, bath, or whole-home remodeling?{" "}
        <Link href="/#request" className="underline underline-offset-2">
          Request a quote from Boise Remodeling Co
        </Link>
        .
      </p>
    </section>
  );
}
