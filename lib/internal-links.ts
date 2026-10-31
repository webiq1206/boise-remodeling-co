import manifest from "@/data/internal-links.json";
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
  // Never surface a noindexed page as a related link (same rule as the sitemap).
  return (pages[path]?.links ?? []).filter((link) => isIndexedPath(link.url));
}
