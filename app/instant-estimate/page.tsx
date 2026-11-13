import type { Metadata } from "next";
import { InteriorPage } from "@/components/approved/InteriorLayout";
import { BusinessPhoneLink } from "@/components/BusinessPhoneContact";
import EstimatorAnalytics from "@/components/estimator/EstimatorAnalytics";
import EstimatorFrame from "@/components/estimator/EstimatorFrame";
import { familyButtonClass } from "@/components/family/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { withBrandPageMetadata } from "@/lib/brand-page-metadata";
import { buildCanonical, fitDescription } from "@/lib/page-metadata";
import { generateBreadcrumbSchema, generateWebPageSchema } from "@/lib/schema";
import { CTA_REQUEST, ESTIMATOR_PATH, REQUEST_PATH } from "@/shared/ctaCopy";
import { SITE_CONFIG } from "@/shared/siteConfig";
import styles from "./instant-estimate.module.css";

/**
 * The P5 family estimator, framed into this site (owner decision, 13 November
 * 2026). There is ONE estimator: it runs on p5homeco.com, where the questions,
 * the pricing, the property lookup, the QuickBooks estimate and the lead all
 * live. This page only frames it (components/estimator/EstimatorFrame.tsx) and
 * reports its events to this site's analytics (EstimatorAnalytics.tsx). Never
 * copy estimator logic or pricing into this repository.
 *
 * The heading block is short on purpose: on a phone the first estimator
 * question has to be on the first screen.
 *
 * Wording: it is an instant preliminary estimate, a price range for budgeting.
 * It is never a quote, a bid or a final price, and the page makes no promise
 * about how fast a person replies.
 */
const TITLE = "Instant Remodel Estimate in Boise";
const DESCRIPTION = fitDescription(
  "Answer a few questions and see a preliminary price range for your Boise remodel on screen. Free, any time, with no appointment needed.",
);
/** The family header's desktop height (--header-height in styles/family-tokens.css: 64px on phones, 76px from 640px). */
const HEADER_OFFSET = 76;
const PROJECT_ID = /^[a-z0-9-]{1,40}$/;

export const metadata: Metadata = withBrandPageMetadata(
  {
    title: { absolute: `${TITLE} | Boise Remodeling Co` },
    description: DESCRIPTION,
    alternates: { canonical: buildCanonical(ESTIMATOR_PATH) },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: buildCanonical(ESTIMATOR_PATH),
      type: "website",
      images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "Boise Remodeling Co" }],
    },
  },
  ESTIMATOR_PATH,
);

const STEPS: { title: string; text: string }[] = [
  {
    title: "Pick your project and answer a few questions",
    text: "Tell us what you are planning, how big it is and the level of finish you have in mind.",
  },
  {
    title: "We add your home's public record",
    text: "Where the county publishes your home's record, we use it so you have less to type. Where it does not, we ask you.",
  },
  {
    title: "See your preliminary range on screen",
    text: "Your preliminary price range appears with a breakdown by division of work.",
  },
];

export default async function InstantEstimatePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const requested = searchParams.project;
  const project = typeof requested === "string" && PROJECT_ID.test(requested) ? requested : null;
  const schemas = [
    generateWebPageSchema({ title: TITLE, description: DESCRIPTION, url: ESTIMATOR_PATH }),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Instant estimate", url: ESTIMATOR_PATH },
    ]),
  ];

  return (
    <InteriorPage kind="instant-estimate">
      <div className={styles.page}>
        <JsonLd data={schemas} />
        <header className={`${styles.container} ${styles.intro}`}>
          <h1 className={styles.title}>Get your instant remodel estimate</h1>
          <p className={styles.support}>
            Answer a few questions and see a personalized preliminary price range on screen. Free, any time, with no
            appointment and no waiting for a callback.
          </p>
        </header>

        {/* The estimator owns the screen while it is in view: the bottom bar steps aside (data-family-bar-yield). */}
        <div className={`${styles.container} ${styles.frame}`} data-family-bar-yield="">
          <EstimatorAnalytics />
          <EstimatorFrame
            brand="remodeling"
            project={project}
            title="Boise Remodeling Co instant remodel estimate"
            headerOffset={HEADER_OFFSET}
          />
        </div>

        <section className={`${styles.container} ${styles.section}`} aria-labelledby="instant-estimate-how">
          <h2 id="instant-estimate-how" className={styles.heading}>How it works</h2>
          <ol className={styles.steps}>
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.band} aria-labelledby="instant-estimate-range">
          <div className={`${styles.container} ${styles.split}`}>
            <h2 id="instant-estimate-range" className={styles.heading}>A preliminary range now, a firm proposal after we visit</h2>
            <div className={styles.copy}>
              <p>
                The instant estimate is a preliminary price range to help you budget. It is not a final price.
              </p>
              <p>
                A firm written proposal follows a site visit, measurements and your selections.
              </p>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.section} ${styles.split}`} aria-labelledby="instant-estimate-talk">
          <h2 id="instant-estimate-talk" className={styles.heading}>Prefer to talk to us?</h2>
          <div className={styles.copy}>
            <p>Call us, or send a short request and tell us about your home.</p>
            <div className={styles.actions}>
              <BusinessPhoneLink
                className={familyButtonClass({ variant: "secondary", size: "lg" })}
                data-testid="link-instant-estimate-call"
              >
                Call {SITE_CONFIG.phone}
              </BusinessPhoneLink>
              <a
                href={REQUEST_PATH}
                className={familyButtonClass({ variant: "tertiary" })}
                data-testid="link-instant-estimate-request"
              >
                {CTA_REQUEST}
              </a>
            </div>
          </div>
        </section>
      </div>
    </InteriorPage>
  );
}
