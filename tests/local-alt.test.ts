import assert from 'node:assert/strict';
import test from 'node:test';
import { getBlogImageAlt } from '../shared/blogImages.ts';
import { BLOG_IMAGE_REGISTRY } from '../shared/blogImageRegistry.ts';
import { contentImageAlt } from '../shared/contentImageAlt.ts';
import { CITIES, SERVICES } from '../shared/contentData.ts';
import { CITY_SERVICE_IMAGES } from '../shared/cityServiceImages.ts';
import { localAlt } from '../shared/localAlt.ts';

// Owner, 19 November 2026: every image names the work and the place, with no
// qualifier such as "idea", "concept" or "representative" in the description.
const QUALIFIER = /\b(idea|ideas|concept|representative|inspiration|rendering|render)\b/i;

test('a local alt names the work, the city and Idaho, then the picture', () => {
  assert.equal(
    localAlt('White kitchen with an oak island', { subject: 'kitchen remodel', city: 'Meridian' }),
    'Kitchen remodel in Meridian, Idaho: white kitchen with an oak island',
  );
  assert.equal(localAlt('Remodel plans on a kitchen island'), 'Home remodeling in Boise, Idaho: remodel plans on a kitchen island');
  // Already local: left exactly as written.
  assert.equal(localAlt('Nick Perkins in Meridian, Idaho'), 'Nick Perkins in Meridian, Idaho');
});

test('every city page photograph has a local alt for its own service and city', () => {
  for (const [key, src] of Object.entries(CITY_SERVICE_IMAGES)) {
    const [serviceSlug, citySlug] = key.split('/');
    const city = CITIES.find((c) => c.slug === citySlug);
    assert.ok(city && SERVICES.some((s) => s.slug === serviceSlug), key);
    const alt = contentImageAlt(src);
    assert.match(alt, new RegExp(`in ${city.name}, Idaho: `), `${key}: ${alt}`);
    assert.ok(!QUALIFIER.test(alt.split(': ')[0]), `${key}: ${alt}`);
  }
});

test('every blog and guide photograph has a local alt', () => {
  for (const slug of Object.keys(BLOG_IMAGE_REGISTRY)) {
    const alt = getBlogImageAlt(slug);
    assert.match(alt, /, Idaho/, `${slug}: ${alt}`);
    assert.ok(alt.length >= 40, `${slug}: ${alt}`);
  }
});
