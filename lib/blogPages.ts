import type { BlogPostData } from '@/shared/blogContent';

/**
 * The blog index paging rules and the card summary, with no post content.
 * The client index imports only this (type imports are erased), so the article
 * bodies stay on the server; lib/blogPagination.ts builds the lists from
 * BLOG_POSTS.
 */
export const BLOG_PAGE_SIZE = 12;

export function blogPageCountFor(total: number): number {
  return Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
}

export function blogPagePath(page: number): string {
  return page <= 1 ? '/blog' : `/blog/page/${page}`;
}

/** What a blog card and the topic filter read. Never the article body. */
export type BlogIndexPost = Pick<BlogPostData, 'slug' | 'title' | 'excerpt' | 'category' | 'hubSlug' | 'publishedAt' | 'thumbnail'>;
