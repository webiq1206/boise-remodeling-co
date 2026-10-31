
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { EmailLink } from "@/components/EmailLink";
import { SaveContactLink } from "@/components/SaveContactLink";
import { ApprovedBrand } from "@/components/approved/ApprovedBrand";
import { FooterCTAs } from "@/components/modals/FooterCTAs";
import { Button } from "@/components/ui/button";
import { areaPath,servicePath } from "@/lib/seo-routes";
import { CITIES,SERVICES } from "@/shared/contentData";
import { CONTENT_HUBS,guidePath } from "@/shared/contentHubs";
import { GUIDE_PAGES } from "@/shared/guideContent";
import { RegistrationLine } from "@/components/RegistrationLine";
import { publicFooterLine, SITE_CONFIG } from "@/shared/siteConfig";
import { SITE_TAGLINE } from "@/shared/siteContent";
import { P5_FACEBOOK_URL } from "@/shared/gbpProfile";
import { ChevronDown,Facebook } from "lucide-react";
import Link from "next/link";

const PUBLISHED_GUIDE_SLUGS = new Set(GUIDE_PAGES.map((g) => g.slug));

interface FooterLink {
  label: string;
  href: string;
}

/**
 * Three groups, not six. WAS seven columns (brand, services, resources,
 * studio, areas, blog, conversation) that read as a wall. NOW brand plus
 * Services, Company and Resources, with the service areas as one wrapped row
 * beneath. Every link that carries equity is still here: all services, all
 * areas, the pillar guides, the guides and downloads hubs, the blog, both
 * specialised estimator pages, about, work and contact. Only the three blog
 * category links and the single featured post left the sitewide footer;
 * both are linked from the blog index and from every article.
 */
function buildFooterGroups(): { title: string; links: FooterLink[] }[] {
  const pillarGuides: FooterLink[] = CONTENT_HUBS.filter(
    (h) => h.priorityTier <= 2 && PUBLISHED_GUIDE_SLUGS.has(h.pillarSlug),
  )
    .slice(0, 3)
    .map((h) => ({ label: h.title, href: guidePath(h.pillarSlug) }));
  return [
    {
      title: "Services",
      links: [
        ...SERVICES.map((s) => ({ label: s.name, href: servicePath(s.slug) })),
        { label: "All services", href: "/services" },
      ],
    },
    {
      title: "Company",
      links: [{ label: "About", href: "/about" }, { label: "Design Ideas", href: "/design-ideas" }, { label: "Why Choose Us", href: "/#why-choose-us" }, { label: "How We Build", href: "/#how-we-build" }, { label: "Estimate From Plans", href: "/remodel-plans-boise" }, { label: "Contact", href: "/contact" }],
    },
    {
      title: "Resources",
      links: [
        { label: "Remodeling Guides", href: "/guides" },
        { label: "Planning Downloads", href: "/resources" },
        { label: "Blog", href: "/blog" },
        ...pillarGuides,
      ],
    },
  ];
}

const FOOTER_LINK_CLASS =
  "flex min-h-[44px] items-center text-sm text-inverse-muted transition-colors hover:text-inverse-foreground lg:min-h-0";

