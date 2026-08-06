"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { Button } from "@/components/ui/button";
import { TESTIMONIALS } from "@/shared/testimonialsData";
import { CITIES, SERVICES } from "@/shared/contentData";

function serviceLabel(slug: string) {
  return SERVICES.find((s) => s.slug === slug)?.name ?? slug;
}

function cityLabel(slug: string) {
  return CITIES.find((c) => c.slug === slug)?.name ?? slug;
}

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, idx) => (
        <Star key={idx} className="h-3.5 w-3.5 fill-foreground text-foreground" />
      ))}
    </div>
  );
}

interface TestimonialsSectionProps {
  limit?: number;
  showViewAll?: boolean;
}

export function TestimonialsSection({ limit = 4, showViewAll = true }: TestimonialsSectionProps) {
  const items = TESTIMONIALS.slice(0, limit);
  const [featured, ...rest] = items;

  // No real reviews yet - render nothing rather than an empty-looking
  // section (a heading and a "Read all reviews" button with no reviews
  // under them). This activates automatically once TESTIMONIALS is populated.
  if (items.length === 0) return null;

  return (
    <Section id="testimonials" variant="greige" divider>
      <div className="container px-4">
        <SectionHeader
          align="center"
          eyebrow="Homeowner reviews"
          title={
            <>
              Trusted for{" "}
              <em className="brc-accent">craftsmanship</em> and communication
            </>
          }
          description="Clear communication, reliable timelines, and quality homeowners notice every day."
          className="mb-10 max-w-3xl"
        />

        {featured && (
          <Reveal className="mb-10 max-w-3xl mx-auto text-center">
            <div className="flex justify-center">
              <StarRow count={Number(featured.rating) || 5} />
            </div>
            <blockquote className="font-sans font-light text-xl md:text-2xl leading-relaxed text-foreground mt-4 mb-6">
              &ldquo;{featured.testimonial}&rdquo;
            </blockquote>
            <p className="font-normal text-sm text-foreground">{featured.customerName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {serviceLabel(featured.serviceType)} · {cityLabel(featured.city)}, Idaho
            </p>
          </Reveal>
        )}

        {rest.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {rest.map((item, i) => (
              <Reveal key={item.customerName} delay={i * 60}>
                <MarketingCard className="h-full">
                  <StarRow count={Number(item.rating) || 5} />
                  <blockquote className="text-sm leading-relaxed text-muted-foreground mt-3 mb-4">
                    &ldquo;{item.testimonial}&rdquo;
                  </blockquote>
                  <div className="pt-3 border-t border-border">
                    <p className="font-normal text-sm text-foreground">{item.customerName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {serviceLabel(item.serviceType)} · {cityLabel(item.city)}, Idaho
                    </p>
                  </div>
                </MarketingCard>
              </Reveal>
            ))}
          </div>
        )}

        {showViewAll && (
          <div className="mt-10 text-center">
            <Button variant="brandOutline" asChild>
              <Link href="/testimonials">Read all reviews</Link>
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
