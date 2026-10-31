import { WAVE1_COST_CLUSTERS } from './blogPostsData';
import { ALL_HUB_CLUSTER_POSTS } from './allHubsContent';
import { LEGACY_BLOG_POSTS } from './legacyBlogPosts';
import { WAVE2_POSTS } from './wave2';
import MERGED_POSTS from './mergedPosts.json';

/**
 * Phase 4: sixteen 230 to 320 word factory twins merged into their long twin
 * or guide. Each slug 301s (next.config.js reads the same file) and leaves the
 * post list, the sitemap and every generated link block. Unique facts were
 * carried into the destination first. All sixteen had fewer than 20 Search
 * Console impressions from 1 June to 29 October 2026.
 */
export const MERGED_POST_DESTINATIONS: Record<string, string> = MERGED_POSTS;
export const isMergedPost = (slug: string) => slug in MERGED_POST_DESTINATIONS;

// Wave 2 bespoke posts supersede any thin factory cluster with the same slug.
const supersededSlugs = new Set(WAVE2_POSTS.map((p) => p.slug));
const priorPosts = [
  ...WAVE1_COST_CLUSTERS,
  ...ALL_HUB_CLUSTER_POSTS,
  ...LEGACY_BLOG_POSTS,
].filter((p) => !supersededSlugs.has(p.slug) && !isMergedPost(p.slug));

export const ALL_BLOG_POSTS = [...WAVE2_POSTS, ...priorPosts];