function GroupLinks({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.href}>
          {link.href.startsWith("http") ? (
            <a href={link.href} className={FOOTER_LINK_CLASS} rel="noopener">
              {link.label}
            </a>
          ) : (
            <Link href={link.href} className={FOOTER_LINK_CLASS}>
              {link.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

const SISTER_SITES: { name: string; href?: string }[] = [
  { name: "Boise Construction Co", href: "https://boiseconstruction.co" },
  { name: "Boise Remodeling Co", href: "https://boiseremodeling.co" },
  { name: "Boise Handyman Co", href: "https://boisehandyman.co" },
  { name: "Boise Cabinet Co", href: "https://boisecabinet.co" },
  {
    name: "Boise ADU Co (projects currently run through Boise Construction Co; its site is coming)",
    href: "https://boiseconstruction.co/services/home-additions",
  },
];

/** Collapsed accordion on phones and tablets, a plain column from lg up. */
function FooterGroup({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="border-t border-inverse-foreground/10 lg:border-t-0">
      <details className="group/fg lg:hidden">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between font-serif text-label uppercase tracking-[0.12em] text-inverse-muted">
          {title}
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-open/fg:rotate-180" aria-hidden="true" />
        </summary>
        <div className="pb-5">
          <GroupLinks links={links} />
        </div>
      </details>
      <div className="hidden lg:block">
        {/* A column label, not a document heading: footer groups are navigation, so
            they stay out of the page outline (was an H3 on every page). */}
        <p className="mb-5 font-serif font-normal text-label uppercase leading-[inherit] tracking-[0.12em] text-inverse-muted">{title}</p>
        <GroupLinks links={links} />
      </div>
    </div>
  );
}

export function Footer({ hideRegistration = false }: { hideRegistration?: boolean }) {
  const currentYear = new Date().getFullYear();
  const groups = buildFooterGroups();

  return (
    <footer className="site-footer bg-inverse text-inverse-foreground">
      <div className="container px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_repeat(3,1fr)] lg:gap-0 lg:divide-x lg:divide-inverse-foreground/10 [&>*]:lg:px-8 [&>*:first-child]:lg:pl-0 [&>*:last-child]:lg:pr-0">
          <div className="pb-2 lg:pb-0">
            <div className="mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <ApprovedBrand />
            </div>
            <p className="mb-6 font-sans text-sm text-inverse-muted">{SITE_TAGLINE}.</p>
            <div className="space-y-1">
              <BusinessPhoneLink
                className="flex min-h-[44px] items-center text-sm text-inverse-muted transition-colors hover:text-inverse-foreground"
                data-testid="link-footer-phone"
              />
              <a
                href={SITE_CONFIG.phoneSmsHref}
                className="flex min-h-[44px] items-center text-sm text-inverse-muted transition-colors hover:text-inverse-foreground"
                data-testid="link-footer-text"
              >
                Text us
              </a>
              <EmailLink className="flex min-h-[44px] items-center text-left text-sm text-inverse-muted transition-colors hover:text-inverse-foreground" />
              <p className="py-2 text-sm text-inverse-muted">
                {SITE_CONFIG.address.cityState} · {SITE_CONFIG.address.serviceArea}
              </p>
              <p className="py-2 text-sm text-inverse-muted">{publicFooterLine()}</p>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button variant="brandInverseOutline" size="sm" asChild>
                <SaveContactLink showIcon />
              </Button>
              {/* The only social profile is P5 Home Co's Facebook page; nothing renders until its URL is set. */}
              {P5_FACEBOOK_URL ? (
                <a href={P5_FACEBOOK_URL} className="-m-3 flex min-h-[44px] min-w-[44px] items-center justify-center p-3 text-accent-legible transition-colors hover:text-inverse-foreground" rel="noopener" target="_blank" aria-label="P5 Home Co on Facebook" data-testid="link-footer-facebook"><Facebook className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /></a>
              ) : null}
            </div>
            <ul className="m-0 mt-8 list-none space-y-2.5 p-0">
              <FooterCTAs />
            </ul>
          </div>

          {groups.map((group) => (
            <FooterGroup key={group.title} title={group.title} links={group.links} />
          ))}
        </div>

        {/* Service areas as one row: eight cities read at a glance and every
            area page keeps its sitewide link. */}
        <div className="mt-12 border-b border-t border-inverse-foreground/10 py-6">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <Link href="/areas" className="font-serif text-label uppercase tracking-[0.12em] text-inverse-muted transition-colors hover:text-inverse-foreground">
              Service areas
            </Link>
            {CITIES.map((city) => (
              <Link
                key={city.slug}
                href={areaPath(city.slug)}
                className="flex min-h-[44px] items-center text-sm text-inverse-muted transition-colors hover:text-inverse-foreground lg:min-h-0"
              >
                {city.name}, Idaho
              </Link>
            ))}
          </div>
        </div>

        <p className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-2 text-sm text-inverse-muted">
          <span>Part of P5 Home Co:</span>
          {SISTER_SITES.map((site, index) => (
            <span key={site.name} className="inline-flex items-baseline gap-x-2">
              {index > 0 && <span aria-hidden="true">·</span>}
              {site.href ? (
                <a href={site.href} className="underline underline-offset-2 transition-colors hover:text-inverse-foreground" rel="noopener">
                  {site.name}
                </a>
              ) : (
                <span>{site.name}</span>
              )}
            </span>
          ))}
        </p>

        <div className="flex flex-col gap-4 pt-5 text-xs text-inverse-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span>&copy; {currentYear} Boise Remodeling Co. All rights reserved.</span>
            {hideRegistration ? null : (
              <span className="basis-full overflow-visible whitespace-normal break-words">
                <RegistrationLine />
              </span>
            )}
            {/* Required parent-company disclosure. This brand is a DBA of
                P5 Home Co LLC, not a separate company. */}
            <span>
              Boise Remodeling Co is a DBA of{" "}
              <a href="https://p5homeco.com" className="underline underline-offset-2 transition-colors hover:text-inverse-foreground">
                P5 Home Co LLC
              </a>
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/sitemap" className="transition-colors hover:text-inverse-foreground">Site Map</Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-inverse-foreground">Privacy Policy</Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-inverse-foreground">Terms of Service</Link>
            <a href="/subcontractor" rel="nofollow" className="transition-colors hover:text-inverse-foreground">Subcontractor Login</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
