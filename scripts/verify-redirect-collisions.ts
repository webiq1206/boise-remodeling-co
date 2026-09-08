/**
 * A redirect source must not be a page we actually serve, and nothing we
 * control may link to one.
 *
 * Next.js evaluates redirects() BEFORE filesystem routes. A redirect whose
 * source matches a real route therefore wins, and the page becomes unreachable
 * without anything failing: the build still renders it, the sitemap still
 * advertises it, and the only symptom is visitors landing somewhere else.
 *
 * That is exactly what happened to /estimate. It was a real page with its own
 * metadata, its own canonical, and sitemap priority 0.9, listed in the legacy
 * alias table as '/estimate' -> '/#calculator'. The footer CTA, the contact
 * page and the RE-10 page all pointed at it, and all three bounced to the
 * homepage anchor. The page was never even rewritten for new construction,
 * because nobody could reach it to notice.
 *
 * Three checks:
 *   1. COLLISION  - a redirect source that is also a real route.
 *   2. SITEMAP    - a sitemap entry that redirects (we submit it to Google and
 *                   Google gets a 301).
 *   3. HREF       - a hardcoded internal href that targets a redirect source,
 *                   costing a hop on a link we could have written correctly.
 *
 * Run: npm run verify:redirect-collisions
 */
import fs from 'fs';
import path from 'path';
import { buildCanonicalRoutes } from './internal-links/lib';

const root = path.join(__dirname, '..');

/* ── The redirect sources, read from next.config.js ──────────────────────── */

// next.config.js is CommonJS and its redirects() is async, so it is simply
// required and invoked rather than re-parsed.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const nextConfig = require(path.join(root, 'next.config.js'));

interface RedirectRule {
  source: string;
  destination: string;
  permanent?: boolean;
}

async function loadRedirects(): Promise<RedirectRule[]> {
  if (typeof nextConfig.redirects !== 'function') return [];
  return (await nextConfig.redirects()) as RedirectRule[];
}

/* ── The routes that actually exist ──────────────────────────────────────── */

/**
 * Static routes are discovered from the app directory rather than listed, so a
 * new page is covered the day it is added. Dynamic segments and route groups
 * are skipped: they cannot collide with a literal redirect source.
 */
function discoverAppRoutes(): string[] {
  const appDir = path.join(root, 'app');
  const routes: string[] = [];

  function walk(dir: string, urlPath: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      // Dynamic segments, private folders, and API routes are not pages a
      // redirect source would shadow in a way this check can reason about.
      if (name.startsWith('[') || name.startsWith('_') || name === 'api') continue;
      const child = path.join(dir, name);
      // Route groups like (marketing) do not appear in the URL.
      const childUrl = name.startsWith('(') ? urlPath : `${urlPath}/${name}`;
      if (fs.existsSync(path.join(child, 'page.tsx')) || fs.existsSync(path.join(child, 'page.ts'))) {
        routes.push(childUrl);
      }
      walk(child, childUrl);
    }
  }

  if (fs.existsSync(path.join(appDir, 'page.tsx'))) routes.push('/');
  walk(appDir, '');
  return routes;
}

/* ── Hardcoded internal hrefs in source ──────────────────────────────────── */

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      collectSourceFiles(full, acc);
    } else if (/\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const HREF_RE = /href=["'](\/[^"'{}]*)["']/g;

async function main() {
  const redirects = await loadRedirects();
  const appRoutes = new Set(discoverAppRoutes());
  const canonical = new Set(buildCanonicalRoutes());

  // Literal sources only. Parameterised sources like /services/:slug/:city
  // cannot be compared against a literal route without pattern matching, and
  // they are generated from the slug maps rather than hand-written.
  const literalSources = new Set(
    redirects
      .map((rule) => rule.source)
      .filter((s) => !s.includes(':') && !s.includes('*'))
      .map((s) => (s.endsWith('/') && s !== '/' ? s.slice(0, -1) : s)),
  );

  const failures: string[] = [];

  /* 1. COLLISION */
  for (const source of literalSources) {
    if (appRoutes.has(source) || canonical.has(source)) {
      failures.push(
        `COLLISION  ${source} is both a redirect source and a real page. ` +
          `redirects() runs first, so the page is unreachable.`,
      );
    }
  }

  /* 2. SITEMAP */
  const sitemapSrc = fs.readFileSync(path.join(root, 'app', 'sitemap.ts'), 'utf8');
  for (const match of sitemapSrc.matchAll(/\$\{baseUrl\}(\/[a-z0-9/-]*)/g)) {
    const urlPath = match[1].replace(/\/$/, '') || '/';
    if (literalSources.has(urlPath)) {
      failures.push(
        `SITEMAP    ${urlPath} is listed in the sitemap but is a redirect source. ` +
          `Google is being handed a URL that 301s.`,
      );
    }
  }

  /* 3. HREF */
  const files = [
    ...collectSourceFiles(path.join(root, 'app')),
    ...collectSourceFiles(path.join(root, 'components')),
    ...collectSourceFiles(path.join(root, 'shared')),
    ...collectSourceFiles(path.join(root, 'lib')),
  ];

  const badHrefs = new Map<string, string[]>();
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(HREF_RE)) {
      const raw = match[1];
      const urlPath = raw.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
      if (!literalSources.has(urlPath)) continue;
      const rel = path.relative(root, file).replace(/\\/g, '/');
      if (!badHrefs.has(raw)) badHrefs.set(raw, []);
      badHrefs.get(raw)!.push(rel);
    }
  }
  for (const [href, where] of badHrefs) {
    const dest = redirects.find((rd) => rd.source === href.split('#')[0])?.destination;
    failures.push(
      `HREF       ${href} redirects${dest ? ` to ${dest}` : ''}; link the destination directly. ` +
        `Used in: ${[...new Set(where)].join(', ')}`,
    );
  }

  if (failures.length > 0) {
    console.error(`verify:redirect-collisions FAILED - ${failures.length} issue(s):`);
    for (const f of failures) console.error(`  x ${f}`);
    process.exit(1);
  }

  console.log(
    `verify:redirect-collisions OK (${literalSources.size} literal redirect sources, ` +
      `${appRoutes.size} app routes, ${files.length} source files scanned)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
