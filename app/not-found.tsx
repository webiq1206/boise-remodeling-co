import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Phone } from "lucide-react";
import { InteriorPage } from "@/components/approved/InteriorLayout";
import { SERVICE_AREA_CITIES } from "@/shared/contentData";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { SaveContactLink } from "@/components/SaveContactLink";

export const metadata: Metadata = {
  title: "Page Not Found (404)",
  description: "The page you're looking for could not be found. Browse our remodeling services or contact Boise Remodeling Co.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  const links = [
    { href: "/services", label: "Remodeling services" },
    { href: "/areas", label: "Service areas" },
    { href: "/guides", label: "Remodeling guides" },
    { href: "/blog", label: "Blog" },
    { href: "/instant-estimate", label: "Instant estimate" },
    { href: "/#request", label: "Request a quote" },
  ];
  return (
    <InteriorPage kind="not-found">
      <section className="min-h-[60vh] bg-background pb-20 md:pb-28" style={{ paddingTop: "clamp(48px, 6vw, 88px)" }}>
        <div className="ed-shell">
          <div className="ed-split ed-split-narrow">
            <div>
              <p className="ed-eyebrow">Error 404</p>
              <h1 className="ed-display ed-statement-display">Page not found</h1>
              <p className="ed-lede mt-6 max-w-[40ch]">
                This page doesn&apos;t exist or may have moved. Let us help you find what you&apos;re looking for.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button variant="brand" size="lg" asChild>
                  <Link href="/">Go to homepage</Link>
                </Button>
                <Button variant="brandOutline" size="lg" asChild>
                  <a href={SITE_CONFIG.phoneHref}>
                    <Phone className="h-5 w-5 mr-2" aria-hidden="true" />
                    Call {SITE_CONFIG.phone}
                  </a>
                </Button>
                <Button variant="brandOutline" size="lg" asChild>
                  <a href={SITE_CONFIG.phoneSmsHref} data-testid="link-404-text">
                    <MessageSquare className="h-5 w-5 mr-2" aria-hidden="true" />
                    Text us
                  </a>
                </Button>
              </div>
              <p className="mt-4">
                <SaveContactLink className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                  Save to contacts
                </SaveContactLink>
              </p>
            </div>
            <div>
              <h2 className="ed-h4">Popular pages</h2>
              <ul className="ed-rule-list">
                {links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="ed-rule-link">
                      {item.label}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
              <h2 className="ed-h4 mt-10">Service areas</h2>
              <ul className="ed-rule-list">
                {SERVICE_AREA_CITIES.map((city) => (
                  <li key={city.slug}>
                    <Link href={`/areas/${city.slug}`} className="ed-rule-link">
                      {city.name}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </InteriorPage>
  );
}
