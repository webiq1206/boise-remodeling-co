import Link from 'next/link';
import { CITIES, SERVICES } from '@/shared/contentData';
import { areaPath, cityServicePath, servicePath } from '@/lib/seo-routes';
import { MarketingCard } from '@/components/marketing/MarketingCard';

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
    <div className="border-t border-border pt-8">
      <h2 className="font-sans font-normal text-sm mb-4 text-foreground">Explore further</h2>
      <ul className="grid sm:grid-cols-2 gap-2">
        {links.map((link) => (
          <li key={link.href} className="list-none">
            <Link
              href={link.href}
              className="flex items-center min-h-11 lg:min-h-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
        <h2 className="font-sans font-light text-section-title mb-6 text-foreground">
          {SERVICES.find((s) => s.slug === serviceSlug)?.name} by city
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={cityServicePath(serviceSlug, city.slug)}
              className="flex items-center min-h-11 lg:min-h-0 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border-b border-border"
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
          <h2 className="font-sans font-light text-section-title mb-6 text-foreground">
            Remodeling services in {city?.name}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {SERVICES.map((service) => (
              <Link key={service.slug} href={cityServicePath(service.slug, citySlug)}>
                <MarketingCard className="h-full hover:border-accent/40 transition-colors">
                  <h3 className="font-normal text-sm text-foreground mb-2">{service.name}</h3>
                  <p className="text-sm text-muted-foreground">{service.shortDescription}</p>
                </MarketingCard>
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
          <h2 className="font-sans font-normal text-sm mb-4 text-foreground">
            Same service, nearby cities
          </h2>
          <ul className="space-y-2">
            {otherCities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={cityServicePath(serviceSlug, city.slug)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {SERVICES.find((s) => s.slug === serviceSlug)?.name} in {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-sans font-normal text-sm mb-4 text-foreground">
            More services in {CITIES.find((c) => c.slug === citySlug)?.name}
          </h2>
          <ul className="space-y-2">
            {otherServices.map((service) => (
              <li key={service.slug}>
                <Link
                  href={cityServicePath(service.slug, citySlug)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {service.name}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 pt-6 border-t border-border space-y-2">
            <Link href={servicePath(serviceSlug)} className="text-sm font-normal text-foreground hover:text-foreground/70">
              All {SERVICES.find((s) => s.slug === serviceSlug)?.name} areas →
            </Link>
            <Link href={areaPath(citySlug)} className="block text-sm font-normal text-foreground hover:text-foreground/70">
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
