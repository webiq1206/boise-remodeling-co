/**
 * The single source of truth for every public, indexable URL on this site.
 *
 * Both the XML sitemap (app/sitemap.ts, for crawlers) and the HTML sitemap page
 * (app/sitemap/page.tsx, a live crawl path and a human index) are built from
 * these groups. That is the point: two separately maintained lists WILL drift,
 * and a page the HTML sitemap forgets is a page the crawler may never reach
 * through internal links. One list, two renderings.
 *
 * Rules mirror the XML sitemap exactly - noindexed city×service combos and
 * thin category hubs are excluded here for the same reasons they are excluded
 * there (see local-seo-audit/12-technical-plan.md T1).
 */
import { BLOG_POSTS } from '@/shared/blogContent';
import { CITIES, SERVICES } from '@/shared/contentData';
import { GUIDE_PAGES } from '@/shared/guideContent';
import {
  CONTENT_HUBS,
  categoryHubPath,
  guidePath,
  isCategoryHubIndexable,
} from '@/shared/contentHubs';
import { isCityServiceNoindex } from '@/lib/page-metadata';

export type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SiteUrlEntry {
  /** Site-relative path, always starting with "/". "/" is the homepage. */
  path: string;
  /** Human-readable label for the HTML sitemap. */
  label: string;
  changeFrequency: ChangeFrequency;
  priority: number;
  /** When known per page (blog/guide publish dates). Omitted = unknown. */
  lastModified?: Date;
}

export interface SiteUrlGroup {
  /** Section heading on the HTML sitemap. */
  heading: string;
  entries: SiteUrlEntry[];
}

export function getSiteUrlGroups(): SiteUrlGroup[] {
  const core: SiteUrlEntry[] = [
    { path: '/', label: 'Home', changeFrequency: 'weekly', priority: 1 },
    { path: '/services', label: 'Services', changeFrequency: 'monthly', priority: 0.85 },
    { path: '/about', label: 'About', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/areas', label: 'Service areas', changeFrequency: 'monthly', priority: 0.75 },
    { path: '/estimate', label: 'Get an estimate', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/re-10-repairs-boise', label: 'RE-10 and inspection repairs', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/remodel-plans-boise', label: 'Remodel plans', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/testimonials', label: 'Testimonials', changeFrequency: 'monthly', priority: 0.65 },
    { path: '/contact', label: 'Contact', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/resources', label: 'Resources', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/resources/ada-canyon-permit-flow', label: 'Ada vs Canyon County permit flow', changeFrequency: 'monthly', priority: 0.65 },
    { path: '/blog', label: 'Blog', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/guides', label: 'Guides', changeFrequency: 'weekly', priority: 0.85 },
    { path: '/sitemap', label: 'Site map', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/privacy-policy', label: 'Privacy policy', changeFrequency: 'yearly', priority: 0.3 },
    { path: '/terms-of-service', label: 'Terms of service', changeFrequency: 'yearly', priority: 0.3 },
  ];

  const services: SiteUrlEntry[] = SERVICES.map((s) => ({
    path: `/services/${s.slug}`,
    label: s.name,
    changeFrequency: 'monthly',
    priority: 0.85,
  }));

  const areas: SiteUrlEntry[] = CITIES.map((c) => ({
    path: `/areas/${c.slug}`,
    label: c.name,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // Noindexed doorway-risk combos are excluded, exactly as in the XML sitemap.
  const cityServices: SiteUrlEntry[] = SERVICES.flatMap((s) =>
    CITIES.filter((c) => !isCityServiceNoindex(s.slug, c.slug)).map((c) => ({
      path: `/services/${s.slug}/${c.slug}`,
      label: `${s.name} in ${c.name}`,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
  );

  const guides: SiteUrlEntry[] = GUIDE_PAGES.map((g) => ({
    path: guidePath(g.slug),
    label: g.title,
    changeFrequency: 'monthly',
    priority: 0.9,
    lastModified: new Date(g.updatedAt ?? g.publishedAt),
  }));

  const blog: SiteUrlEntry[] = BLOG_POSTS.map((p) => ({
    path: `/blog/${p.slug}`,
    label: p.title,
    changeFrequency: 'yearly',
    priority: 0.6,
    lastModified: new Date(p.updatedAt ?? p.publishedAt),
  }));

  const hubs: SiteUrlEntry[] = CONTENT_HUBS.flatMap((hub) => {
    const count = BLOG_POSTS.filter((p) => p.hubSlug === hub.hubSlug).length;
    if (!isCategoryHubIndexable(hub.hubSlug, count)) return [];
    return [{
      path: categoryHubPath(hub.hubSlug),
      label: hub.title,
      changeFrequency: 'weekly' as const,
      priority: 0.55,
    }];
  });

  return [
    { heading: 'Main pages', entries: core },
    { heading: 'Services', entries: services },
    { heading: 'Service areas', entries: areas },
    { heading: 'Services by city', entries: cityServices },
    { heading: 'Guides', entries: guides },
    { heading: 'Blog topics', entries: hubs },
    { heading: 'Blog posts', entries: blog },
  ];
}

/** Flat list, for the XML sitemap. */
export function getAllSiteUrls(): SiteUrlEntry[] {
  return getSiteUrlGroups().flatMap((g) => g.entries);
}
