import { BLOG_POSTS, type BlogPostData } from "../../shared/blogContent";
import { GUIDE_PAGES } from "../../shared/guideContent";
import { getHubBySlug, getHubPillarSlug, guidePath } from "../../shared/contentHubs";
import { PRIORITY_SERVICES, CITIES, type ServiceData, type CityData } from "../../shared/contentData";
import { isCityServiceNoindex } from "../../lib/page-metadata";

export type PageType = "blog" | "guide" | "service" | "city" | "city-service";

export interface PageNode {
  id: string;
  type: PageType;
  url: string;
  title: string;
  anchor: string;
  category: string;
  tags: string[];
  hubSlug?: string;
  serviceSlug?: string;
  citySlug?: string;
  tokens: Set<string>;
  overrides?: Array<{ url: string; anchor?: string; forced?: boolean }>;
}

export interface LinkEntry {
  url: string;
  anchor: string;
  title: string;
  type: PageType;
  score: number;
}

export interface Manifest {
  generatedAt: null;
  counts: { blog: number; guide: number; service: number; city: number; cityService: number };
  pages: Record<string, {
    type: PageType;
    title: string;
    anchor: string;
    url: string;
    links: LinkEntry[];
  }>;
  incoming: Record<string, number>;
  blogByCategory: Record<string, Array<{ slug: string; title: string; publishedAt: string }>>;
}

