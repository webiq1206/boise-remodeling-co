import { BLOG_POSTS, type BlogPostData } from '@/shared/blogContent';
import { BLOG_PAGE_SIZE, blogPageCountFor, blogPagePath, type BlogIndexPost } from '@/lib/blogPages';

export { BLOG_PAGE_SIZE, blogPagePath, type BlogIndexPost };

/**
 * Blog index pagination. The index rendered every post on one page (about
 * 35,000px tall on a phone); it now shows twelve per page, newest first, with
 * crawlable links: /blog is page 1, /blog/page/2 onward are the rest. Each
 * paginated page carries a self-referencing canonical.
 */
export function sortedBlogPosts(): BlogPostData[] {
  return [...BLOG_POSTS].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function blogPageCount(total: number = BLOG_POSTS.length): number {
  return blogPageCountFor(total);
}

/**
 * Every post, newest first, as card summaries for the client index (the topic
 * chips filter across all of them). Passed as props so the client bundle never
 * carries the article bodies.
 */
export function blogIndexPosts(): BlogIndexPost[] {
  return sortedBlogPosts().map(({ slug, title, excerpt, category, hubSlug, publishedAt, thumbnail }) => ({
    slug, title, excerpt, category, hubSlug, publishedAt, ...(thumbnail ? { thumbnail } : {}),
  }));
}

export function blogPostsForPage(page: number, posts: BlogPostData[] = sortedBlogPosts()): BlogPostData[] {
  const start = (page - 1) * BLOG_PAGE_SIZE;
  return posts.slice(start, start + BLOG_PAGE_SIZE);
}

/** Pages 2..N, for generateStaticParams. */
export function blogPaginatedPages(): number[] {
  return Array.from({ length: blogPageCount() - 1 }, (_, i) => i + 2);
}
