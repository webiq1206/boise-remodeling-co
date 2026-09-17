import {withBrandPageMetadata} from '@/lib/brand-page-metadata';
import { Metadata } from "next";
import { ObfuscatedEmail } from "@/components/ObfuscatedEmail";
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { SaveContactLink } from "@/components/SaveContactLink";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import { buildCanonical, FEED_ALTERNATES } from "@/lib/page-metadata";

const PRIVACY_CANONICAL = buildCanonical("/privacy-policy");

export const metadata: Metadata = withBrandPageMetadata(({
  title: "Privacy Policy",
  description: "Boise Remodeling Co privacy policy. How we protect your data when you request remodeling services across Boise and the Treasure Valley.",
  alternates: {
    canonical: PRIVACY_CANONICAL,
      types: FEED_ALTERNATES,
  },
  openGraph: {
    title: "Privacy Policy | Boise Remodeling Co",
    description: "How we protect your data when you use Boise Remodeling Co remodeling and renovation services in Idaho.",
    url: PRIVACY_CANONICAL,
    type: "website",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Boise Remodeling Co" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Boise Remodeling Co",
    description: "How we protect your data when you use Boise Remodeling Co remodeling and renovation services in Idaho.",
  },
}), "/privacy-policy");

export default function PrivacyPolicyPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Privacy Policy", url: "/privacy-policy" },
  ]);
  const webPageSchema = generateWebPageSchema({
    title: "Privacy Policy",
    description: "Privacy policy for Boise Remodeling Co. How we collect, use, and protect your personal information.",
    url: "/privacy-policy",
  });

  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <section className="py-16 md:py-24">
        <div className="container px-4">
          <div className="max-w-3xl mx-auto blog-content prose-measure">
            <h1>Privacy Policy for Boise Remodeling Co Services</h1>
            <p className="lead text-muted-foreground">
              Last updated: January 2024
            </p>

            <h2>Introduction</h2>
            <p>
              Boise Remodeling Co ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
            </p>

            <h2>Information We Collect</h2>
            <p>We may collect information about you in various ways, including:</p>
            <ul>
              <li><strong>Personal Data:</strong> Name, email address, phone number, and mailing address when you request a quote or contact us.</li>
              <li><strong>Property Information:</strong> Address and details about your property for service estimates.</li>
              <li><strong>Payment Information:</strong> Payment details processed securely through our payment providers.</li>
              <li><strong>Usage Data:</strong> Information about how you use our website, including pages visited and features used.</li>
            </ul>

            <h2>How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process your requests and transactions</li>
              <li>Send you service-related communications</li>
              <li>Improve our website and services</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>

            <h2>Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul>
              <li>Service providers who assist in our operations</li>
              <li>Professional advisors as needed</li>
              <li>Law enforcement when required by law</li>
            </ul>

            <h2>Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <ul>
              <li>Email: <ObfuscatedEmail user="hello" domain="boiseremodeling.co" className="text-primary hover:underline inline-flex items-center gap-1" showIcon={false} /></li>
              <li>
                Phone: <BusinessPhoneLink className="text-primary hover:underline" />{" "}
                <span className="text-muted-foreground">·</span>{" "}
                <SaveContactLink className="text-primary hover:underline">Save to contacts</SaveContactLink>
              </li>
              <li>
                Text: <a href={SITE_CONFIG.phoneSmsHref} className="text-primary hover:underline">{SITE_CONFIG.phone}</a>{" "}
                <span className="text-muted-foreground">·</span>{" "}
                <SaveContactLink className="text-primary hover:underline">Save to contacts</SaveContactLink>
              </li>
              <li>Service area: {SITE_CONFIG.address.cityState} · {SITE_CONFIG.address.serviceArea}</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
