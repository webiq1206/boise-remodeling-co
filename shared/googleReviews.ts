/**
 * Two real Google reviews on the P5 Home Co Business Profile (owner answer,
 * 20 November 2026). Verbatim: whole sentences may be cut, words are never
 * changed. Toni Knowles' second sentence is left out because it carries an em
 * dash (house rule); the "..." marks the cut. Never add a review, a rating
 * count or star markup, and never emit Review or AggregateRating JSON-LD for
 * these: they are reviews of the parent company shown on its own site.
 */
export const P5_GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/place/?q=place_id:ChIJzxMoavs6P6IRNc6i9aOvt6Q';

export interface GoogleReview {
  name: string;
  text: string;
}

export const GOOGLE_REVIEWS: readonly GoogleReview[] = [
  {
    name: 'Toni Knowles',
    text: 'Nick with P5 completed a full kitchen and home remodel at my home in the North End, and he was absolutely amazing! ... Nick was attentive, thoughtful, and dedicated to making sure every detail was just right. We couldn\'t be happier with the results and highly recommend him to anyone looking for an exceptional remodeling experience!',
  },
  {
    // The name as written on Google.
    name: 'beverly van zandt',
    text: "We had P5 remodel our bathroom and kitchen, and we couldn't be happier with the work! They do a little bit of everything. No job seems too big or too small. If you're looking for someone reliable who can handle a variety of projects, I highly recommend giving P5 a call. Definitely recommend!",
  },
];
