import { toSentenceCase } from '@/shared/sentenceCase';
import Image from '@/components/VersionedImage';
import Link from 'next/link';
import { CITIES, SERVICE_AREA_CITIES, SERVICES } from '@/shared/contentData';
import { areaPath, cityServicePath, servicePath } from '@/lib/seo-routes';
import { isIndexedPath } from '@/lib/siteUrls';
import { getManifestLinks } from '@/lib/internal-links';
import { ArrowRight } from 'lucide-react';
import { getBlogHeroImage } from '@/shared/blogImages';
import { getCityServiceImage } from '@/shared/cityServiceImages';
import { getServiceBackground } from '@/shared/serviceBackgrounds';
import { SITE_IMAGES } from '@/shared/siteImages';
import { resolveExploreImages } from '@/shared/exploreImages';
import { CITY_HERO_IMAGES } from '@/shared/cityServiceImages';
import { getBlogImageAlt } from '@/shared/blogImages';
import { contentImageAlt } from '@/shared/contentImageAlt';

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
  /** Photographs already on the page. A card never repeats one of them. */
  usedImages?: readonly (string | undefined)[];
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
 * photo cards (a swipe row on phones, four across from tablet up), each with the
 * photograph of the page it opens; guides and related pages are one list with
 * thumbnails. Every photograph carries the alt of the page it opens: the work
 * and the place, then what the picture shows. A
 * link appears once: nothing already in a cell or in the page body is repeated
 * in the list. Cells keep the full anchor text for search and screen readers
 * and show only the part that differs.
 */
interface Cell { href: string; label: string; context?: string; image?: string; subject?: string }

/** The photograph that belongs to the page a link opens. */
function pageImageAlt(href: string, src: string): string {
  const [section, slug] = href.split('/').filter(Boolean);
  if ((section === 'blog' || section === 'guides') && slug) return getBlogImageAlt(slug);
  return contentImageAlt(src);
}

function pageImage(href: string): string | undefined {
  const [section, slug] = href.split('/').filter(Boolean);
  if ((section === 'blog' || section === 'guides') && slug) return getBlogHeroImage(slug);
  if (section === 'services' && slug) return getCityServiceImage(href) ?? getServiceBackground(slug);
  if (section === 'areas' && slug) return getCityServiceImage(href);
  if (section === 'design-ideas') return SITE_IMAGES.statementBand;
  if (section === 'resources') return SITE_IMAGES.process;
  return undefined;
}

