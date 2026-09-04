import Link from 'next/link';
import { CITIES, SERVICES } from '@/shared/contentData';
import { areaPath, cityServicePath, servicePath } from '@/lib/seo-routes';

interface RelatedLinksProps {
  serviceSlug?: string;
  citySlug?: string;
  variant: 'service' | 'area' | 'city-service';
}

/** Map each service to the pillar guide it should link "up" to. */
const SERVICE_GUIDE: Record<string, { href: string; label: string }> = {
  'kitchen-remodel': { href: '/guides/boise-kitchen-remodeling-guide', label: 'Boise Kitchen Remodeling Guide' },
  'bathroom-remodel': { href: '/guides/boise-bathroom-remodeling-guide', label: 'Boise Bathroom Remodeling Guide' },
  'whole-home-remodel': { href: '/guides/whole-home-remodeling-guide', label: 'Whole-Home Remodeling Guide' },
  'room-addition': { href: '/guides/boise-home-addition-guide', label: 'Boise Home Addition Guide' },
  adu: { href: '/guides/boise-home-addition-guide', label: 'Boise Home Addition Guide' },
};

/**
 * Shared cross-link block rendered on every landing page. Links "up" to the most
 * relevant pillar guide and feeds the two least-linked pages (testimonials,
 * resources) contextual internal links across the whole landing-page network.
 */
function ExploreFurther({ serviceSlug }: { serviceSlug?: string }) {
  const guide = serviceSlug ? SERVICE_GUIDE[serviceSlug] : undefined;
  const links: { href: string; label: string }[] = [
    guide ?? { href: '/guides/treasure-valley-remodeling-guide', label: 'Treasure Valley Remodeling Guide' },
    { href: '/testimonials', label: 'See recent projects & homeowner reviews' },
    { href: '/resources', label: 'Free remodel planning worksheets' },
    { href: '/guides/boise-remodeling-cost-guide', label: 'Boise Remodeling Cost Guide' },
  ];
  return (
    <div className="border-t pt-10" style={{ borderColor: "var(--ed-line)" }}>
      <h2 className="ed-h4 mb-6">Explore further</h2>
      <ul className="grid sm:grid-cols-2 gap-2">
        {links.map((link) => (
          <li key={link.href} className="list-none">
            <Link
              href={link.href}
              className="ed-body flex min-h-11 items-center text-[0.9375rem] transition-colors hover:[color:var(--ed-accent)] lg:min-h-0"
            >
              {link.label} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RelatedLinks({ serviceSlug, citySlug, variant }: RelatedLinksProps) {
  if (variant === 'service' && serviceSlug) {
    return (
      <div className="space-y-10">
        <div>
        <h2 className="ed-h2-sm ed-statement-wide mb-8">
          {SERVICES.find((s) => s.slug === serviceSlug)?.name} by city
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={cityServicePath(serviceSlug, city.slug)}
              className="ed-body flex min-h-11 items-center border-b py-3 text-[0.9375rem] transition-colors hover:[color:var(--ed-accent)] lg:min-h-0 [border-color:var(--ed-line)]"
            >
              {city.name}, Idaho
            </Link>
          ))}
          </div>
        </div>
        <ExploreFurther serviceSlug={serviceSlug} />
      </div>
    );
  }

  if (variant === 'area' && citySlug) {
    const city = CITIES.find((c) => c.slug === citySlug);
    return (
      <div className="space-y-10">
        <div>
          <h2 className="ed-h2-sm ed-statement-wide mb-8">
            Remodeling services in {city?.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {SERVICES.map((service) => (
              <Link key={service.slug} href={cityServicePath(service.slug, citySlug)}>
                <div className="ed-card ed-card-link h-full">
                  <h3 className="ed-h4">{service.name}</h3>
                  <p className="ed-body mt-2 text-[0.875rem]">{service.shortDescription}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <ExploreFurther />
      </div>
    );
  }

  if (variant === 'city-service' && serviceSlug && citySlug) {
    const otherCities = CITIES.filter((c) => c.slug !== citySlug).slice(0, 4);
    const otherServices = SERVICES.filter((s) => s.slug !== serviceSlug).slice(0, 3);
    return (
      <div className="space-y-10">
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="ed-h4 mb-6">
            Same service, nearby cities
          </h2>
          <ul className="space-y-2">
            {otherCities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={cityServicePath(serviceSlug, city.slug)}
                  className="ed-body text-[0.9375rem] transition-colors hover:[color:var(--ed-accent)]"
                >
                  {SERVICES.find((s) => s.slug === serviceSlug)?.name} in {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="ed-h4 mb-6">
            More services in {CITIES.find((c) => c.slug === citySlug)?.name}
          </h2>
          <ul className="space-y-2">
            {otherServices.map((service) => (
              <li key={service.slug}>
                <Link
                  href={cityServicePath(service.slug, citySlug)}
                  className="ed-body text-[0.9375rem] transition-colors hover:[color:var(--ed-accent)]"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--ed-line)" }}>
            <Link href={servicePath(serviceSlug)} className="ed-link">
              All {SERVICES.find((s) => s.slug === serviceSlug)?.name} areas →
            </Link>
            <Link href={areaPath(citySlug)} className="ed-link mt-4 block w-fit">
              Remodeling in {CITIES.find((c) => c.slug === citySlug)?.name} →
            </Link>
          </div>
        </div>
      </div>
        <ExploreFurther serviceSlug={serviceSlug} />
      </div>
    );
  }

  return null;
}
