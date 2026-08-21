"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CTA_QUOTE } from "@/shared/ctaCopy";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { NavEstimateButton } from "@/components/modals/NavEstimateButton";
import { SaveContactLink } from "@/components/SaveContactLink";
import { isPortalPath } from "@/lib/portalRoutes";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Our Work", href: "/testimonials" },
  { label: "Areas", href: "/areas" },
  { label: "About", href: "/about" },
  { label: "Guides", href: "/guides" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

function Logo() {
  return (
    <Link href="/" className="flex h-full min-h-11 items-center" aria-label="Boise Remodeling Co - home">
      {/* Bone wordmark with the sage Co., which is the dark-ground lockup the
          brand kit specifies. width/height match the 1617.52 x 159.96 viewBox
          so the browser reserves the right box and the header does not shift. */}
      <img
        src="/brand/svg/wordmark/dark/boise-remodeling-co-wordmark-bone-accent.svg"
        alt="Boise Remodeling Co"
        width={263}
        height={26}
        className="h-[26px] w-auto"
      />
    </Link>
  );
}

export function Navigation() {
  const pathname = usePathname();
  /* Pages whose own wizard owns the bottom of a phone screen. Kept beside the
     route rather than inferred, so adding a wizard page is one line here. */
  const wizardOwnsBottom =
    pathname === "/estimate" ||
    (pathname?.startsWith("/re-10") ?? false) ||
    (pathname?.startsWith("/remodel-plans") ?? false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActivePath = (href: string) =>
    href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  const isPortal = isPortalPath(pathname);

  if (isPortal) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <nav className="container flex h-16 items-center justify-between gap-4 px-6">
          <Logo />
        </nav>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-[100] w-full bg-background/97 backdrop-blur border-b border-border">
        <nav className="container flex h-[60px] items-center justify-between gap-4 px-4 md:px-6">
          <Logo />

          <div className="hidden md:flex items-center gap-0">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 text-body-sm font-normal transition-colors rounded-sm hover-elevate",
                    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                  {active && (
                    <span className="absolute inset-x-4 bottom-1 h-px bg-accent-legible" />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <a
                href={SITE_CONFIG.phoneHref}
                className="flex items-center gap-2 text-body-sm font-normal transition-colors text-muted-foreground hover:text-foreground"
                data-testid="link-phone-desktop"
              >
                <span className="relative flex h-2 w-2">
                  <span className="pulse-accent absolute inline-flex h-full w-full rounded-full bg-accent-legible opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-legible" />
                </span>
                {SITE_CONFIG.phone}
              </a>
              <SaveContactLink className="text-label text-muted-foreground hover:text-foreground transition-colors">
                Save to contacts
              </SaveContactLink>
            </div>
            <a
              href={SITE_CONFIG.phoneSmsHref}
              className="text-body-sm font-normal transition-colors text-muted-foreground hover:text-foreground"
              data-testid="link-text-desktop"
            >
              Text us
            </a>
            <NavEstimateButton variant="brand" size="sm" className="min-h-11">
              {CTA_QUOTE}
            </NavEstimateButton>
          </div>

          {/* Mobile menu - Radix Dialog gives focus trap, Escape, scroll-lock,
              inert background, and auto aria-expanded/aria-controls on the trigger. */}
          <div className="flex md:hidden items-center gap-2">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                {/* The shared icon size is 36px, which suits dense admin
                    toolbars and is under the 44px touch target for the one
                    control that opens navigation on a phone. */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11"
                  aria-label="Open navigation menu"
                  data-testid="button-mobile-menu-open"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[190] bg-background/80 backdrop-blur-sm md:hidden" />
                <Dialog.Content
                  className="fixed inset-0 z-[200] bg-background flex flex-col md:hidden focus:outline-none"
                  data-testid="mobile-nav-drawer"
                >
                  <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Site navigation and contact options
                  </Dialog.Description>

                  {/* Header row */}
                  <div className="flex items-center justify-between px-6 h-[60px] border-b border-border/40 shrink-0">
                    <Logo />
                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Close navigation menu"
                        data-testid="button-mobile-menu-close"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </Dialog.Close>
                  </div>

                  {/* Nav links */}
                  <nav className="flex-1 overflow-y-auto">
                    {NAV_LINKS.map((link) => {
                      const active = isActivePath(link.href);
                      return (
                        <div key={link.label} className="border-b border-border/40">
                          <Link
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-3 px-6 py-5 text-2xl font-normal transition-colors hover:text-accent-legible",
                              active ? "text-accent-legible" : "text-foreground",
                            )}
                            data-testid={`link-mobile-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {active && (
                              <span className="h-4 w-px bg-accent-legible" aria-hidden="true" />
                            )}
                            {link.label}
                          </Link>
                        </div>
                      );
                    })}
                  </nav>

                  {/* Bottom contact row */}
                  <div className="shrink-0 border-t border-border/40 px-6 py-6 space-y-3 pb-safe">
                    <div className="space-y-1">
                      <a
                        href={SITE_CONFIG.phoneHref}
                        className="flex items-center gap-3 text-base font-normal text-foreground"
                        data-testid="link-phone-mobile-menu"
                      >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="pulse-accent absolute inline-flex h-full w-full rounded-full bg-accent-legible opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent-legible" />
                        </span>
                        {SITE_CONFIG.phone}
                      </a>
                      <SaveContactLink className="pl-[22px] text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Save to contacts
                      </SaveContactLink>
                    </div>
                    <a
                      href={SITE_CONFIG.phoneSmsHref}
                      className="flex items-center gap-3 text-base font-normal text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="link-text-mobile-menu"
                    >
                      Text us instead
                    </a>
                    <NavEstimateButton
                      variant="brand"
                      surface="mobile-menu"
                      className="w-full"
                      onExtraClick={() => setMobileOpen(false)}
                    >
                      {CTA_QUOTE}
                    </NavEstimateButton>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </nav>
      </header>

      {/* Sticky bottom bar.
          NOT ON A PAGE A WIZARD OWNS. The estimator and both document wizards
          put their own Back/Continue bar at the bottom of a phone screen, and
          this bar renders at z-100 against their z-30 - so it sat physically
          on top of the Continue button, covering the primary action of the
          primary conversion flow. The estimator already asks for this via an
          IntersectionObserver, but an observer is a race on first paint and
          the route is a fact, so the route decides. */}
      {!wizardOwnsBottom && (
      <div
        data-mobile-nav-bar=""
        className="fixed left-0 right-0 bottom-0 z-[100] md:hidden pb-safe border-t bg-background/97 backdrop-blur-md border-border"
      >
        <div className="grid grid-cols-3 divide-x divide-border">
          <a
            href={SITE_CONFIG.phoneHref}
            className="flex items-center justify-center gap-2 py-4 text-sm font-normal text-foreground"
            data-testid="button-call-mobile"
          >
            Call
          </a>
          <a
            href={SITE_CONFIG.phoneSmsHref}
            className="flex items-center justify-center gap-2 py-4 text-sm font-normal text-foreground"
            data-testid="button-text-mobile"
          >
            Text
          </a>
          <NavEstimateButton
            asLink
            surface="mobile-sticky"
            className="flex items-center justify-center gap-2 py-4 text-sm font-normal text-foreground"
            data-testid="button-begin-conversation-mobile"
          >
            {CTA_QUOTE}
          </NavEstimateButton>
        </div>
      </div>
      )}
    </>
  );
}
