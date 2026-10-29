"use client";
import { ApprovedBrand } from "@/components/approved/ApprovedBrand";


import { NavEstimateButton } from "@/components/modals/NavEstimateButton";
import { SaveContactLink } from "@/components/SaveContactLink";
import { Button } from "@/components/ui/button";
import { isEstimatorPath } from "@/lib/p5/estimatorRoutes";
import { isShortRequestPath } from "@/lib/shortRequestRoutes";
import { isPortalPath } from "@/lib/portalRoutes";
import { cn } from "@/lib/utils";
const REQUEST_LABEL = "Request a quote";
import { SITE_CONFIG } from "@/shared/siteConfig";
import * as Dialog from "@radix-ui/react-dialog";
import { Contact,Menu,MessageSquare,Phone,X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect,useState } from "react";

const NAV_LINKS = [
  { label: "Services", href: "/services" },
  { label: "Design Ideas", href: "/design-ideas" },
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
      <ApprovedBrand />
    </Link>
  );
}

export function Navigation() {
  const pathname = usePathname();
  // C7: bottom bar stays available on marketing pages (not gated until past hero).
  // Solid contrast over every hero; a shadow separates the header while scrolling.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  /* Pages whose own wizard owns the bottom of a phone screen. Kept beside the
     route rather than inferred, so adding a wizard page is one line here.
     The estimator is not listed: this header does not render there at all (see isEstimatorPath
     below), so naming its routes here would be a second copy of that list with nothing to do. */
  const wizardOwnsBottom =
    (pathname?.startsWith("/re-10") ?? false) ||
    (pathname?.startsWith("/remodel-plans") ?? false) ||
    isShortRequestPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1180px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    closeOnDesktop();
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const isActivePath = (href: string) =>
    href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  const isPortal = isPortalPath(pathname);

  // The estimator is a one-page app with its own brand bar, step progress and exit control. Stacking
  // the marketing header on top of it cost about a third of a phone screen before any content, and
  // gave the customer a hamburger menu out of the flow they were in (owner report 2026-09-23).
  if (isEstimatorPath(pathname)) return null;

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
      <header data-approved-navigation
        className={cn(
          "fixed top-0 z-[100] w-full transition-[background-color,border-color] duration-300",
          "bg-background/95 backdrop-blur border-b border-border",
          scrolled && "shadow-sm",
        )}
      >
        <nav className="container flex h-16 min-[640px]:h-[76px] items-center justify-between gap-2 px-4 md:gap-4 md:px-6">
          <div className="min-w-0 flex-1 [&_img]:h-auto [&_img]:max-w-full">
            <Logo />
          </div>

          <div className="hidden min-[1180px]:flex items-center gap-0">
            {NAV_LINKS.map((link) => {
              const active = isActivePath(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative whitespace-nowrap px-3 py-2 text-body-sm font-normal transition-colors rounded-sm hover-elevate",
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

          <div className="hidden min-[1180px]:flex shrink-0 items-center gap-3">
              <a
                href={SITE_CONFIG.phoneHref}
                className="flex items-center gap-2 whitespace-nowrap text-body-sm font-normal transition-colors text-muted-foreground hover:text-foreground"
                data-testid="link-phone-desktop"
              >
                <span className="relative flex h-2 w-2">
                  <span className="pulse-accent absolute inline-flex h-full w-full rounded-full bg-accent-legible opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-legible" />
                </span>
                {SITE_CONFIG.phone}
              </a>
            {/* Text and Save-to-contacts as quiet icon buttons on one row. The
                previous stack put "Save to contacts" under the phone number,
                which wrapped the header to two lines and read as a mistake. */}
            <div className="flex items-center" aria-label="More ways to reach us">
              <a
                href={SITE_CONFIG.phoneSmsHref}
                className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label="Text us"
                title="Text us"
                data-testid="link-text-desktop"
              >
                <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
              </a>
              <SaveContactLink
                className="inline-flex h-11 w-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
                aria-label="Save to contacts"
                title="Save to contacts"
              >
                <Contact className="h-[18px] w-[18px]" strokeWidth={1.5} aria-hidden />
              </SaveContactLink>
            </div>
            <NavEstimateButton variant="brand" size="sm" className="min-h-11">
              {REQUEST_LABEL}
            </NavEstimateButton>
          </div>

          {/* Mobile menu - Radix Dialog gives focus trap, Escape, scroll-lock,
              inert background, and auto aria-expanded/aria-controls on the trigger. */}
          {/* Mobile header: menu only. Call + Request live on the bottom bar
              (B6 / brand profile). Extra Call/Text here stacked redundant chrome. */}
          <div className="flex min-[1180px]:hidden shrink-0 items-center gap-1">
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                {/* The shared icon size is 36px, which suits dense admin
                    toolbars and is under the 44px touch target for the one
                    control that opens navigation on a phone. */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label="Open navigation menu"
                  data-testid="button-mobile-menu-open"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </Dialog.Trigger>

              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[190] bg-background/80 backdrop-blur-sm min-[1180px]:hidden" />
                <Dialog.Content
                  className="fixed inset-0 z-[200] bg-background flex flex-col min-[1180px]:hidden focus:outline-none"
                  data-testid="mobile-nav-drawer"
                >
                  <Dialog.Title className="sr-only">Navigation menu</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Site navigation and contact options
                  </Dialog.Description>

                  {/* Header row */}
                  <div className="flex items-center justify-between gap-3 px-4 h-16 min-[640px]:h-[76px] border-b border-border/40 shrink-0 [&_img]:max-w-[65vw] [&_img]:object-contain [&_img]:object-left">
                    <Logo />
                    <Dialog.Close asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 shrink-0"
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

                  {/* Bottom contact row: three equal actions, then the CTA. WAS a phone

                      number with "Save to contacts" indented under it and a "Text us

                      instead" line, which read as an afterthought. */}

                  <div className="shrink-0 border-t border-border/40 px-6 py-5 pb-safe">

                    <div className="grid grid-cols-3 gap-2">

                      <a

                        href={SITE_CONFIG.phoneHref}

                        className="flex min-h-[56px] flex-col items-center justify-center gap-1 border border-border/60 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent-legible hover:text-accent-legible"

                        data-testid="link-phone-mobile-menu"

                      >

                        <Phone className="h-4 w-4" aria-hidden="true" />

                        Call

                      </a>

                      <a

                        href={SITE_CONFIG.phoneSmsHref}

                        className="flex min-h-[56px] flex-col items-center justify-center gap-1 border border-border/60 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent-legible hover:text-accent-legible"

                        data-testid="link-text-mobile-menu"

                      >

                        <MessageSquare className="h-4 w-4" aria-hidden="true" />

                        Text

                      </a>

                      <SaveContactLink className="flex min-h-[56px] flex-col items-center justify-center gap-1 border border-border/60 text-[11px] font-bold uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent-legible hover:text-accent-legible">

                        <Contact className="h-4 w-4" aria-hidden="true" />

                        Save

                      </SaveContactLink>

                    </div>

                    <p className="mt-3 text-center text-sm text-muted-foreground">{SITE_CONFIG.phone}</p>

                    <NavEstimateButton
                      variant="brand"
                      surface="mobile-menu"
                      className="mt-3 w-full"
                      onExtraClick={() => setMobileOpen(false)}
                    >
                      {REQUEST_LABEL}
                    </NavEstimateButton>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </nav>
      </header>

      {/* C7 mobile bottom CTA: one primary + one secondary, always available
          on marketing pages (not deferred until past hero). Wizard pages own
          their own bottom chrome, so this bar stays off those routes. */}
      {!wizardOwnsBottom && (
      <div
        data-mobile-nav-bar=""
        data-p5-actions-ready="true"
        className={cn(
          "fixed left-0 right-0 bottom-0 z-[100] min-[1180px]:hidden border-t bg-background border-border",
          "pb-[max(12px,env(safe-area-inset-bottom))] pt-3 px-3",
          mobileOpen && "invisible pointer-events-none",
        )}
      >
        <div className="flex items-stretch gap-2">
          <a
            href={SITE_CONFIG.phoneHref}
            className="inline-flex h-12 min-w-[5.5rem] shrink-0 items-center justify-center gap-2 rounded-sm border border-border px-4 text-base font-medium text-foreground"
            aria-label={`Call ${SITE_CONFIG.phone}`}
            data-testid="button-call-mobile"
          >
            <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            Call
          </a>
          <NavEstimateButton
            variant="brand"
            surface="mobile-sticky"
            className="h-12 flex-1 text-base"
            data-testid="button-begin-conversation-mobile"
          >
            {REQUEST_LABEL}
          </NavEstimateButton>
        </div>
      </div>
      )}
    </>
  );
}
