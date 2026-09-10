import Image from "next/image";
import Link from "next/link";
import { getManifestLinks } from "@/lib/internal-links";
import { getBlogImageAlt, getBlogThumbnail } from "@/shared/blogImages";
import { BLOG_POSTS } from "@/shared/blogContent";
import { GUIDE_PAGES } from "@/shared/guideContent";

interface RelatedPostCardsProps {
  path: string;
  title?: string;
  limit?: number;
}

function slugFromUrl(url: string): string | undefined {
  const pathname = url.split("?")[0].split("#")[0];
  const blogMatch = pathname.match(/\/blog\/([^/]+)$/);
  if (blogMatch) return blogMatch[1];
  const guideMatch = pathname.match(/\/guides\/([^/]+)$/);
  if (guideMatch) return guideMatch[1];
  return undefined;
}

function imageForUrl(url: string): { src: string; alt: string } | null {
  const slug = slugFromUrl(url);
  if (slug) {
    const post = BLOG_POSTS.find((p) => p.slug === slug);
    if (post) {
      return {
        src: getBlogThumbnail(post.slug, post.thumbnail),
        alt: getBlogImageAlt(post.slug),
      };
    }
    const guide = GUIDE_PAGES.find((g) => g.slug === slug);
    if (guide) {
      return {
        src: getBlogThumbnail(guide.slug, guide.heroImage),
        alt: getBlogImageAlt(guide.slug),
      };
    }
  }

  // Location links use text cards instead of repeating one service image.

  return null;
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
      <div className="ed-cards-3 gap-5">
        {links.map((link) => {
          const image = imageForUrl(link.url);
          return (
            <Link key={link.url} href={link.url} className="block group" aria-label={link.anchor}>
              <article className="ed-card ed-card-link h-full overflow-hidden p-0">
                {image && (
                  <div className="relative aspect-[16/9]">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="400px"
                      className="object-cover img-brand-grade"
                    />
                  </div>
                )}
                <p className="ed-h4 p-5 text-[1rem] transition-colors group-hover:[color:var(--ed-accent)]">
                  {link.anchor}
                </p>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
