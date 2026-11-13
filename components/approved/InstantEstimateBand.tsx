import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CTA_PRIMARY, CTA_REQUEST, ESTIMATOR_PATH, REQUEST_PATH } from '@/shared/ctaCopy';
import styles from './InstantEstimateBand.module.css';

const BENEFITS = [
  'Free and open day or night',
  'No appointment needed to see your range',
  'A preliminary range now, a firm written proposal after we visit',
];

/**
 * The homepage band that sells the central estimator (owner decision,
 * 13 November 2026). It sits right under the hero and its proof strip, on the
 * existing slim call-to-action strip: a headline, one sentence, three short
 * benefits and the button, with "Request a quote" beside it as the path to a
 * person. The estimator itself is framed at /instant-estimate.
 */
export function InstantEstimateBand() {
  return (
    <section className="fr-cta-strip" aria-labelledby="home-instant-estimate-title" data-home-estimator-band="">
      <div className="f-container">
        <div>
          <h2 id="home-instant-estimate-title">See your remodel price range now.</h2>
          <p>Answer a few questions and see a personalized preliminary price range on screen.</p>
          <ul className={styles.benefits}>
            {BENEFITS.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
        </div>
        <div className="fr-cta-strip-actions">
          <Link className="f-button f-dark" href={ESTIMATOR_PATH} data-cta="primary">{CTA_PRIMARY}</Link>
          <Link className="f-link" href={REQUEST_PATH}>{CTA_REQUEST} <ArrowUpRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}
