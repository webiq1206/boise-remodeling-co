import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AreaPage from '../app/areas/[city]/page.tsx';
import { landingFAQSchema } from '../lib/landing-schema.ts';
import { buildPageMetadata } from '../lib/page-metadata.ts';
import { withBrandPageMetadata } from '../lib/brand-page-metadata.ts';
import { getAllSiteUrls, getXmlSiteUrls, serviceHubCityHref } from '../lib/siteUrls.ts';
import { GARDEN_CITY_DESCRIPTION, GARDEN_CITY_FAQS, GARDEN_CITY_H1, GARDEN_CITY_TITLE } from '../shared/content/gardenCityArea.ts';
import { urlsForDeploy } from '../scripts/write-indexnow-deploy.mjs';
import { shouldSubmitIndexNow, indexNowLogLine } from '../scripts/indexnow-deploy.mjs';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('Garden City metadata, H1 and FAQ text match the page schema', async () => {
  const meta = withBrandPageMetadata(buildPageMetadata({
    kind: 'area',
    cityName: 'Garden City',
    citySlug: 'garden-city',
    path: '/areas/garden-city',
  }), '/areas/[city]');
  const titleValue = meta.title;
  const rendered = typeof titleValue === 'string'
    ? `${titleValue} | Boise Remodeling Co`
    : (titleValue as { absolute?: string }).absolute;
  assert.equal(rendered, `${GARDEN_CITY_TITLE} | Boise Remodeling Co`);
  assert.equal(rendered?.length, 56);
  assert.equal(meta.description, GARDEN_CITY_DESCRIPTION);
  assert.equal(GARDEN_CITY_DESCRIPTION.length, 152);

  const html = renderToStaticMarkup(await AreaPage({ params: Promise.resolve({ city: 'garden-city' }) }));
  assert.match(html, new RegExp(`<h1[^>]*>${GARDEN_CITY_H1}</h1>`));
  const anchors = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(html.includes('workmanship'), false);
  assert.deepEqual(anchors.filter((href) => /adu|guest/i.test(href)), []);
  const guestAt = html.toLowerCase().indexOf('guest');
  assert.equal(guestAt, -1, html.slice(Math.max(0, guestAt - 100), guestAt + 160));
  assert.match(html, /Ada County · Treasure Valley/);
  assert.match(html, /Free in-home visit/);
  assert.match(html, /with planning guidance and no obligation/);
  assert.equal(html.includes('60 to 90 minutes'), false);
  assert.match(html, /For valley-wide context, see the/);
  assert.match(html, /href="\/resources\/ada-canyon-permit-flow"/);
  assert.equal(html.includes('gardencityidaho.org/departments'), false);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /Ready to start your Garden City remodel\?/);
  assert.match(html, /request a free in-home visit/);
  assert.match(html, /see a preliminary planning range/);
  assert.match(html, /href="tel:\+12084771169"/);
  assert.match(html, /href="sms:\+12084771169"/);
  assert.match(html, />Request a visit</);
  assert.match(html, /start from the <a href="\/contact">contact page<\/a>/);
  assert.match(html, /href="\/areas\/boise"/);
  assert.match(html, /href="\/areas\/meridian"/);
  assert.match(html, /href="\/areas\/eagle"/);
  for (const faq of GARDEN_CITY_FAQS) {
    assert.equal(html.includes(faq.question), true, faq.question);
    assert.equal(html.includes(faq.answer), true, faq.answer);
  }
  const schema = landingFAQSchema(GARDEN_CITY_FAQS);
  const entities = schema.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
  assert.deepEqual(
    entities.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text })),
    GARDEN_CITY_FAQS,
  );
  assert.equal(html.includes('4031'), false);
});

test('Garden City is in both sitemaps and service hubs link only the area page', () => {
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/areas/garden-city'), true);
  assert.equal(getXmlSiteUrls().some((entry) => entry.path === '/areas/garden-city'), true);
  assert.equal(getXmlSiteUrls().some((entry) => entry.path === '/instant-estimate'), false);
  assert.equal(getXmlSiteUrls().some((entry) => entry.path === '/sitemap'), false);
  assert.equal(getAllSiteUrls().some((entry) => entry.path === '/instant-estimate'), true);
  for (const service of ['kitchen-remodel', 'bathroom-remodel', 'room-addition', 'adu']) {
    assert.equal(getAllSiteUrls().some((entry) => entry.path === `/services/${service}/garden-city`), false);
    if (service === 'adu') continue;
    assert.equal(serviceHubCityHref(service, 'garden-city'), '/areas/garden-city');
  }
});

test('IndexNow lists Garden City and does not fire from CI', () => {
  assert.equal(urlsForDeploy([]).includes('/areas/garden-city'), true);
  assert.equal(shouldSubmitIndexNow({ CI: 'true', REPLIT_DEPLOYMENT: '1' }), false);
  assert.equal(shouldSubmitIndexNow({ GITHUB_EVENT_NAME: 'pull_request', REPLIT_DEPLOYMENT: '1' }), false);
  assert.equal(shouldSubmitIndexNow({ REPLIT_DEPLOYMENT: '1' }), true);
  assert.equal(indexNowLogLine('abc', 2, 202), '[IndexNow] sha=abc submitted=2 status=202');
});
