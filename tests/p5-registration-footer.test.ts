import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '../components/Footer.tsx';
import { RegistrationLine, REGISTRATION_LINE, DOPL_LICENSE_SEARCH, registrationPresentation } from '../components/RegistrationLine.tsx';
import { generateLocalBusinessSchema, generateOrganizationSchema } from '../lib/schema.ts';
import { AREA_CITY_COPY } from '../shared/content/areaCopy.ts';
import { getAllSiteUrls } from '../lib/siteUrls.ts';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('every sitemap page shows the registration line, plain text on the estimate funnel', () => {
  const paths = getAllSiteUrls().map((entry) => entry.path);
  assert.ok(paths.includes('/'));
  assert.ok(paths.includes('/areas/boise'));
  assert.ok(paths.includes('/estimate'));
  for (const path of paths) {
    const mode = registrationPresentation(path);
    // BOT-05 omits contractor #8381215 on the bathroom service page only.
    if (path === '/services/bathroom-remodel') {
      assert.equal(mode, 'hidden', path);
      continue;
    }
    assert.notEqual(mode, 'hidden', path);
    // Nested estimator app routes keep plain text; short-form /estimate is marketing chrome.
    if (path.startsWith('/estimate/')) {
      assert.equal(mode, 'plain', path);
    }
  }
  assert.equal(registrationPresentation('/services/bathroom-remodel'), 'hidden');
  assert.equal(registrationPresentation('/services/bathroom-remodel/'), 'hidden');
  assert.equal(registrationPresentation('/services/bathroom-remodel/boise'), 'link');
  assert.equal(registrationPresentation('/'), 'link');
  assert.equal(registrationPresentation('/areas/boise'), 'link');
  assert.equal(registrationPresentation('/estimate'), 'link');
  assert.equal(registrationPresentation('/estimate/scope'), 'plain');
  assert.equal(registrationPresentation('/estimate/p5-preview'), 'plain');
});

test('the footer links the registration line and the funnel prints it as plain text', () => {
  const linked = renderToStaticMarkup(React.createElement(Footer));
  assert.match(linked, /Idaho Registered Contractor #8381215/);
  assert.match(linked, new RegExp(DOPL_LICENSE_SEARCH.replace(/[?]/g, '\\?')));
  assert.match(linked, /target="_blank"/);
  assert.match(linked, /rel="noopener noreferrer"/);
  assert.match(linked, /title="Look up registration 8381215 on Idaho DOPL"/);
  assert.match(linked, /aria-label="Verify with Idaho DOPL: look up registration 8381215, opens in a new tab"/);
  assert.equal(linked.includes('License details available upon request'), false);
  assert.equal(/8381215\s*\(/.test(linked), false);
  assert.equal(linked.includes('Easy Home'), false);

  const hiddenFooter = renderToStaticMarkup(React.createElement(Footer, { hideRegistration: true }));
  assert.equal(hiddenFooter.includes('8381215'), false);
  assert.equal(hiddenFooter.includes('Idaho Registered Contractor'), false);

  const plain = renderToStaticMarkup(React.createElement(RegistrationLine, { plain: true }));
  assert.equal(plain.includes(REGISTRATION_LINE), true);
  assert.equal(plain.includes('<a'), false);
  assert.equal(plain.includes('edopl.idaho.gov'), false);

  const source = readFileSync('components/RegistrationLine.tsx', 'utf8');
  assert.equal(source.includes('process.env'), false);
  assert.equal(source.includes(REGISTRATION_LINE), true);
});

test('home organization JSON-LD uses the bonded registration sentence', () => {
  const org = generateOrganizationSchema();
  const description = String(org.description);
  assert.match(description, /Idaho Registered Contractor #8381215, bonded, and insured, and committed to excellence\./);
  assert.equal(/licensed/i.test(description), false);
});

test('the Meridian area FAQ states the registration without a license claim', () => {
  const faq = AREA_CITY_COPY.meridian.faqs.find((item) => item.question === 'Are you a registered contractor and insured?');
  assert.ok(faq);
  assert.equal(faq.answer, "Yes. We're an Idaho Registered Contractor #8381215, bonded, and insured.");
  assert.equal(/licensed/i.test(faq.answer), false);
});

test('local business schema carries hasCredential identifier 8381215', () => {
  for (const city of [undefined, 'Boise', 'Eagle'] as const) {
    const business = generateLocalBusinessSchema(city);
    const credential = business.hasCredential as {
      '@type'?: string;
      credentialCategory?: string;
      identifier?: string;
      recognizedBy?: { '@type'?: string; name?: string; url?: string };
    };
    assert.equal(credential['@type'], 'EducationalOccupationalCredential');
    assert.equal(credential.credentialCategory, 'registration');
    assert.equal(credential.identifier, '8381215');
    assert.deepEqual(credential.recognizedBy, {
      '@type': 'GovernmentOrganization',
      name: 'Idaho Division of Occupational and Professional Licenses',
      url: 'https://dopl.idaho.gov/con/',
    });
    assert.equal(JSON.stringify(business).includes('8381215'), true);
  }
});

test('brand FAQs and public copy use the registration wording', () => {
  const files = [
    'shared/content/areaCopy.ts',
    'shared/seoContent.ts',
    'shared/gbpProfile.ts',
    'shared/siteContent.ts',
    'app/about/page.tsx',
    'lib/page-metadata.ts',
    'lib/schema.ts',
    'lib/seo.ts',
    'public/llms.txt',
    'public/llms-full.txt',
  ];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.includes('Are you licensed'), false, file);
    assert.equal(/license details available upon request/i.test(source), false, file);
    assert.equal(source.includes('Idaho Registered Contractor #8381215'), true, file);
  }
  const generic = readFileSync('shared/estimate/re10Disclosure.ts', 'utf8');
  assert.match(generic, /licensed electrician/);
  assert.match(generic, /licensed specialist/);
});
