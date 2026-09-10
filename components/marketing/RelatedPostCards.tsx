import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getManifestLinks } from "@/lib/internal-links";

interface RelatedPostCardsProps {
  path: string;
  title?: string;
  limit?: number;
}

export function RelatedPostCards({
  path,
  title = "Related resources",
  limit = 6,
}: RelatedPostCardsProps) {
  const links = getManifestLinks(path).slice(0, limit);
  if (links.length === 0) return null;

  return (
    <div>
      <h2 className="ed-h2-sm ed-statement-wide mb-8">{title}</h2>
      <div className="ed-cards-3 gap-4">
        {links.map((link) => (
          <Link key={link.url} href={link.url} className="block group" aria-label={link.anchor}>
            <article className="ed-card ed-card-link flex h-full min-h-[88px] items-center justify-between gap-5 p-5">
              <p className="ed-h4 text-[1rem] transition-colors group-hover:[color:var(--ed-accent)]">
                {link.anchor}
              </p>
              <ArrowUpRight aria-hidden="true" className="h-5 w-5 shrink-0 opacity-65 transition-opacity group-hover:opacity-100" />
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
