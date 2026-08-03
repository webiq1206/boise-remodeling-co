import { MetadataRoute } from 'next';
import { BLOG_POSTS } from '@/shared/blogContent';
import { CITIES, SERVICES } from '@/shared/contentData';
import { GUIDE_PAGES } from '@/shared/guideContent';
import {
  CONTENT_HUBS,
  categoryHubPath,
  guidePath,
  isCategoryHubIndexable,
} from '@/shared/contentHubs';
import { getBaseUrl } from '@/lib/seo';
import { isCityServiceNoindex } from '@/lib/page-metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/services`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/areas`, lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${baseUrl}/estimate`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    {
      url: `${baseUrl}/re-10-repairs-boise`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/remodel-plans-boise`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/testimonials`, lastModified: now, changeFrequency: 'monthly', priority: 0.65 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${baseUrl}/resources`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    {
      url: `${baseUrl}/resources/ada-canyon-permit-flow`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms-of-service`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const servicePages: MetadataRoute.Sitemap = SERVICES.map((s) => ({
    url: `${baseUrl}/services/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  const areaPages: MetadataRoute.Sitemap = CITIES.map((c) => ({
    url: `${baseUrl}/areas/${c.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Noindexed doorway-risk combos must not be advertised in the sitemap; they
  // stay crawlable via internal links but are excluded here (see
  // local-seo-audit/12-technical-plan.md T1).
  const cityServicePages: MetadataRoute.Sitemap = SERVICES.flatMap((s) =>
    CITIES.filter((c) => !isCityServiceNoindex(s.slug, c.slug)).map((c) => ({
      url: `${baseUrl}/services/${s.slug}/${c.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.75,
    })),
  );

  const blogPages: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'yearly' as const,
    priority: 0.6,
  }));

  const guidePages: MetadataRoute.Sitemap = GUIDE_PAGES.map((guide) => ({
    url: `${baseUrl}${guidePath(guide.slug)}`,
    lastModified: new Date(guide.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const categoryHubPages: MetadataRoute.Sitemap = CONTENT_HUBS.flatMap((hub) => {
    const count = BLOG_POSTS.filter((p) => p.hubSlug === hub.hubSlug).length;
    if (!isCategoryHubIndexable(hub.hubSlug, count)) return [];
    return [
      {
        url: `${baseUrl}${categoryHubPath(hub.hubSlug)}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.55,
      },
    ];
  });

  return [
    ...staticPages,
    ...servicePages,
    ...areaPages,
    ...cityServicePages,
    ...guidePages,
    ...blogPages,
    ...categoryHubPages,
  ];
}
