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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-10 mb-12 lg:gap-0 lg:divide-x lg:divide-inverse-foreground/10 [&>*]:lg:px-6 [&>*:first-child]:lg:pl-0 [&>*:last-child]:lg:pr-0">
          <div className="lg:col-span-2">
            <div className="mb-5 flex items-center gap-4">
              {/* Dark-background brand seal; circular clip drops the square
                  corners so its dark ground reads as a seamless medallion on
                  the dark footer band */}
              {/* `on-charcoal` rather than the plain bone seal: that variant
                  carries its own disc, which is what the kit says to use over a
                  ground rather than relying on a CSS clip. */}
              <img
                src="/brand/svg/seal/any/boise-remodeling-co-seal-on-charcoal-accent.svg"
                alt=""
                aria-hidden="true"
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-full"
              />
              {/* The full lockup, which is the wordmark plus the descriptor
                  line. 1617.52 x 319.77 viewBox, so 45px tall is 228 wide. */}
              <img
                src="/brand/svg/wordmark-full/dark/boise-remodeling-co-wordmark-full-bone-accent.svg"
                alt="Boise Remodeling Co"
                width={228}
                height={45}
                className="h-[45px] w-auto"
              />
            </div>
            <p className="text-sm mb-6 text-inverse-muted font-sans">
              {SITE_TAGLINE}.
            </p>
            <div className="space-y-2">
              <BusinessPhoneLink
                className="block text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
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
                className="block text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                data-testid="link-footer-text"
              >
                Text us
              </a>
              <EmailLink className="block text-sm text-left text-inverse-muted hover:text-inverse-foreground transition-colors" />
              <p className="text-sm text-inverse-muted">
                {SITE_CONFIG.address.cityState} · {SITE_CONFIG.address.serviceArea}
              </p>
              {/* Facebook only. The Instagram account was removed rather than
                  left pointing at a profile with nothing on it - a dead social
                  link costs more trust than a missing one. */}
              <div className="flex gap-4 pt-2">
                <a
                  href="https://www.facebook.com/boiseremodeling"
                  className="text-accent-legible hover:text-inverse-foreground transition-colors"
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
            <h3 className="font-sans font-normal text-[11px] tracking-[0.12em] uppercase mb-5 text-inverse-muted">
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
            <h3 className="font-sans font-normal text-[11px] tracking-[0.12em] uppercase mb-5 text-inverse-muted">
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
            <h3 className="font-sans font-normal text-[11px] tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              Studio
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: "About", href: "/about" },
                { label: "Our Work", href: "/testimonials" },
                // Sitewide link so the RE-10 page is reachable from every page
                // and never ships orphaned.
                { label: "RE-10 Repairs", href: "/re-10-repairs-boise" },
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
            <h3 className="font-sans font-normal text-[11px] tracking-[0.12em] uppercase mb-5 text-inverse-muted">
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
            <h3 className="font-sans font-normal text-[11px] tracking-[0.12em] uppercase mb-5 text-inverse-muted">
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
            <h3 className="font-sans font-normal text-[11px] tracking-[0.12em] uppercase mb-5 text-inverse-muted">
              Start a Conversation
            </h3>
            <ul className="space-y-2.5">
              <FooterCTAs />
              <li>
                <BusinessPhoneLink
                  className="block text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                  data-testid="link-footer-column-phone"
                />
              </li>
              <li>
                <Button variant="brandInverseOutline" size="sm" asChild>
                  <SaveContactLink showIcon />
                </Button>
              </li>
              <li>
                <a
                  href={SITE_CONFIG.phoneSmsHref}
                  className="text-sm text-inverse-muted hover:text-inverse-foreground transition-colors"
                >
                  Text us
                </a>
              </li>
              <li>
                <EmailLink className="text-sm text-left text-inverse-muted hover:text-inverse-foreground transition-colors" />
              </li>
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
          <p className="text-[11px] tracking-[0.08em] text-inverse-muted">
            Serving {CITIES.map((c) => c.name).join(" · ")} · Ada and Canyon County, Idaho
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-inverse-muted">
          <div className="flex flex-wrap gap-4">
            <span>&copy; {currentYear} Boise Remodeling Co. All rights reserved.</span>
            <span>License details available upon request</span>
          </div>
          <div className="flex gap-4">
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
