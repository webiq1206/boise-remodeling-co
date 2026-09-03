import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowRight, MessageSquare, Phone, Wrench } from "lucide-react";
import { DisplayNum } from "@/components/marketing";
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
  return (
    <div className="min-h-[70vh] bg-background flex items-center justify-center p-4 section-y">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-accent/10 mb-4">
            <Wrench className="h-12 w-12 text-accent-legible" />
          </div>
          <h1 className="text-6xl mb-2">
            <DisplayNum className="text-foreground">404</DisplayNum>
          </h1>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif tracking-tight mb-4 text-foreground">
          Page Not Found
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          This page doesn&apos;t exist or may have moved. Let us help you find what you&apos;re looking for.
        </p>

        <Card className="marketing-card mb-8 text-left">
          <CardContent className="pt-6">
            <h3 className="font-normal mb-4 text-foreground">Popular Pages</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/services", label: "Our Services" },
                { href: "/#consult", label: "Free Consultation" },
                { href: "/blog", label: "Blog and Ideas" },
                { href: "/#calculator", label: "Project Estimator" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 p-3 rounded-sm hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowRight className="h-4 w-4 text-accent-legible" />
                  {item.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="brand" size="lg" asChild>
            <Link href="/">
              <Home className="h-5 w-5 mr-2" />
              Go to Homepage
            </Link>
          </Button>
          <div className="flex flex-col items-center gap-1">
            <Button variant="brandOutline" size="lg" asChild>
              <a href={SITE_CONFIG.phoneHref}>
                <Phone className="h-5 w-5 mr-2" />
                Call {SITE_CONFIG.phone}
              </a>
            </Button>
            <SaveContactLink className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Save to contacts
            </SaveContactLink>
          </div>
          <Button variant="brandOutline" size="lg" asChild>
            <a href={SITE_CONFIG.phoneSmsHref} data-testid="link-404-text">
              <MessageSquare className="h-5 w-5 mr-2" />
              Text us
            </a>
          </Button>
        </div>

        <div className="mt-12">
          <p className="text-sm text-muted-foreground mb-3">
            We serve the full Treasure Valley
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["Boise", "Meridian", "Eagle", "Nampa", "Kuna", "Star", "Middleton"].map((city) => (
              <span key={city} className="text-sm text-muted-foreground">
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
