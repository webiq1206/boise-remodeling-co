export interface TestimonialItem {
  customerName: string;
  serviceType: string;
  city: string;
  rating: string;
  testimonial: string;
}

/**
 * No real customer reviews exist yet. Do not fill this with fabricated
 * names/quotes to make the testimonials UI look populated - every consumer
 * of this array (TestimonialsSection, the /api/testimonials fallback) is
 * built to render nothing when it is empty, so the feature activates
 * automatically the day real reviews are added here.
 */
export const TESTIMONIALS: TestimonialItem[] = [];

/**
 * Return testimonials that match a specific service + city, used to embed
 * local proof on city x service landing pages. City-tagged data only exists
 * for a subset of cities today (Boise, Meridian, Eagle, Nampa).
 */
export function getTestimonialsFor(
  serviceSlug: string,
  citySlug: string,
): TestimonialItem[] {
  return TESTIMONIALS.filter(
    (t) => t.serviceType === serviceSlug && t.city === citySlug,
  );
}

/** Return all testimonials for a city (any service). Used on area pages. */
export function getTestimonialsForCity(citySlug: string): TestimonialItem[] {
  return TESTIMONIALS.filter((t) => t.city === citySlug);
}
