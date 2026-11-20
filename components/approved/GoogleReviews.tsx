import { GOOGLE_REVIEWS, P5_GOOGLE_REVIEWS_URL } from '@/shared/googleReviews';

/**
 * The two Google reviews of P5 Home Co, the parent company, shown beside the
 * request form (owner answer, 20 November 2026). Name, "Google review" and a
 * link to the profile; no stars, no rating count, no review schema.
 */
export function GoogleReviews() {
  return (
    <section className="fr-reviews" aria-labelledby="fr-reviews-title">
      <p className="f-eyebrow" id="fr-reviews-title">GOOGLE REVIEWS OF P5 HOME CO, OUR PARENT COMPANY</p>
      <ul>
        {GOOGLE_REVIEWS.map((review) => (
          <li key={review.name}>
            <figure>
              <blockquote>
                <p>&ldquo;{review.text}&rdquo;</p>
              </blockquote>
              <figcaption>
                <span>{review.name}</span>
                <span>Google review</span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <a className="f-link" href={P5_GOOGLE_REVIEWS_URL} rel="noopener" target="_blank">
        See our Google reviews
      </a>
    </section>
  );
}
