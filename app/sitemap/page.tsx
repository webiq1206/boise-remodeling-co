import { Metadata } from "next";
import Link from "next/link";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import { buildCanonical, FEED_ALTERNATES } from "@/lib/page-metadata";
import { getSiteUrlGroups } from "@/lib/siteUrls";

const SITEMAP_CANONICAL = buildCanonical("/sitemap");
const DESCRIPTION = `Every page on the ${SITE_CONFIG.name} website in one place: services, service areas, guides, and articles.`;

export const metadata: Metadata = {
  title: "Site Map",
  description: DESCRIPTION,
  alternates: { canonical: SITEMAP_CANONICAL, types: FEED_ALTERNATES },
  openGraph: {
    title: `Site Map | ${SITE_CONFIG.name}`,
    description: DESCRIPTION,
    url: SITEMAP_CANONICAL,
    type: "website",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: SITE_CONFIG.name }],
  },
  twitter: { card: "summary_large_image", title: `Site Map | ${SITE_CONFIG.name}`, description: DESCRIPTION },
};

/**
 * The HTML sitemap. Unlike sitemap.xml, which is a hint, this is a real page of
 * real followed links, so every public URL is reachable from the footer in two
 * clicks regardless of how deep it sits in the navigation. It renders the same
 * list the XML sitemap does (lib/siteUrls.ts), so it can never fall behind.
 */
export default function SitemapPage() {
  const groups = getSiteUrlGroups();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Site Map", url: "/sitemap" },
  ]);
  const webPageSchema = generateWebPageSchema({
    title: "Site Map",
    description: DESCRIPTION,
    url: "/sitemap",
  });

  return (
    <div className="flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto blog-content prose-measure">
            <h1>Site Map</h1>
            <p className="lead text-muted-foreground">{DESCRIPTION}</p>
            {groups.map((group) =>
              group.entries.length === 0 ? null : (
                <section key={group.heading} aria-labelledby={`sitemap-${group.heading.replace(/\s+/g, "-").toLowerCase()}`}>
                  <h2 id={`sitemap-${group.heading.replace(/\s+/g, "-").toLowerCase()}`}>
                    {group.heading} <span className="text-muted-foreground text-base font-normal">({group.entries.length})</span>
                  </h2>
                  <ul>
                    {group.entries.map((e) => (
                      <li key={e.path}>
                        <Link href={e.path}>{e.label}</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
