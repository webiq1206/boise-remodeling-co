import manifest from "@/data/internal-links.json";
import { redirectDestination } from "@/shared/cityServiceIndex.mjs";
import { isIndexedPath } from "@/lib/siteUrls";

export interface ManifestLink {
  url: string;
  anchor: string;
  title: string;
  type: string;
  score: number;
}

export function getManifestLinks(path: string): ManifestLink[] {
  const pages = manifest.pages as Record<string, { links?: ManifestLink[] }>;
  const seen = new Set<string>();
  const links: ManifestLink[] = [];
  for (const link of pages[path]?.links ?? []) {
    const url = redirectDestination(link.url) ?? link.url;
    if (!isIndexedPath(url) || url === path || seen.has(url)) continue;
    seen.add(url);
    links.push(url === link.url ? link : { ...link, url });
  }
  return links;
}
