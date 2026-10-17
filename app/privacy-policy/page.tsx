import { InteriorDocument,InteriorPage } from '@/components/approved/InteriorLayout';
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { ObfuscatedEmail } from "@/components/ObfuscatedEmail";
import { SaveContactLink } from "@/components/SaveContactLink";
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical,FEED_ALTERNATES } from "@/lib/page-metadata";
import { generateBreadcrumbSchema,generateWebPageSchema } from "@/lib/schema";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { Metadata } from "next";

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
    <InteriorPage kind="legal"><div className="flex flex-col">
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
          <InteriorDocument heading={<h1>Privacy Policy for Boise Remodeling Co Services</h1>} contents={[{"id":"document-section-1","label":"Introduction"},{"id":"document-section-2","label":"Information We Collect"},{"id":"document-section-3","label":"How We Use Your Information"},{"id":"document-section-4","label":"Information Sharing"},{"id":"cookies-analytics-advertising","label":"Cookies, analytics and advertising"},{"id":"document-section-5","label":"Data Security"},{"id":"document-section-6","label":"Your Rights"},{"id":"document-section-7","label":"Contact Us"}]}>

            <p className="lead text-muted-foreground">
              Last updated: October 17, 2026
            </p>

            <h2 id="document-section-1">Introduction</h2>
            <p>
              Boise Remodeling Co ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
            </p>

            <h2 id="document-section-2">Information We Collect</h2>
            <p>We may collect information about you in various ways, including:</p>
            <ul>
              <li><strong>Personal Data:</strong> Name, email address, phone number, and mailing address when you request a quote or contact us.</li>
              <li><strong>Property Information:</strong> Address and details about your property for service estimates.</li>
              <li><strong>Payment Information:</strong> Payment details processed securely through our payment providers.</li>
              <li><strong>Usage Data:</strong> Information about how you use our website, including pages visited and features used.</li>
            </ul>

            <h2 id="document-section-3">How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process your requests and transactions</li>
              <li>Send you service-related communications</li>
              <li>Improve our website and services</li>
              <li>Respond to your inquiries and support requests</li>
              <li>Send marketing communications (with your consent)</li>
            </ul>

            <h2 id="document-section-4">Information Sharing</h2>
            <p>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul>
              <li>Service providers who assist in our operations</li>
              <li>Professional advisors as needed</li>
              <li>Law enforcement when required by law</li>
            </ul>

            <h2 id="cookies-analytics-advertising">Cookies, analytics and advertising</h2>
            <p>
              We use Google Analytics 4 (GA4) to understand how visitors use this site, such as pages viewed, referring site, approximate location, browser and device type. We use Google Ads conversion tracking to measure which of our ads lead to calls, form submissions and completed estimates. Google's tag also adds visitors to remarketing lists, and Google may use this data to show you relevant ads on other websites (remarketing). These tools set cookies and receive information about your visit, including your IP address, which Google processes under its own privacy policy (<a href="https://policies.google.com/privacy" className="text-primary hover:underline">https://policies.google.com/privacy</a>). When you successfully submit a form or finish the estimator with your contact details, our site passes whichever of these you provide (your email address, phone number, first name, last name and ZIP code) to Google's advertising tag, which converts them into a scrambled code (a SHA-256 hash) before sending them to Google. Google matches that code against its own records to tell us which of our ads lead to inquiries. We do not send your street address or your project description to Google. Google Analytics receives only the type of project you choose (for example, an addition or an ADU) and a random reference number for your inquiry when you use the estimator or send an inquiry. Google Ads receives the same reference number so each lead is counted only once. Calls from our site or ads may be routed through a Google forwarding number so we can measure which ads lead to calls. You can opt out of personalized Google ads at <a href="https://adssettings.google.com" className="text-primary hover:underline">https://adssettings.google.com</a>, use the Google Analytics opt-out add-on at <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary hover:underline">https://tools.google.com/dlpage/gaoptout</a>, or block or delete cookies in your browser; the site will still work.
            </p>
            <p>
              We also use the Meta Pixel and Meta's Conversions API to measure visits and inquiries from our Facebook and Instagram ads. When you submit an inquiry, we may send Meta the type of project you choose, a project-inquiry label, an inquiry id, the web address of the page you are on, your IP address, your browser's user agent, and the Meta cookies _fbp and _fbc so it can match the inquiry to an ad. Meta's pixel may also record which buttons you click and basic information about the page, such as its title. Meta processes this under its own privacy policy (<a href="https://www.facebook.com/privacy/policy" className="text-primary hover:underline">https://www.facebook.com/privacy/policy</a>).
            </p>
            <p>
              We also use Microsoft Clarity to see how visitors use our pages through heatmaps and session recordings; form fields are masked so what you type is not recorded. Microsoft processes this under its own privacy statement (<a href="https://privacy.microsoft.com/privacystatement" className="text-primary hover:underline">https://privacy.microsoft.com/privacystatement</a>).
            </p>

            <h2 id="document-section-5">Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 id="document-section-6">Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 id="document-section-7">Contact Us</h2>
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
          </InteriorDocument>
        </div>
      </section>
    </div></InteriorPage>
  );
}