const STOPWORDS = new Set([
  "a","an","and","are","as","at","be","but","by","for","from","has","have","how",
  "i","if","in","is","it","its","of","on","or","so","that","the","their","then",
  "there","they","this","to","was","were","what","when","where","which","who",
  "why","will","with","you","your","yours","do","does","did","not","no","yes",
  "we","our","us","my","me","mine","over","under","into","out","up","down","more",
  "most","less","least","than","also","just","like","such","very","really","can",
  "could","should","would","may","might","one","two","three","other","others",
  "all","any","some","make","makes","made","get","gets","got","go","goes","going",
  "about","after","before","between","because","being","been","via","near","off",
  "id","idaho","kuna","boise","treasure","valley","ada","county","canyon",
  "service","services","page","pages","guide","guides","tips","tip",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function tokenSet(...parts: string[]): Set<string> {
  const set = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    for (const t of tokenize(p)) set.add(t);
  }
  return set;
}

function serviceTitleAnchor(s: ServiceData): string {
  return s.name;
}

function serviceDisplayTitle(s: ServiceData): string {
  return `${s.name} in Boise & Treasure Valley, Idaho`;
}

function cityAnchor(c: CityData): string {
  return `Remodeling in ${c.name}`;
}

function cityServiceAnchor(s: ServiceData, c: CityData): string {
  return `${s.name} in ${c.name}`;
}

export function buildCanonicalRoutes(): string[] {
  const routes: string[] = [];
  for (const post of BLOG_POSTS) routes.push(`/blog/${post.slug}`);
  for (const guide of GUIDE_PAGES) routes.push(guidePath(guide.slug));
  for (const svc of PRIORITY_SERVICES) routes.push(`/services/${svc.slug}`);
  for (const city of CITIES) routes.push(`/areas/${city.slug}`);
  for (const svc of PRIORITY_SERVICES) {
    for (const city of CITIES) routes.push(`/services/${svc.slug}/${city.slug}`);
  }
  return routes;
}

export function buildPages(): PageNode[] {
  const pages: PageNode[] = [];

  for (const post of BLOG_POSTS) {
    const hub = getHubBySlug(post.hubSlug);
    const pillarSlug = getHubPillarSlug(post.hubSlug);
    const pillarPublished = GUIDE_PAGES.some((g) => g.slug === pillarSlug);
    const pillarOverride =
      pillarSlug && pillarPublished
        ? [{ url: guidePath(pillarSlug), anchor: hub?.title ?? "Guide", forced: true }]
        : [];
    const overrides = [...pillarOverride, ...(post.relatedLinks ?? [])];
    pages.push({
      id: `blog:${post.slug}`,
      type: "blog",
      url: `/blog/${post.slug}`,
      title: post.title,
      anchor: post.title,
      category: post.category,
      hubSlug: post.hubSlug,
      tags: post.tags ?? [],
      tokens: tokenSet(
        post.title,
        post.excerpt,
        (post.tags ?? []).join(" "),
        post.category,
        post.hubSlug,
      ),
      overrides,
    });
  }

  for (const guide of GUIDE_PAGES) {
    pages.push({
      id: `guide:${guide.slug}`,
      type: "guide",
      url: guidePath(guide.slug),
      title: guide.title,
      anchor: guide.title,
      category: guide.hubSlug,
      hubSlug: guide.hubSlug,
      tags: guide.tags ?? [],
      tokens: tokenSet(guide.title, guide.excerpt, (guide.tags ?? []).join(" "), guide.hubSlug),
      overrides: guide.relatedLinks ?? [],
    });
  }

  for (const svc of PRIORITY_SERVICES) {
    pages.push({
      id: `service:${svc.slug}`,
      type: "service",
      url: `/services/${svc.slug}`,
      title: serviceDisplayTitle(svc),
      anchor: serviceTitleAnchor(svc),
      category: "remodeling",
      tags: [svc.slug],
      serviceSlug: svc.slug,
      tokens: tokenSet(svc.name, svc.shortDescription, svc.slug.replace(/-/g, " ")),
      overrides: [],
    });
  }

  for (const city of CITIES) {
    pages.push({
      id: `city:${city.slug}`,
      type: "city",
      url: `/areas/${city.slug}`,
      title: `Remodeling Services in ${city.name}, Idaho`,
      anchor: cityAnchor(city),
      category: "city",
      tags: [city.slug, city.county],
      citySlug: city.slug,
      tokens: tokenSet(city.name, city.county, "remodeling", "idaho"),
    });
  }

  for (const svc of PRIORITY_SERVICES) {
    for (const city of CITIES) {
      pages.push({
        id: `city-service:${svc.slug}__${city.slug}`,
        type: "city-service",
        url: `/services/${svc.slug}/${city.slug}`,
        title: `${svc.name} in ${city.name}, Idaho`,
        anchor: cityServiceAnchor(svc, city),
        category: "remodeling",
        tags: [svc.slug, city.slug],
        serviceSlug: svc.slug,
        citySlug: city.slug,
        tokens: tokenSet(svc.name, city.name, svc.shortDescription, svc.slug.replace(/-/g, " ")),
      });
    }
  }

  return pages;
}

const SERVICE_BOOST = 0.15;
const SAME_CATEGORY_BONUS = 0.3;
const SAME_HUB_BONUS = 0.35;
const SHARED_SERVICE_BONUS = 0.5;
const SHARED_CITY_BONUS = 0.3;
const SHARED_TAG_BONUS = 0.1;
const GUIDE_BOOST = 0.12;

/**
 * Soft cap on how many non-override inbound links any single target may collect.
 * Prevents authority over-concentration (e.g. the cost guide previously had ~74
 * incoming, ~10x the site average, diluting link equity). Forced overrides
 * (hub pillars) bypass this cap so canonical hub relationships stay intact.
 */
const MAX_INCOMING = 18;

/**
 * Extra similarity for targets in hubs that are otherwise under-linked, so weak
 * clusters (e.g. outdoor-living) earn inbound links organically rather than
 * relying only on the min-incoming floor. See seo-audit/internal-link-map.md.
 */
const UNDERLINKED_HUB_BOOST: Record<string, number> = {
  'outdoor-living': 0.15,
};

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function similarity(from: PageNode, to: PageNode): number {
  if (from.id === to.id) return -1;

  let score = jaccard(from.tokens, to.tokens);

  if (from.category && from.category === to.category) score += SAME_CATEGORY_BONUS;
  if (from.hubSlug && to.hubSlug && from.hubSlug === to.hubSlug) score += SAME_HUB_BONUS;
  if (from.serviceSlug && to.serviceSlug && from.serviceSlug === to.serviceSlug) {
    score += SHARED_SERVICE_BONUS;
  }
  if (from.citySlug && to.citySlug && from.citySlug === to.citySlug) {
    score += SHARED_CITY_BONUS;
  }

  const fromTagSet = new Set(from.tags.map((t) => t.toLowerCase()));
  for (const t of to.tags) if (fromTagSet.has(t.toLowerCase())) score += SHARED_TAG_BONUS;

  if (to.type === "service") score += SERVICE_BOOST;
  if (to.type === "guide") score += GUIDE_BOOST;
  if (to.hubSlug && UNDERLINKED_HUB_BOOST[to.hubSlug]) {
    score += UNDERLINKED_HUB_BOOST[to.hubSlug];
  }

  return score;
}

function targetLimit(from: PageNode): number {
  if (from.type === "blog") return 6;
  if (from.type === "guide") return 8;
  return 8;
}

export function renderLimit(type: PageType): number {
  if (type === "blog") return 3;
  if (type === "guide") return 5;
  return 5;
}

type Quota = Partial<Record<PageType, number>>;

function quotasFor(from: PageNode): Quota {
  switch (from.type) {
    case "blog":
      return { guide: 1, service: 2, blog: 2, "city-service": 1 };
    case "guide":
      return { blog: 3, guide: 1, service: 2, "city-service": 1 };
    case "service":
      return { "city-service": 3, service: 3, blog: 2 };
    case "city":
      return { "city-service": 4, service: 3, blog: 1 };
    case "city-service":
      return { service: 2, city: 1, "city-service": 3, blog: 2 };
    default:
      return {};
  }
}

function eligible(from: PageNode, to: PageNode): boolean {
  if (from.id === to.id) return false;
  // Same index rule as the sitemap: a noindexed combo is never a link target.
  if (to.type === "city-service" && to.serviceSlug && to.citySlug && isCityServiceNoindex(to.serviceSlug, to.citySlug)) {
    return false;
  }

  if (from.type === "city-service") {
    if (to.type === "city-service") {
      return to.serviceSlug === from.serviceSlug || to.citySlug === from.citySlug;
    }
    return true;
  }

  if (from.type === "service") {
    if (to.type === "city-service") return to.serviceSlug === from.serviceSlug;
    return true;
  }

  if (from.type === "city") {
    if (to.type === "city-service") return to.citySlug === from.citySlug;
    return true;
  }

  return true;
}

export function buildManifest(pages: PageNode[]): Manifest {
  const incoming: Record<string, number> = {};
  for (const p of pages) incoming[p.url] = 0;

  const out: Manifest["pages"] = {};

  const sortedPages = [...pages].sort((a, b) => a.id.localeCompare(b.id));

  const pageById = new Map<string, PageNode>();
  for (const p of pages) pageById.set(p.url, p);

  for (const from of sortedPages) {
    const limit = targetLimit(from);
    const scored: LinkEntry[] = [];
    for (const to of pages) {
      if (!eligible(from, to)) continue;
      const score = similarity(from, to);
      if (score <= 0) continue;
      scored.push({
        url: to.url,
        anchor: to.anchor,
        title: to.title,
        type: to.type,
        score: Math.round(score * 1000) / 1000,
      });
    }
    for (const s of scored) {
      const inc = incoming[s.url] ?? 0;
      s.score = Math.round((s.score - 0.04 * inc) * 1000) / 1000;
    }
    scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

    const top: LinkEntry[] = [];
    const taken = new Set<string>();

    if (from.overrides && from.overrides.length > 0) {
      for (const ov of from.overrides) {
        if (top.length >= limit) break;
        if (taken.has(ov.url)) continue;
        const target = pageById.get(ov.url);
        if (!target) continue;
        // Canonical hub-pillar links (forced) are always honored. Manual
        // related-link overrides respect the soft incoming cap so a single
        // popular target (e.g. the cost guide) can't over-concentrate equity.
        if (!ov.forced && (incoming[ov.url] ?? 0) >= MAX_INCOMING) continue;
        top.push({
          url: target.url,
          anchor: ov.anchor ?? target.anchor,
          title: target.title,
          type: target.type,
          score: 999,
        });
        taken.add(target.url);
      }
    }

    const quotas = quotasFor(from);
    for (const [type, count] of Object.entries(quotas) as [PageType, number][]) {
      let added = 0;
      for (const cand of scored) {
        if (added >= count) break;
        if (taken.has(cand.url)) continue;
        if (cand.type !== type) continue;
        if ((incoming[cand.url] ?? 0) >= MAX_INCOMING) continue;
        top.push(cand);
        taken.add(cand.url);
        added++;
        if (top.length >= limit) break;
      }
      if (top.length >= limit) break;
    }
    for (const cand of scored) {
      if (top.length >= limit) break;
      if (taken.has(cand.url)) continue;
      if ((incoming[cand.url] ?? 0) >= MAX_INCOMING) continue;
      top.push(cand);
      taken.add(cand.url);
    }
    top.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));

    out[from.url] = {
      type: from.type,
      title: from.title,
      anchor: from.anchor,
      url: from.url,
      links: top,
    };

    for (const link of top) incoming[link.url] = (incoming[link.url] ?? 0) + 1;
  }

  const minIncomingFloor = 5;
  for (const targetUrl of Object.keys(incoming).sort((a, b) => incoming[a] - incoming[b])) {
    while ((incoming[targetUrl] ?? 0) < minIncomingFloor) {
      const target = pageById.get(targetUrl)!;
      let bestFrom: PageNode | null = null;
      let bestScore = -Infinity;
      for (const from of pages) {
        if (from.url === targetUrl) continue;
        if (!eligible(from, target)) continue;
        const page = out[from.url];
        if (!page) continue;
        if (page.links.some((l) => l.url === targetUrl)) continue;
        if (page.links.length === 0) continue;
        const weakest = page.links[page.links.length - 1];
        if (weakest.score >= 999) continue;
        const s = similarity(from, target);
        const margin = s - weakest.score;
        if (margin > bestScore) {
          bestScore = margin;
          bestFrom = from;
        }
      }
      if (!bestFrom) break;
      const page = out[bestFrom.url];
      const removed = page.links.pop()!;
      incoming[removed.url] = Math.max(0, (incoming[removed.url] ?? 0) - 1);
      const insertScore = similarity(bestFrom, target);
      page.links.push({
        url: target.url,
        anchor: target.anchor,
        title: target.title,
        type: target.type,
        score: Math.round(insertScore * 1000) / 1000,
      });
      page.links.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
      incoming[targetUrl] = (incoming[targetUrl] ?? 0) + 1;
    }
  }

  const blogByCategory: Manifest["blogByCategory"] = {};
  for (const post of BLOG_POSTS) {
    const cat = post.hubSlug || post.category;
    if (!blogByCategory[cat]) blogByCategory[cat] = [];
    blogByCategory[cat].push({
      slug: post.slug,
      title: post.title,
      publishedAt: post.publishedAt,
    });
  }
  for (const cat of Object.keys(blogByCategory)) {
    blogByCategory[cat].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
    blogByCategory[cat] = blogByCategory[cat].slice(0, 4);
  }

  return {
    generatedAt: null,
    counts: {
      blog: BLOG_POSTS.length,
      guide: GUIDE_PAGES.length,
      service: PRIORITY_SERVICES.length,
      city: CITIES.length,
      cityService: PRIORITY_SERVICES.length * CITIES.length,
    },
    pages: out,
    incoming,
    blogByCategory,
  };
}
