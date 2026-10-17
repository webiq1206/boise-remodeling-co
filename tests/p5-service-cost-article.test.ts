import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES } from '../shared/contentData';
import {
  SERVICE_SEO_CONTENT,
  cityServiceCostQuestion,
  getCityServiceFaqs,
  indefiniteArticle,
} from '../shared/seoContent';
import { SITE_CONFIG } from '../shared/siteConfig';
import { BUSINESS_INFO } from '../lib/seo';
import { buildBusinessVCard } from '../lib/vcard';

const boise = CITIES.find((city) => city.slug === 'boise');
if (!boise) throw new Error('Boise is missing from CITIES');

test('cost questions take a or an from the service name', () => {
  assert.equal(
    cityServiceCostQuestion(SERVICE_SEO_CONTENT.adu, boise),
    'How much does an ADU / guest house cost in Boise?',
  );
  assert.equal(
    cityServiceCostQuestion(SERVICE_SEO_CONTENT['aging-in-place'], boise),
    'How much does an aging-in-place remodeling cost in Boise?',
  );
  assert.equal(
    cityServiceCostQuestion(SERVICE_SEO_CONTENT['kitchen-remodel'], boise),
    'How much does a kitchen remodel cost in Boise?',
  );
});

test('article follows sound after the acronym check', () => {
  assert.equal(`${indefiniteArticle('unit')} unit`, 'a unit');
  assert.equal(`${indefiniteArticle('one-story')} one-story`, 'a one-story');
  assert.equal(`${indefiniteArticle('universal')} universal`, 'a universal');
  assert.equal(`${indefiniteArticle('USB')} USB`, 'a USB');
  assert.equal(`${indefiniteArticle('hour')} hour`, 'an hour');
  assert.equal(`${indefiniteArticle('HVAC')} HVAC`, 'an HVAC');
  assert.equal(`${indefiniteArticle('ADU')} ADU`, 'an ADU');
  assert.equal(`${indefiniteArticle('aging-in-place')} aging-in-place`, 'an aging-in-place');
});

test('city pages render the cost question for ADU, aging-in-place, and a consonant service', () => {
  const adu = getCityServiceFaqs(SERVICE_SEO_CONTENT.adu, boise)[0]?.question;
  const aging = getCityServiceFaqs(SERVICE_SEO_CONTENT['aging-in-place'], boise)[0]?.question;
  const kitchen = getCityServiceFaqs(SERVICE_SEO_CONTENT['kitchen-remodel'], boise)[0]?.question;
  assert.equal(adu, 'How much does an ADU / guest house cost in Boise?');
  assert.equal(aging, 'How much does an aging-in-place remodeling cost in Boise?');
  assert.equal(kitchen, 'How much does a kitchen remodel cost in Boise?');
});

test('contact card uses the site NAP street address', () => {
  const { street, city, state, postalCode } = SITE_CONFIG.address;
  assert.equal(street, '4031 W Wapoot St');
  const card = buildBusinessVCard();
  assert.match(
    card,
    new RegExp(
      `ADR;TYPE=WORK:;;${street};${city};${state};${postalCode};${BUSINESS_INFO.address.country}`,
    ),
  );
});
