import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutPage from '../app/about/page.tsx';
import { Footer } from '../components/Footer.tsx';
import {
  DOPL_LICENSE_SEARCH,
  REGISTRATION_LINE,
  RegistrationLink,
  RegistrationText,
} from '../components/RegistrationLink.tsx';
import { generateLocalBusinessSchema, generateOrganizationSchema } from '../lib/schema.ts';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const SEARCH = 'https://edopl.idaho.gov/OnlineServices/?link=PubSearch';

function registrationAnchors(html: string): string[] {
  return html.match(/<a\b[^>]*>Idaho Registered Contractor #8381215<\/a>/g) ?? [];
}

test('the visible registration line is the DOPL public search link', () => {
  assert.equal(DOPL_LICENSE_SEARCH, SEARCH);
  assert.equal(REGISTRATION_LINE, 'Idaho Registered Contractor #8381215');
  const link = renderToStaticMarkup(React.createElement(RegistrationLink));
  assert.match(link, new RegExp(`href="${SEARCH.replace(/[?]/g, '\\?')}"`));
  assert.match(link, /rel="noopener"/);
  assert.equal(link.includes('noreferrer'), false);
  assert.equal(link.includes('('), false);
  assert.equal(link.includes('Verify with Idaho DOPL'), false);

  const sentence = renderToStaticMarkup(
    React.createElement(RegistrationText, {
      text: 'Yes. We are an Idaho Registered Contractor #8381215, bonded, and insured.',
    }),
  );
  assert.equal(registrationAnchors(sentence).length, 1);
  assert.match(sentence, /Yes\. We are an /);
  assert.match(sentence, /, bonded, and insured\./);
  assert.equal(/8381215\s*\(/.test(sentence), false);
});

test('footer and about render the registration line as that link', () => {
  const footer = renderToStaticMarkup(React.createElement(Footer));
  const about = renderToStaticMarkup(React.createElement(AboutPage));
  for (const [label, html] of [['footer', footer], ['about', about]] as const) {
    const anchors = registrationAnchors(html);
    assert.equal(anchors.length, 1, label);
    assert.match(anchors[0], label === 'footer' ? /rel="noopener noreferrer"/ : /rel="noopener"/);
    if (label === 'footer') assert.match(anchors[0], /opens in a new tab/);
    assert.equal(html.replace(/<[^>]*>/g, '').includes('Verify with Idaho DOPL'), false, label);
    assert.equal(/8381215\s*\(/.test(html), false, label);
  }
});

test('a visible FAQ answer links the phrase and JSON-LD stays plain text', () => {
  for (const file of [
    'components/marketing/ArticleFaqs.tsx',
    'components/seo/LandingPageTemplate.tsx',
    'components/re10/Re10Faqs.tsx',
    'app/contact/page.tsx',
  ]) {
    const source = readFileSync(file, 'utf8');
    assert.match(source, /<RegistrationText text=\{faq\.answer\} \/>/, file);
  }

  const business = generateLocalBusinessSchema('Boise');
  const credential = business.hasCredential as { identifier?: string };
  assert.equal(credential.identifier, '8381215');
  const org = generateOrganizationSchema();
  const description = String(org.description);
  assert.match(description, /Idaho Registered Contractor #8381215/);
  assert.equal(description.includes('<a'), false);
  assert.equal(description.includes(SEARCH), false);
  assert.equal(JSON.stringify(business).includes('<a'), false);
});
