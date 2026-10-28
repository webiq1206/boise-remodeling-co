import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

/**
 * Short ownership handoff for services that live on a sister P5 company (D2).
 * One paragraph, the owning company name, and one outbound button.
 */
export function ServiceReferral({
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  alsoNote,
}: {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  alsoNote?: string;
}) {
  const external = ctaHref.startsWith("http");
  return (
    <section className="f-section f-container" style={{ maxWidth: "42rem", paddingTop: "4rem", paddingBottom: "5rem" }}>
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
            rel="noopener noreferrer"
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
