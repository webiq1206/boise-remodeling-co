import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getManifestLinks, type ManifestLink } from "@/lib/internal-links";
import { getBlogHeroImage, getBlogImageAlt } from "@/shared/blogImages";
import { getCityServiceImage } from "@/shared/cityServiceImages";
import { contentImageAlt } from "@/shared/contentImageAlt";
import { imageIdentity } from "@/shared/imageIdentity";

interface RelatedPostCardsProps {
  path: string;
  title?: string;
  limit?: number;
  /**
   * "cards": a photograph above each title, for articles and guides.
   * "list": compact ruled links, for landing pages that already carry photography.
   */
  variant?: "cards" | "list";
  /** Links the page already shows elsewhere. They are not repeated here. */
  exclude?: readonly string[];
}

const KIND_LABEL: Record<string, string> = {
  blog: "Article",
  guide: "Guide",
  service: "Service",
  city: "Service area",
};

/** The photograph that belongs to a related page, with its own description. */
function linkImage(link: ManifestLink): { src: string; alt: string } | undefined {
  const [section, slug] = link.url.split("/").filter(Boolean);
  if ((section === "blog" || section === "guides") && slug) {
    return { src: getBlogHeroImage(slug), alt: getBlogImageAlt(slug) };
  }
  const src = getCityServiceImage(link.url);
  return src ? { src, alt: contentImageAlt(src) } : undefined;
}

export function RelatedPostCards({
  path,
  title = "Related resources",
  limit = 6,
  variant = "cards",
  exclude = [],
}: RelatedPostCardsProps) {
  const skip = new Set(exclude);
  const links = getManifestLinks(path).filter((link) => !skip.has(link.url)).slice(0, limit);
  if (links.length === 0) return null;

  if (variant === "list") {
    return (
      <div>
        <h2 className="ed-h4 mb-6">{title}</h2>
        <ul className="ed-rule-list lx-related-list">
          {links.map((link) => (
            <li key={link.url}>
              <Link href={link.url} className="ed-rule-link">
                {link.anchor}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // No photograph twice: a link whose picture is already on a card waits behind the others.
  const seen = new Set<string>();
  const fresh: ManifestLink[] = [];
  const repeats: ManifestLink[] = [];
  for (const link of getManifestLinks(path).filter((item) => !skip.has(item.url))) {
    const image = linkImage(link);
    const id = image ? imageIdentity(image.src) : link.url;
    if (seen.has(id)) repeats.push(link);
    else {
      seen.add(id);
      fresh.push(link);
    }
  }
  const ordered = [...fresh, ...repeats];
  // Three or six cards fill their rows; any other count would leave one alone.
  const shown = ordered.length >= 6 && fresh.length >= 6 ? ordered.slice(0, 6) : ordered.slice(0, 3);
  return (
    <div>
      <h2 className="ed-h2-sm ed-statement-wide mb-8">{title}</h2>
      <div className="lx-related">
        {shown.map((link) => {
          const image = linkImage(link);
          return (
            <Link key={link.url} href={link.url} className="lx-related-card group" aria-label={link.anchor}>
              {image && (
                <span className="lx-related-photo">
                  <Image src={image.src} alt={image.alt} fill sizes="(max-width: 700px) 112px, 400px" className="object-cover img-brand-grade" />
                </span>
              )}
              <span className="lx-related-copy">
                <span className="lx-related-kind">{KIND_LABEL[link.type] ?? "Related"}</span>
                <span className="ed-h4 group-hover:underline group-hover:underline-offset-4">{link.anchor}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
