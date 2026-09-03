import Image from "next/image";
import Link from "next/link";
import { getManifestLinks } from "@/lib/internal-links";
import { getBlogImageAlt, getBlogThumbnail } from "@/shared/blogImages";
import { BLOG_POSTS } from "@/shared/blogContent";
import { GUIDE_PAGES } from "@/shared/guideContent";
import { getCityServiceImage } from "@/shared/cityServiceImages";
import { MarketingCard } from "./MarketingCard";

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

  const csImage = getCityServiceImage(url);
  if (csImage) {
    return { src: csImage, alt: "Boise Remodeling Co project photography" };
  }

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
      <h2 className="font-serif text-section-title mb-6 text-foreground">{title}</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {links.map((link) => {
          const image = imageForUrl(link.url);
          return (
            <Link key={link.url} href={link.url} className="block group">
              <MarketingCard className="overflow-hidden hover-elevate h-full">
                {image && (
                  <div className="relative aspect-[16/9] -mx-6 -mt-6 md:-mx-8 md:-mt-8 mb-4">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="400px"
                      className="object-cover img-brand-grade"
                    />
                  </div>
                )}
                <p className="text-sm font-normal text-foreground group-hover:text-foreground/70 transition-colors">
                  {link.anchor}
                </p>
              </MarketingCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
