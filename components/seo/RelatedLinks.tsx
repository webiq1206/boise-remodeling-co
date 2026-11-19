import { toSentenceCase } from '@/shared/sentenceCase';
import Link from 'next/link';
import { CITIES, SERVICE_AREA_CITIES, SERVICES } from '@/shared/contentData';
import { areaPath, cityServicePath, servicePath } from '@/lib/seo-routes';
import { isIndexedPath } from '@/lib/siteUrls';
import { getManifestLinks } from '@/lib/internal-links';
import { ArrowRight } from 'lucide-react';

/**
 * A city x service link that respects the sitemap's index rule: a noindexed
 * combo (the template ADU pages in the small cities) falls back to the indexed
 * service page, so the card stays useful without pointing at a noindexed URL.
 */
function indexedCityServiceHref(serviceSlug: string, citySlug: string): string {
  const href = cityServicePath(serviceSlug, citySlug);
  return isIndexedPath(href) ? href : servicePath(serviceSlug);
}

interface RelatedLinksProps {
  serviceSlug?: string;
  citySlug?: string;
  variant: 'service' | 'area' | 'city-service';
  /** Page path whose related pages (data/internal-links.json) join the reading list. */
  manifestPath?: string;
  /** Links the page already shows in its body. They are not repeated here. */
  exclude?: readonly string[];
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
 * One closing block of onward links for every landing page (owner, 19 November
 * 2026: the four stacked link lists read as clutter). Places and services are
 * compact cells, two across; guides and related pages are one ruled list. A
 * link appears once: nothing already in a cell or in the page body is repeated
 * in the list. Cells keep the full anchor text for search and screen readers
 * and show only the part that differs.
 */
interface Cell { href: string; label: string; context?: string }

function Cells({ cells }: { cells: Cell[] }) {
  return (
    <ul className="lx-cells">
      {cells.map((cell) => (
        <li key={cell.href + cell.label}>
          <Link href={cell.href} className="lx-cell">
            <span>
              {cell.context ? <span className="sr-only">{cell.context} </span> : null}
              {cell.label}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="lx-explore-group">
      <h3 className="lx-explore-label">{label}</h3>
      {children}
    </div>
  );
}

const MAX_READING = 6;

/** Pillar guide, planning pages and the page's related pages, each once. */
function readingLinks(serviceSlug: string | undefined, manifestPath: string | undefined, taken: Set<string>, readingOnly: boolean) {
  const guide = serviceSlug ? SERVICE_GUIDE[serviceSlug] : undefined;
  const fixed = [
    guide ?? { href: '/guides/treasure-valley-remodeling-guide', label: 'Treasure Valley Remodeling Guide' },
    { href: '/guides/boise-remodeling-cost-guide', label: 'Boise Remodeling Cost Guide' },
    { href: '/design-ideas', label: 'Remodeling design ideas' },
    { href: '/resources', label: 'Free remodel planning worksheets' },
  ];
  // Beside cells of places and services, the list holds guides and articles only.
  const related = (manifestPath ? getManifestLinks(manifestPath) : [])
    .filter((link) => !readingOnly || !/^\/(services|areas)\//.test(link.url))
    .map((link) => ({ href: link.url, label: link.anchor }));
  const out: { href: string; label: string }[] = [];
  for (const link of [...fixed, ...related]) {
    if (taken.has(link.href) || !isIndexedPath(link.href)) continue;
    taken.add(link.href);
    out.push(link);
    if (out.length === MAX_READING) break;
  }
  return out;
}

function Reading({ links }: { links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <Group label="Guides and planning">
      <ul className="ed-rule-list lx-related-list">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="ed-rule-link">
              {link.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </Group>
  );
}

export function RelatedLinks({ serviceSlug, citySlug, variant, manifestPath, exclude = [] }: RelatedLinksProps) {
  const taken = new Set<string>(exclude);
  const service = SERVICES.find((s) => s.slug === serviceSlug);
  const city = CITIES.find((c) => c.slug === citySlug);
  const groups: React.ReactNode[] = [];

  if (variant === 'area' && citySlug && city) {
    const cells = SERVICES.map((s) => ({
      href: indexedCityServiceHref(s.slug, citySlug),
      label: toSentenceCase(s.name),
      context: `${city.name}:`,
    }));
    cells.forEach((cell) => taken.add(cell.href));
    groups.push(<Group key="services" label={`Remodeling services in ${city.name}`}><Cells cells={cells} /></Group>);
  }

  if (variant === 'city-service' && serviceSlug && citySlug && service && city) {
    // Same index rule as the sitemap: noindexed combos are never linked.
    const cityCells: Cell[] = SERVICE_AREA_CITIES.filter(
      (c) => c.slug !== citySlug && isIndexedPath(cityServicePath(serviceSlug, c.slug)),
    ).map((c) => ({ href: cityServicePath(serviceSlug, c.slug), label: c.name, context: `${service.name} in` }));
    cityCells.push({ href: servicePath(serviceSlug), label: 'All areas', context: `${service.name}:` });
    const serviceCells: Cell[] = SERVICES.filter(
      (s) => s.slug !== serviceSlug && isIndexedPath(cityServicePath(s.slug, citySlug)),
    ).slice(0, 3).map((s) => ({ href: cityServicePath(s.slug, citySlug), label: toSentenceCase(s.name), context: `${city.name}:` }));
    serviceCells.push({ href: areaPath(citySlug), label: `All ${city.name} remodeling` });
    [...cityCells, ...serviceCells].forEach((cell) => taken.add(cell.href));
    groups.push(<Group key="cities" label={`${toSentenceCase(service.name)} in nearby cities`}><Cells cells={cityCells} /></Group>);
    groups.push(<Group key="services" label={`More services in ${city.name}`}><Cells cells={serviceCells} /></Group>);
  }

  const reading = readingLinks(serviceSlug, manifestPath, taken, groups.length > 0);
  if (groups.length === 0 && reading.length === 0) return null;

  return (
    <div className="lx-explore">
      <h2 className="ed-h2-sm ed-statement-wide">Keep exploring</h2>
      <div className="lx-explore-grid" data-groups={groups.length + (reading.length > 0 ? 1 : 0)}>
        {groups}
        <Reading links={reading} />
      </div>
    </div>
  );
}
