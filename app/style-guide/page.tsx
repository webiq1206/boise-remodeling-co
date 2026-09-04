import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/marketing/Section";
import { PageHeader } from "@/components/marketing/PageHeader";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { Chip } from "@/components/marketing/Chip";
import { Hairline } from "@/components/marketing/Hairline";
import { TextLink } from "@/components/marketing/TextLink";
import { BlogEndCta } from "@/components/marketing/BlogEndCta";

export const metadata: Metadata = {
  title: "Style Guide (Internal)",
  robots: { index: false, follow: false },
};

export default function StyleGuidePage() {
  return (
    <div className="flex flex-col pb-20">
      <Section spacing="sm">
        <div className="container px-4 max-w-4xl">
          <PageHeader
            eyebrow="Internal reference"
            title="Boise Remodeling Co - Design System"
            description="Tokens, typography, buttons, cards, and article styles for all marketing pages."
            align="left"
          />
        </div>
      </Section>

      <Section variant="greige" divider>
        <div className="container px-4 max-w-4xl space-y-8">
          <h2 className="text-section-title font-serif">Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Canvas", class: "bg-background border" },
              { name: "Greige", class: "bg-surface-greige border" },
              { name: "Card", class: "bg-card border" },
              { name: "Inverse", class: "bg-inverse text-inverse-foreground" },
            ].map((swatch) => (
              <div key={swatch.name} className={`h-20 rounded-sm ${swatch.class}`}>
                <span className="p-2 text-xs block">{swatch.name}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section divider>
        <div className="container px-4 max-w-4xl space-y-6">
          <h2 className="text-section-title font-serif">Typography</h2>
          <p className="brc-label">Eyebrow label</p>
          <h1 className="text-display font-serif">
            Display with <em className="brc-accent">accent</em>
          </h1>
          <h2 className="text-3xl md:text-4xl font-serif">Section title</h2>
          <p className="text-base leading-relaxed text-foreground max-w-prose">
            Body copy uses foreground color at comfortable line height. Meta lines use muted
            foreground only.
          </p>
          <p className="text-sm text-muted-foreground">Meta / caption text</p>
        </div>
      </Section>

      <Section divider>
        <div className="container px-4 max-w-4xl space-y-6">
          <h2 className="text-section-title font-serif">Buttons & links</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3 [&>*]:w-full sm:[&>*]:w-auto">
            <Button variant="brand">Primary (brand)</Button>
            <Button variant="brandOutline">Secondary (outline)</Button>
          </div>
          <TextLink href="/blog">Text link tertiary</TextLink>
        </div>
      </Section>

      <Section divider>
        <div className="container px-4 max-w-4xl space-y-6">
          <h2 className="text-section-title font-serif">Cards & chips</h2>
          <MarketingCard>
            <p className="text-sm text-muted-foreground">Marketing card - rounded-sm, border, shadow-sm.</p>
          </MarketingCard>
          <div className="flex gap-2">
            <Chip>Category</Chip>
            <Chip active>
              Active
            </Chip>
          </div>
        </div>
      </Section>

      <Section divider>
        <div className="container px-4 max-w-4xl">
          <Hairline spaced />
          <p className="text-sm text-muted-foreground text-center">Hairline with generous spacing</p>
        </div>
      </Section>

      <Section divider>
        <div className="container px-4 max-w-4xl">
          <article className="blog-content prose-measure">
            <h2>Article H2</h2>
            <p>Long-form paragraph styling for blog and legal content.</p>
            <blockquote>
              <p>Blockquote with left border and subtle fill.</p>
            </blockquote>
          </article>
        </div>
      </Section>

      <BlogEndCta />
    </div>
  );
}