function Cells({ cells }: { cells: Cell[] }) {
  return (
    <ul
      className="lx-cells"
      style={{
        // One full row on desktop for up to six cards; otherwise rows of four. Tablets take rows of three or four.
        ['--lx-cols' as string]: cells.length <= 6 ? cells.length : 4,
        ['--lx-cols-tablet' as string]: cells.length % 4 === 0 ? 4 : 3,
      }}
    >
      {cells.map((cell) => (
        <li key={cell.href + cell.label}>
          <Link href={cell.href} className="lx-cell">
            {(cell.image ?? pageImage(cell.href)) ? (
              <span className="lx-cell-photo">
                <Image src={(cell.image ?? pageImage(cell.href)) as string} alt={pageImageAlt(cell.href, (cell.image ?? pageImage(cell.href)) as string)} fill sizes="(max-width: 700px) 46vw, 300px" className="object-cover img-brand-grade" />
              </span>
            ) : null}
            <span className="lx-cell-label">
            <span>
              {cell.context ? <span className="sr-only">{cell.context} </span> : null}
              {cell.label}
            </span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Group({ label, action, children }: { label: string; action?: { href: string; label: string; context?: string }; children: React.ReactNode }) {
  return (
    <div className="lx-explore-group">
      <div className="lx-explore-head">
        <h3 className="lx-explore-label">{label}</h3>
        {action ? (
          <Link href={action.href} className="lx-explore-all">
            {action.context ? <span className="sr-only">{action.context} </span> : null}
            {action.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );
}

const MAX_READING = 6;

/** Rows stay full: three or six fill three columns, two or four fill two. A fifth link is held back. */
function balanced<T>(links: T[]): T[] {
  if (links.length === 5) return links.slice(0, 4);
  return links;
}

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
  return balanced(out);
}

function Reading({ links }: { links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;
  return (
    <Group label="Guides and planning">
      <ul className="lx-reading" style={{ ['--lx-reading-cols' as string]: links.length % 3 === 0 ? 3 : 2 }}>
        {links.map((link) => {
          const image = pageImage(link.href);
          return (
            <li key={link.href}>
              <Link href={link.href} className="lx-reading-link">
                {image ? (
                  <span className="lx-reading-photo">
                    <Image src={image} alt={pageImageAlt(link.href, image)} fill sizes="72px" className="object-cover img-brand-grade" />
                  </span>
                ) : null}
                <span className="lx-reading-title">{link.label}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Group>
  );
}

export function RelatedLinks({ serviceSlug, citySlug, variant, manifestPath, exclude = [], usedImages = [] }: RelatedLinksProps) {
  const taken = new Set<string>(exclude);
  const service = SERVICES.find((s) => s.slug === serviceSlug);
  const city = CITIES.find((c) => c.slug === citySlug);
  const groups: React.ReactNode[] = [];

  const pageImages: (string | undefined)[] = [...usedImages];
  /** Give each card its photograph, never one already on the page or in an earlier card. */
  const withImages = (cells: Cell[]): Cell[] => {
    const images = resolveExploreImages(cells.map((cell) => ({ href: cell.href, image: cell.image ?? pageImage(cell.href), subject: cell.subject })), pageImages);
    pageImages.push(...images);
    return cells.map((cell, i) => ({ ...cell, image: images[i] }));
  };

  if (variant === 'area' && citySlug && city) {
    const cells: Cell[] = SERVICES.map((s) => ({
      href: indexedCityServiceHref(s.slug, citySlug),
      label: toSentenceCase(s.name),
      context: `${city.name}:`,
      subject: s.slug,
    }));
    cells.forEach((cell) => taken.add(cell.href));
    groups.push(<Group key="services" label={`Remodeling services in ${city.name}`}><Cells cells={withImages(cells)} /></Group>);

    // Other cities' area pages this page links to (data/internal-links.json), as cards with each area's own photograph.
    const nearby: Cell[] = (manifestPath ? getManifestLinks(manifestPath) : [])
      .filter((link) => /^\/areas\/[^/]+$/.test(link.url) && !taken.has(link.url))
      .map((link) => {
        const slug = link.url.split('/')[2];
        const name = CITIES.find((c) => c.slug === slug)?.name ?? link.anchor;
        return { href: link.url, label: name, context: 'Remodeling in', image: CITY_HERO_IMAGES[slug] };
      });
    if (nearby.length > 0) {
      nearby.forEach((cell) => taken.add(cell.href));
      taken.add('/areas');
      groups.push(<Group key="areas" label="Nearby areas" action={{ href: '/areas', label: 'All service areas' }}><Cells cells={withImages(nearby)} /></Group>);
    }
  }

  if (variant === 'city-service' && serviceSlug && citySlug && service && city) {
    // Same index rule as the sitemap: noindexed combos are never linked.
    const cityCells: Cell[] = SERVICE_AREA_CITIES.filter(
      (c) => c.slug !== citySlug && isIndexedPath(cityServicePath(serviceSlug, c.slug)),
    ).map((c) => ({ href: cityServicePath(serviceSlug, c.slug), label: c.name, context: `${service.name} in`, subject: serviceSlug }));
    const serviceCells: Cell[] = SERVICES.filter(
      (s) => s.slug !== serviceSlug && isIndexedPath(cityServicePath(s.slug, citySlug)),
    ).slice(0, 3).map((s) => ({ href: cityServicePath(s.slug, citySlug), label: toSentenceCase(s.name), context: `${city.name}:`, subject: s.slug }));
    [...cityCells, ...serviceCells].forEach((cell) => taken.add(cell.href));
    taken.add(servicePath(serviceSlug));
    taken.add(areaPath(citySlug));
    groups.push(<Group key="cities" label={`${toSentenceCase(service.name)} in nearby cities`} action={{ href: servicePath(serviceSlug), label: 'All areas', context: `${service.name}:` }}><Cells cells={withImages(cityCells)} /></Group>);
    groups.push(<Group key="services" label={`More services in ${city.name}`} action={{ href: areaPath(citySlug), label: `All ${city.name} remodeling` }}><Cells cells={withImages(serviceCells)} /></Group>);
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
