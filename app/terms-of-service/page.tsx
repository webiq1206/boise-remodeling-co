import { InteriorDocument,InteriorPage } from '@/components/approved/InteriorLayout';
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import { ObfuscatedEmail } from "@/components/ObfuscatedEmail";
import { SaveContactLink } from "@/components/SaveContactLink";
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical,FEED_ALTERNATES } from "@/lib/page-metadata";
import { generateBreadcrumbSchema,generateWebPageSchema } from "@/lib/schema";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { Metadata } from "next";

export const metadata: Metadata = withBrandPageMetadata(({
  title: "Terms of Service",
  description: "Terms of service for Boise Remodeling Co: your signed agreement controls, written scope and changes, milestone payments, and warranty coverage.",
  alternates: {
    canonical: buildCanonical("/terms-of-service"),
    types: FEED_ALTERNATES,
  },
  openGraph: {
    title: "Terms of Service | Boise Remodeling Co",
    description: "Your rights when using Boise Remodeling Co remodeling and renovation services in Idaho's Treasure Valley.",
    url: "https://boiseremodeling.co/terms-of-service",
    type: "website",
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Boise Remodeling Co" }],
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | Boise Remodeling Co",
    description: "Your rights when using Boise Remodeling Co remodeling and renovation services in Idaho's Treasure Valley.",
  },
}), "/terms-of-service");

export default function TermsOfServicePage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Terms of Service", url: "/terms-of-service" },
  ]);
  const webPageSchema = generateWebPageSchema({
    title: "Terms of Service",
    description: "Terms of service for Boise Remodeling Co. Your rights and responsibilities when using our services.",
    url: "/terms-of-service",
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
          <InteriorDocument heading={<h1>Terms of service for Boise Remodeling Co</h1>} contents={[{"id":"document-section-1","label":"Agreement to terms"},{"id":"document-section-2","label":"Who we are"},{"id":"document-section-3","label":"Your signed agreement controls"},{"id":"document-section-4","label":"Free conversation and paid planning"},{"id":"document-section-5","label":"Scope, price and changes"},{"id":"document-section-6","label":"Payment terms"},{"id":"document-section-7","label":"Scheduling and cancellation"},{"id":"document-section-8","label":"Property access"},{"id":"document-section-9","label":"Subcontractors"},{"id":"document-section-10","label":"Warranty"},{"id":"document-section-11","label":"Limitation of liability"},{"id":"document-section-12","label":"Changes to terms"},{"id":"document-section-13","label":"Contact information"}]}>

            <p className="lead text-muted-foreground">
              Last updated: November 8, 2026
            </p>

            <h2 id="document-section-1">Agreement to terms</h2>
            <p>
              By using this website or our services you agree to these Terms of Service. They are a general summary of how we work. If you do not agree to them, please do not use our services.
            </p>

            <h2 id="document-section-2">Who we are</h2>
            <p>
              Boise Remodeling Co is a DBA of {SITE_CONFIG.legalName} ("Company," "we," "us," or "our"), Idaho Registered Contractor #8381215. We provide residential remodeling services in the Treasure Valley area of Idaho.
            </p>

            <h2 id="document-section-3">Your signed agreement controls</h2>
            <p>
              The written agreement you sign for your project controls. If anything on this page differs from your signed agreement, your signed agreement governs. These terms do not change any agreement that has already been signed.
            </p>

            <h2 id="document-section-4">Free conversation and paid planning</h2>
            <ul>
              <li>The first conversation and project review are free.</li>
              <li>Paid planning, design or feasibility work begins only after you approve its scope and price in writing.</li>
              <li>Planning ranges on this website are budget guidance, not quotes or bids.</li>
            </ul>

            <h2 id="document-section-5">Scope, price and changes</h2>
            <ul>
              <li>The scope of work and the price are set in writing before work begins.</li>
              <li>Changes to scope, price or schedule are agreed in writing before the affected work is done or the affected materials are ordered.</li>
              <li>If conditions found during the work call for a change, we explain it and agree the change with you in writing before going ahead with the affected work.</li>
            </ul>

            <h2 id="document-section-6">Payment terms</h2>
            <ul>
              <li>Payment follows the schedule in your agreement. Remodeling projects are paid in milestone payments as stated in the agreement.</li>
              <li>We accept major credit cards, checks, and electronic payments.</li>
              <li>Any late payment terms are the ones stated in your agreement.</li>
            </ul>

            <h2 id="document-section-7">Scheduling and cancellation</h2>
            <ul>
              <li>Service schedules are weather-dependent and may be adjusted as needed</li>
              <li>We will make reasonable efforts to notify you of schedule changes</li>
              <li>Cancellation of scheduled appointments requires 24-hour advance notice</li>
              <li>Special-order and custom items may be non-cancellable once ordered. When that applies, we tell you before you approve the item.</li>
            </ul>

            <h2 id="document-section-8">Property access</h2>
            <p>
              By engaging our services, you grant us permission to access your property as necessary to perform the agreed-upon work. Please ensure gates are unlocked and pets are secured on service days.
            </p>

            <h2 id="document-section-9">Subcontractors</h2>
            <p>
              We may use subcontractors, for example licensed plumbing, electrical and HVAC trades, where the work calls for them. At the end of every project we provide a complete list of the subcontractors who worked on it, with their contact information.
            </p>

            <h2 id="document-section-10">Warranty</h2>
            <ul>
              <li>Work performed by our own team carries a one-year workmanship warranty from documented Final Completion.</li>
              <li>Work performed by subcontractors is covered by that subcontractor's own warranty.</li>
              <li>Manufacturer and product warranties are separate and follow the manufacturer's terms.</li>
              <li>Formal warranty notice is given by the method stated in your signed agreement.</li>
            </ul>
            <p>
              Our <a href="/warranty" className="text-primary hover:underline">warranty page</a> explains what is covered and how to get help with a completed project.
            </p>

            <h2 id="document-section-11">Limitation of liability</h2>
            <p>
              While we take great care in providing our services, Boise Remodeling Co's liability for any claims arising from our services is limited to the amount paid for the specific service in question. We are not liable for pre-existing conditions, normal wear, or conditions outside our control. This section does not reduce the warranty described above or any right in your signed agreement.
            </p>

            <h2 id="document-section-12">Changes to terms</h2>
            <p>
              We may update these terms. Changes take effect when posted on this website and do not change an agreement you have already signed.
            </p>

            <h2 id="document-section-13">Contact information</h2>
            <p>
              For questions about these Terms of Service, please contact us:
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
