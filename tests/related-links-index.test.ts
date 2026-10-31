import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RelatedLinks } from '../components/seo/RelatedLinks.tsx';
import { getManifestLinks } from '../lib/internal-links.ts';
import { getAllSiteUrls, isIndexedPath } from '../lib/siteUrls.ts';
import { CITIES, SERVICES } from '../shared/contentData.ts';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

test('the noindexed ADU combos are outside the sitemap index rule', () => {
  for (const city of ['kuna', 'star', 'middleton', 'caldwell']) assert.equal(isIndexedPath(`/services/adu/${city}`), false);
  assert.equal(isIndexedPath('/services/adu/boise'), true);
  assert.equal(isIndexedPath('/services/adu'), true);
});

test('related and nearby blocks never link a page the sitemap leaves out', () => {
  const blocks: React.ReactElement[] = [];
  for (const city of CITIES) {
    blocks.push(React.createElement(RelatedLinks, { variant: 'area', citySlug: city.slug }));
    for (const service of SERVICES) {
      blocks.push(React.createElement(RelatedLinks, { variant: 'city-service', serviceSlug: service.slug, citySlug: city.slug }));
    }
  }
  for (const service of SERVICES) blocks.push(React.createElement(RelatedLinks, { variant: 'service', serviceSlug: service.slug }));
  for (const block of blocks) {
    for (const href of hrefs(renderToStaticMarkup(block))) assert.ok(isIndexedPath(href), `links noindexed ${href}`);
  }
  // Area pages keep all eight service cards: a noindexed combo points at the service page instead.
  const kuna = hrefs(renderToStaticMarkup(React.createElement(RelatedLinks, { variant: 'area', citySlug: 'kuna' })));
  assert.ok(kuna.includes('/services/adu'));
});

test('manifest related links skip noindexed pages on every page', () => {
  for (const { path } of getAllSiteUrls()) {
    for (const link of getManifestLinks(path)) assert.ok(isIndexedPath(link.url), `${path} -> ${link.url}`);
  }
});
