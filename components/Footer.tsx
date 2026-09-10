import Link from "next/link";
import { ChevronDown, Facebook } from "lucide-react";
import { CITIES, SERVICES } from "@/shared/contentData";
import { SITE_TAGLINE } from "@/shared/siteContent";
import { areaPath, servicePath } from "@/lib/seo-routes";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { Button } from "@/components/ui/button";
import { EmailLink } from "@/components/EmailLink";
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { SaveContactLink } from "@/components/SaveContactLink";
import { FooterCTAs } from "@/components/modals/FooterCTAs";
import { CONTENT_HUBS, guidePath } from "@/shared/contentHubs";
import { GUIDE_PAGES } from "@/shared/guideContent";

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
      links: [{ label: "About", href: "/about" }, { label: "Design Ideas", href: "/testimonials" }, { label: "Why Choose Us", href: "/#why-choose-us" }, { label: "How We Build", href: "/#how-we-build" }, { label: "RE-10 Repairs", href: "/re-10-repairs-boise" }, { label: "Estimate From Plans", href: "/remodel-plans-boise" }, { label: "Contact", href: "/contact" }],
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

function GroupLinks({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="flex min-h-[44px] items-center text-sm text-inverse-muted transition-colors hover:text-inverse-foreground lg:min-h-0"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

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
        <h3 className="mb-5 font-serif font-normal text-label uppercase tracking-[0.12em] text-inverse-muted">{title}</h3>
        <GroupLinks links={links} />
      </div>
    </div>
  );
}

export function Footer() {
  const currentYear = new Date().getFullYear();
  const groups = buildFooterGroups();

  return (
    <footer className="bg-inverse text-inverse-foreground pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="container px-4 py-16 md:py-20">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.35fr_repeat(3,1fr)] lg:gap-0 lg:divide-x lg:divide-inverse-foreground/10 [&>*]:lg:px-8 [&>*:first-child]:lg:pl-0 [&>*:last-child]:lg:pr-0">
          <div className="pb-2 lg:pb-0">
            <div className="mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/svg/wordmark-full/dark/boise-remodeling-co-wordmark-full-bone-accent.svg"
                alt="Boise Remodeling Co"
                width={263}
                height={52}
                className="h-[52px] w-auto"
              />
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
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button variant="brandInverseOutline" size="sm" asChild>
                <SaveContactLink showIcon />
              </Button>
              <a href="https://www.facebook.com/boiseremodeling" className="-m-3 flex min-h-[44px] min-w-[44px] items-center justify-center p-3 text-accent-legible transition-colors hover:text-inverse-foreground" rel="noopener noreferrer" target="_blank" aria-label="Boise Remodeling Co on Facebook" data-testid="link-footer-facebook"><Facebook className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" /></a>
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

        <div className="flex flex-col gap-4 pt-5 text-xs text-inverse-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <span>&copy; {currentYear} Boise Remodeling Co. All rights reserved.</span>
            <span>License details available upon request</span>
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
            <a href="/api/login" rel="nofollow" className="transition-colors hover:text-inverse-foreground">Subcontractor Login</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
