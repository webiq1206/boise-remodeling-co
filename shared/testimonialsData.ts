export interface TestimonialItem {
  customerName: string;
  serviceType: string;
  city: string;
  rating: string;
  testimonial: string;
}

/**
 * No real customer reviews exist yet. Do not fill this with fabricated
 * names or quotes. SHOW_TESTIMONIALS stays false until genuine reviews
 * exist. The stored rows stay in the database. Public pages, schema, and
 * /api/testimonials publish nothing while the flag is off.
 */
export const SHOW_TESTIMONIALS = false;

export const TESTIMONIALS: TestimonialItem[] = [];

/** Quotes and ratings that may be shown. Empty while the flag is off. */
export function testimonialsForPublish<T>(items: readonly T[] | undefined | null): T[] {
  if (!SHOW_TESTIMONIALS || !items || items.length === 0) return [];
  return [...items];
}

/**
 * Return testimonials that match a specific service + city, used to embed
 * local proof on city x service landing pages. City-tagged data only exists
 * for a subset of cities today (Boise, Meridian, Eagle, Nampa).
 */
export function getTestimonialsFor(
  serviceSlug: string,
  citySlug: string,
): TestimonialItem[] {
  return testimonialsForPublish(TESTIMONIALS).filter(
    (t) => t.serviceType === serviceSlug && t.city === citySlug,
  );
}

/** Return all testimonials for a city (any service). Used on area pages. */
export function getTestimonialsForCity(citySlug: string): TestimonialItem[] {
  return testimonialsForPublish(TESTIMONIALS).filter((t) => t.city === citySlug);
}
