import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES } from '../shared/contentData';
import { SERVICE_SEO_CONTENT, getCityServiceFaqs } from '../shared/seoContent';

const DEER_FLAT_STATION =
  'the Deer Flat Dam station by Lake Lowell, southwest of Caldwell';

const caldwell = CITIES.find((city) => city.slug === 'caldwell');
if (!caldwell) throw new Error('Caldwell is missing from CITIES');

test('Caldwell outdoor living FAQ places the Deer Flat Dam station southwest of town', () => {
  const faqs = getCityServiceFaqs(SERVICE_SEO_CONTENT['outdoor-living'], caldwell);
  const climate = faqs.find(
    (faq) => faq.question === "What is Caldwell's climate like for outdoor living?",
  );
  assert.ok(climate, 'Caldwell climate FAQ is missing');
  assert.ok(
    climate.answer.includes(DEER_FLAT_STATION),
    `expected the Deer Flat Dam station phrase, got: ${climate.answer}`,
  );
});
