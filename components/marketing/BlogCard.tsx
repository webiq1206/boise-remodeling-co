import { toSentenceCase } from '@/shared/sentenceCase';
import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { MarketingCard } from "./MarketingCard";
import { TextLink } from "./TextLink";
import { Chip } from "./Chip";
import type { BlogIndexPost } from "@/lib/blogPages";
import { getBlogImageAlt, getBlogThumbnail } from "@/shared/blogImages";

export interface BlogCardProps {
  post: BlogIndexPost;
  featured?: boolean;
  formatDate: (date: string) => string;
}

export function BlogCard({ post, featured = false, formatDate }: BlogCardProps) {
  const thumbnail = getBlogThumbnail(post.slug, post.thumbnail);
  const alt = getBlogImageAlt(post.slug);
  const href = `/blog/${post.slug}`;
  const hasSummary = post.excerpt.trim().toLowerCase() !== post.title.trim().toLowerCase();

  if (featured) {
    return (
      <article className="marketing-card overflow-hidden hover-elevate group relative">
        <Link href={href} className="absolute inset-0 z-0" aria-label={post.title} />
        <div className="relative aspect-[21/9] md:aspect-[2.4/1] overflow-hidden">
          <Image
            src={thumbnail}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 1200px"
            className="object-cover img-brand-grade transition-transform duration-300 ease-out group-hover:scale-[1.01]"
            priority
          />
        </div>
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <Chip>{post.category}</Chip>
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(post.publishedAt)}
            </span>
          </div>
          <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-foreground mb-3">
            {toSentenceCase(post.title)}
          </h2>
          {hasSummary && <p className="text-muted-foreground leading-relaxed line-clamp-2 max-w-2xl">
            {post.excerpt}
          </p>}
          <TextLink href={href} className="mt-auto pt-4 relative z-10" showArrow>
            Read article
          </TextLink>
        </div>
      </article>
    );
  }

  return (
    <MarketingCard padding="none" className="h-full flex flex-col overflow-hidden hover-elevate group relative">
      <Link href={href} className="absolute inset-0 z-0" aria-label={post.title} />
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={thumbnail}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover img-brand-grade transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex flex-col items-start gap-2 mb-3">
          <Chip>{post.category}</Chip>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(post.publishedAt)}
          </span>
        </div>
        <h3 className="text-lg font-serif tracking-tight text-foreground text-balance mb-2">
          {toSentenceCase(post.title)}
        </h3>
        {hasSummary && <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>}
        <TextLink href={href} className="mt-auto pt-4 relative z-10" showArrow>
          Read article
        </TextLink>
      </div>
    </MarketingCard>
  );
}
