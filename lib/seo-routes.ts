import { CITIES, SERVICES, getCityBySlug, getServiceBySlug } from '@/shared/contentData';

export const SERVICE_SLUGS = SERVICES.map((s) => s.slug);
export const CITY_SLUGS = CITIES.map((c) => c.slug);

export function getAllCityServiceParams() {
  return SERVICES.flatMap((service) =>
    CITIES.filter((city) => city.slug !== 'garden-city').map((city) => ({
      slug: service.slug,
      city: city.slug,
    })),
  );
}

export function servicePath(slug: string) {
  return `/services/${slug}`;
}

export function areaPath(citySlug: string) {
  return `/areas/${citySlug}`;
}

export function cityServicePath(serviceSlug: string, citySlug: string) {
  return `/services/${serviceSlug}/${citySlug}`;
}

export { getServiceBySlug, getCityBySlug };
