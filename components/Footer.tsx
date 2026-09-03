import Link from "next/link";
import { CITIES, SERVICES } from "@/shared/contentData";
import { SITE_TAGLINE } from "@/shared/siteContent";
import { areaPath, servicePath } from "@/lib/seo-routes";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmailLink } from "@/components/EmailLink";
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { SaveContactLink } from "@/components/SaveContactLink";
import { FooterCTAs } from "@/components/modals/FooterCTAs";
import { CONTENT_HUBS, categoryHubPath, guidePath } from "@/shared/contentHubs";
import { BLOG_POSTS } from "@/shared/blogContent";
import { GUIDE_PAGES } from "@/shared/guideContent";
import manifest from "@/data/internal-links.json";

const PUBLISHED_GUIDE_SLUGS = new Set(GUIDE_PAGES.map((g) => g.slug));

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-inverse text-inverse-foreground">
      <div className="container px-4 py-16 md:py-20">
        <div /* The eight-column treatment starts at xl, not lg. At lg the columns get
             px-6 each, which leaves 76px of content per column - and "Basement
             Remodeling" needs 87. That overflowed the column, the footer, and the
             document, so EVERY page scrolled horizontally by 20px at exactly
             1024px wide. Pre-existing; found by testing the wizard at tablet
             widths. md gets four columns, which fits. */
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-10 mb-12 xl:gap-0 xl:divide-x xl:divide-inverse-foreground/10 [&>*]:xl:px-6 [&>*:first-child]:xl:pl-0 [&>*:last-child]:xl:pr-0">
          <div className="xl:col-span-2">
            <div className="mb-5">
              {/* Wordmark-only footer branding (the seal was removed - one
                  clean lockup instead of two competing marks). Full lockup =
                  wordmark plus descriptor line; 1617.52 x 319.77 viewBox, so
                  52px tall is 263 wide. */}
              <img
                src="/brand/svg/wordmark-full/dark/boise-remodeling-co-wordmark-full-bone-accent.svg"
                alt="Boise Remodeling Co"
                width={263}
                height={52}
                className="h-[52px] w-auto"
              />
            </div>
            <p className="text-sm mb-6 text-inverse-muted font-sans">
              {SITE_TAGLINE}.
            </p>
            <div className="space-y-2">
              <BusinessPhoneLink
                className="flex min-h-[44px] items-center text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                data-testid="link-footer-phone"
              />
              {/* A BUTTON, NOT A TEXT LINK. Saving the vCard is the one action
                  in this column that does something rather than navigating, and
                  buried in a stack of identical grey links nobody found it.
                  Still an anchor underneath, because it downloads a file. */}
              <Button variant="brandInverseOutline" size="sm" className="mt-1" asChild>
                <SaveContactLink showIcon />
              </Button>
              <a
                href={SITE_CONFIG.phoneSmsHref}
                className="flex min-h-[44px] items-center text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                data-testid="link-footer-text"
              >
                Text us
              </a>
              <EmailLink className="flex min-h-[44px] items-center text-sm text-left text-inverse-muted hover:text-inverse-foreground transition-colors" />
              <p className="text-sm text-inverse-muted">
                {SITE_CONFIG.address.cityState} · {SITE_CONFIG.address.serviceArea}
              </p>
              {/* Facebook only. The Instagram account was removed rather than
                  left pointing at a profile with nothing on it - a dead social
                  link costs more trust than a missing one. */}
              <div className="flex gap-4 pt-2">
                <a
                  href="https://www.facebook.com/boiseremodeling"
                  /* A 20px icon is a 20px tap target. The negative margin keeps
                     the visual size while giving the thumb 44px to land on. */
                  className="-m-3 flex min-h-[44px] min-w-[44px] items-center justify-center p-3 text-accent-legible hover:text-inverse-foreground transition-colors"
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label="Boise Remodeling Co on Facebook"
                  data-testid="link-footer-facebook"
                >
                  <Facebook className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-serif font-normal text-label tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              Services
            </h3>
            <ul className="space-y-2.5">
              {SERVICES.map((service) => (
                <li key={service.slug}>
                  <Link
                    href={servicePath(service.slug)}
                    className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-normal text-label tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              Resources
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/guides"
                  className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                >
                  Remodeling Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/resources"
                  className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                >
                  Planning Downloads
                </Link>
              </li>
              {CONTENT_HUBS.filter(
                (h) => h.priorityTier <= 2 && PUBLISHED_GUIDE_SLUGS.has(h.pillarSlug),
              )
                .slice(0, 3)
                .map((hub) => (
                  <li key={hub.hubSlug}>
                    <Link
                      href={guidePath(hub.pillarSlug)}
                      className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                    >
                      {hub.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-normal text-label tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              Studio
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: "About", href: "/about" },
                { label: "Our Work", href: "/testimonials" },
                // Sitewide links so the specialized estimator pages are
                // reachable from every page and never ship orphaned.
                { label: "RE-10 Repairs", href: "/re-10-repairs-boise" },
                { label: "Estimate From Plans", href: "/remodel-plans-boise" },
                { label: "Contact", href: "/contact" },
                { label: "Why Choose Us", href: "/#why-choose-us" },
                { label: "How We Build", href: "/#how-we-build" },
                { label: "Blog", href: "/blog" },
              ].map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-normal text-label tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              <Link href="/areas" className="hover:text-inverse-foreground transition-colors">
                Service Areas
              </Link>
            </h3>
            <ul className="space-y-2.5">
              {CITIES.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={areaPath(city.slug)}
                    className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                  >
                    {city.name}, Idaho
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-normal text-label tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              From the Blog
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                >
                  All articles
                </Link>
              </li>
              {CONTENT_HUBS.filter((h) => h.priorityTier <= 2)
                .slice(0, 3)
                .map((hub) => (
                  <li key={hub.hubSlug}>
                    <Link
                      href={categoryHubPath(hub.hubSlug)}
                      className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                    >
                      {hub.title}
                    </Link>
                  </li>
                ))}
              {(
                (manifest.blogByCategory as Record<
                  string,
                  Array<{ slug: string; title: string }>
                >)?.['remodeling-costs'] ??
                BLOG_POSTS.filter((p) => p.hubSlug === 'remodeling-costs')
                  .slice(0, 1)
                  .map((p) => ({ slug: p.slug, title: p.title }))
              )
                .slice(0, 1)
                .map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors line-clamp-2"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-normal text-label tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              Start a Conversation
            </h3>
            {/* Contact details (phone, text, email, save-to-contacts) already
                live in the brand column at the start of this footer - repeating
                them here just to fill a column duplicated the same four links
                on every page. This column is for the two sitewide CTAs and the
                one link that belongs nowhere else. */}
            <ul className="space-y-2.5">
              <FooterCTAs />
            </ul>
            <div className="mt-6 pt-6 border-t border-inverse-foreground/10">
              <a
                href="/api/login"
                className="text-xs text-inverse-muted hover:text-inverse-foreground transition-colors"
              >
                Subcontractor Login
              </a>
            </div>
          </div>
        </div>

        <div className="py-5 border-t border-b border-inverse-foreground/10 mb-5">
          <p className="text-label tracking-[0.08em] text-inverse-muted">
            Serving {CITIES.map((c) => c.name).join(" · ")} · Ada and Canyon County, Idaho
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-inverse-muted">
          <div className="flex flex-wrap gap-4">
            <span>&copy; {currentYear} Boise Remodeling Co. All rights reserved.</span>
            <span>License details available upon request</span>
            {/* Required parent-company disclosure. This brand is a DBA of
                P5 Home Co LLC, not a separate company, and the branded link
                gives that claim somewhere to resolve - for a reader deciding
                who signs the contract, and for the entity graph, which
                declares the same relationship in JSON-LD. */}
            <span>
              Boise Remodeling Co is a DBA of{" "}
              <a
                href="https://p5homeco.com"
                className="underline underline-offset-2 transition-colors hover:text-inverse-foreground"
              >
                P5 Home Co LLC
              </a>
            </span>
          </div>
          <div className="flex gap-4">
            <Link href="/sitemap" className="transition-colors hover:text-inverse-foreground">
              Site Map
            </Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-inverse-foreground">
              Privacy Policy
            </Link>
            <Link href="/terms-of-service" className="transition-colors hover:text-inverse-foreground">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
