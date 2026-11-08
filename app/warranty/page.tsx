import { InteriorDocument, InteriorPage } from '@/components/approved/InteriorLayout';
import { withBrandPageMetadata } from '@/lib/brand-page-metadata';
import { buildCanonical, FEED_ALTERNATES } from '@/lib/page-metadata';
import { generateBreadcrumbSchema, generateWebPageSchema } from '@/lib/schema';
import { SITE_CONFIG } from '@/shared/siteConfig';
import {
  FINAL_COMPLETION_DEFINITION,
  WARRANTY_COVERAGE,
  WARRANTY_DESCRIPTION,
  WARRANTY_HELP_ANCHOR,
  WARRANTY_HELP_FIELDS,
  WARRANTY_NOT_COVERED,
  WARRANTY_PATH,
  WARRANTY_TITLE,
  warrantyHelpMailto,
} from '@/shared/content/warrantyPage';
import { Metadata } from 'next';

/**
 * Release 2, D8: the warranty page, built on the same InteriorDocument layout
 * as the terms and privacy pages. Content lives in shared/content/warrantyPage.ts.
 */
export const metadata: Metadata = withBrandPageMetadata(({
  title: 'Warranty',
  description: WARRANTY_DESCRIPTION,
  alternates: {
    canonical: buildCanonical(WARRANTY_PATH),
    types: FEED_ALTERNATES,
  },
  openGraph: {
    title: 'Warranty | Boise Remodeling Co',
    description: WARRANTY_DESCRIPTION,
    url: buildCanonical(WARRANTY_PATH),
    type: 'website',
    images: [{ url: '/images/og-default.png', width: 1200, height: 630, alt: 'Boise Remodeling Co' }],
  },
  twitter: {
    card: 'summary',
    title: 'Warranty | Boise Remodeling Co',
    description: WARRANTY_DESCRIPTION,
  },
}), WARRANTY_PATH);

const CONTENTS = [
  { id: 'warranty-coverage', label: 'What the warranty covers' },
  { id: 'final-completion', label: 'When coverage starts' },
  { id: 'not-covered', label: 'What is not covered' },
  { id: WARRANTY_HELP_ANCHOR, label: 'Get help with a completed project' },
  { id: 'formal-notice', label: 'Formal warranty notice' },
];

export default function WarrantyPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Warranty', url: WARRANTY_PATH },
  ]);
  const webPageSchema = generateWebPageSchema({
    title: WARRANTY_TITLE,
    description: WARRANTY_DESCRIPTION,
    url: WARRANTY_PATH,
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
          <InteriorDocument heading={<h1>Warranty and help with a completed project</h1>} contents={CONTENTS}>

            <p className="lead text-muted-foreground">
              How our workmanship warranty works, who covers what, and how to reach us about a completed project.
            </p>

            <h2 id="warranty-coverage">What the warranty covers</h2>
            <ul>
              {WARRANTY_COVERAGE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2 id="final-completion">When coverage starts</h2>
            <p>{FINAL_COMPLETION_DEFINITION}</p>

            <h2 id="not-covered">What is not covered</h2>
            <ul>
              {WARRANTY_NOT_COVERED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h2 id={WARRANTY_HELP_ANCHOR}>Get help with a completed project</h2>
            <p>
              If something in your finished project needs attention, email or call us. If there is immediate danger,
              such as a gas smell, an electrical hazard or active water leaking, leave the area if needed and contact
              emergency services or your utility first, then let us know.
            </p>
            <p>These details help us look into it:</p>
            <ul>
              {WARRANTY_HELP_FIELDS.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <ul>
              <li>
                Email:{' '}
                <a href={warrantyHelpMailto()} className="text-primary hover:underline">
                  {SITE_CONFIG.email}
                </a>{' '}
                (opens a message with these details listed)
              </li>
              <li>
                Phone:{' '}
                <a href={SITE_CONFIG.phoneHref} className="text-primary hover:underline">
                  {SITE_CONFIG.phone}
                </a>
              </li>
            </ul>
            <p>
              There is no portal or ticket to file. We answer and help you work out the next step. For subcontractor
              work, we can point you to the right subcontractor from the list you received at the end of the project.
            </p>

            <h2 id="formal-notice">Formal warranty notice</h2>
            <p>
              Your signed agreement controls formal warranty claims. If it names a notice method, use that method for
              a formal claim. An email or call is a good way to start, but it may not replace the notice your agreement
              requires. Our <a href="/terms-of-service" className="text-primary hover:underline">terms of service</a>{' '}
              summarize how we work.
            </p>
          </InteriorDocument>
        </div>
      </section>
    </div></InteriorPage>
  );
}
