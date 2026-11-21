import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AreaPage from '../app/areas/[city]/page.tsx';
import { RelatedLinks } from '../components/seo/RelatedLinks.tsx';
import { isCityServiceNoindex } from '../lib/page-metadata.ts';
import { CITIES, SERVICES } from '../shared/contentData.ts';
import { redirectDestination } from '../shared/cityServiceIndex.mjs';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1].split('#')[0].split('?')[0]);

function serviceSlug(href: string): string | undefined {
  const match = href.match(/^\/services\/([^/]+)/);
  return match?.[1];
}

test('area pages and related links avoid self, 301, and noindex URLs', async () => {
  const mainServices = SERVICES.map((service) => service.slug);
  for (const city of CITIES) {
    const pagePath = `/areas/${city.slug}`;
    const html = renderToStaticMarkup(await AreaPage({ params: Promise.resolve({ city: city.slug }) }));
    const related = renderToStaticMarkup(React.createElement(RelatedLinks, {
      variant: 'area',
      citySlug: city.slug,
      manifestPath: pagePath,
    }));
    const links = [...hrefs(html), ...hrefs(related)];
    for (const href of links) {
      assert.notEqual(href, pagePath, `${city.slug} links to itself via ${href}`);
      assert.equal(redirectDestination(href), null, `${city.slug} links to 301 ${href}`);
      const cityService = href.match(/^\/services\/([^/]+)\/([^/]+)$/);
      if (cityService) {
        assert.equal(isCityServiceNoindex(cityService[1], cityService[2]), false, href);
      }
    }
    const found = new Set(links.map(serviceSlug).filter((slug): slug is string => Boolean(slug)));
    const expected = city.slug === 'garden-city' ? mainServices.filter((slug) => slug !== 'adu') : mainServices;
    assert.deepEqual([...found].filter((slug) => expected.includes(slug)).sort(), [...expected].sort(), city.slug);
  }
});

test('related link blocks do not point at a 301 source or a noindexed city page', () => {
  const blocks: React.ReactElement[] = [];
  for (const city of CITIES) {
    blocks.push(React.createElement(RelatedLinks, { variant: 'area', citySlug: city.slug, manifestPath: `/areas/${city.slug}` }));
    for (const service of SERVICES) {
      if (city.slug === 'garden-city') continue;
      blocks.push(React.createElement(RelatedLinks, {
        variant: 'city-service',
        serviceSlug: service.slug,
        citySlug: city.slug,
        manifestPath: `/services/${service.slug}/${city.slug}`,
      }));
    }
  }
  for (const block of blocks) {
    for (const href of hrefs(renderToStaticMarkup(block))) {
      assert.equal(redirectDestination(href), null, href);
      const cityService = href.match(/^\/services\/([^/]+)\/([^/]+)$/);
      if (cityService) assert.equal(isCityServiceNoindex(cityService[1], cityService[2]), false, href);
    }
  }
});
