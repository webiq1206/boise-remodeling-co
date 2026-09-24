import { InteriorDocument,InteriorPage } from '@/components/approved/InteriorLayout';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical,FEED_ALTERNATES } from "@/lib/page-metadata";
import { generateBreadcrumbSchema,generateWebPageSchema } from "@/lib/schema";
import { getSiteUrlGroups } from "@/lib/siteUrls";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { Metadata } from "next";
import Link from "next/link";

const SITEMAP_CANONICAL = buildCanonical("/sitemap");
const DESCRIPTION = `Every page on the ${SITE_CONFIG.name} website in one place: services, service areas, guides, and articles.`;

export const metadata: Metadata = withBrandPageMetadata(({
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
}), "/sitemap");

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
    <InteriorPage kind="sitemap"><div className="flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="blog-content">
            <InteriorDocument heading={<h1>Site Map</h1>} contents={[]}>

              <p className="lead text-muted-foreground">{DESCRIPTION}</p>
            </InteriorDocument>
            {/* Groups flow into columns so a 60-link group and a 6-link group share the width evenly. */}
            <div className="mt-10 columns-1 gap-x-10 sm:columns-2 lg:columns-3 [&_section]:mb-8 [&_section]:break-inside-avoid [&_ul]:mt-3 [&_h2]:mt-0 [&_li]:my-1">
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
        </div>
      </section>
    </div></InteriorPage>
  );
}
