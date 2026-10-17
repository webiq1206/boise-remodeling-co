import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GET } from '../app/api/testimonials/route.ts';
import { TestimonialsSection } from '../components/sections/TestimonialsSection.tsx';
import { generateLocalBusinessSchema, generateReviewSchema } from '../lib/schema.ts';
import { BUSINESS_INFO } from '../lib/seo.ts';
import { getSiteUrlGroups } from '../lib/siteUrls.ts';
import {
  getTestimonialsFor,
  SHOW_TESTIMONIALS,
  testimonialsForPublish,
} from '../shared/testimonialsData.ts';

const SEED_NAMES = ['Sarah M.', 'Mike R.', 'Jennifer K.', 'David L.'];
const BANNED = [
  'Homeowner reviews',
  'Project gallery',
  'Projects & Reviews',
  'what our customers say',
  'Read all reviews',
  ...SEED_NAMES,
];

function text(url: string): string {
  return readFileSync(new URL(url, import.meta.url), 'utf8');
}

test('SHOW_TESTIMONIALS is off and drops seed quotes', () => {
  assert.equal(SHOW_TESTIMONIALS, false);
  const hidden = testimonialsForPublish([
    { name: 'Sarah M.', rating: 5, quote: 'Always on time' },
    { name: 'Mike R.', rating: 5, quote: 'beautiful patio' },
    { name: 'Jennifer K.', rating: 5, quote: 'Christmas light' },
    { name: 'David L.', rating: 5, quote: 'Reliable, affordable' },
  ]);
  assert.deepEqual(hidden, []);
  assert.deepEqual(getTestimonialsFor('lawn-care', 'kuna'), []);
});

test('the public testimonials API returns no seed rows while the flag is off', async () => {
  const response = await GET();
  const body = await response.json();
  assert.deepEqual(body, []);
  const serialized = JSON.stringify(body);
  for (const name of SEED_NAMES) assert.equal(serialized.includes(name), false, name);
});

test('AggregateRating and Review schema stay out while the flag is off', () => {
  const saved = { rating: BUSINESS_INFO.rating, reviewCount: BUSINESS_INFO.reviewCount };
  BUSINESS_INFO.rating = 5;
  BUSINESS_INFO.reviewCount = 4;
  try {
    const business = JSON.stringify(generateLocalBusinessSchema());
    assert.equal(business.includes('AggregateRating'), false);
    assert.equal(business.includes('reviewCount'), false);
    const review = JSON.stringify(generateReviewSchema([
      { author: 'Sarah M.', rating: 5, text: 'Lawn Care Kuna has been taking care of our yard.' },
      { author: 'Mike R.', rating: 5, text: 'They installed a beautiful patio.' },
      { author: 'Jennifer K.', rating: 5, text: 'Best Christmas light installation.' },
      { author: 'David L.', rating: 5, text: 'Reliable, affordable, and great results.' },
    ]));
    assert.equal(review.includes('AggregateRating'), false);
    assert.equal(review.includes('"Review"'), false);
    for (const name of SEED_NAMES) assert.equal(review.includes(name), false, name);
  } finally {
    BUSINESS_INFO.rating = saved.rating;
    BUSINESS_INFO.reviewCount = saved.reviewCount;
  }
});

test('review blocks, nav, footer, and the testimonials page do not render seed claims', () => {
  const section = renderToStaticMarkup(React.createElement(TestimonialsSection));
  assert.equal(section, '');

  const surfaces = [
    section,
    text('../components/Navigation.tsx'),
    text('../components/Footer.tsx'),
    text('../components/sections/TestimonialsSection.tsx'),
    text('../app/testimonials/page.tsx'),
    text('../public/llms.txt'),
    text('../public/llms-full.txt'),
  ].join('\n');
  for (const phrase of BANNED) assert.equal(surfaces.includes(phrase), false, phrase);

  const page = text('../app/testimonials/page.tsx');
  assert.match(page, /Representative imagery, not completed customer projects/);
  assert.match(page, /not photographs of specific completed customer projects/);
  assert.match(page, /titleOverride: 'Remodeling Inspiration'/);
  assert.equal(page.includes('Homeowner reviews'), false);
  assert.equal(page.includes('Project gallery'), false);

  const entry = getSiteUrlGroups().flatMap((group) => group.entries).find((item) => item.path === '/testimonials');
  assert.equal(entry?.label, 'Design Ideas');

  const template = text('../components/seo/LandingPageTemplate.tsx');
  assert.match(template, /testimonialsForPublish\(proof\?\.testimonials\)/);
  assert.equal(template.includes('proof.testimonials.map'), false);
  assert.equal(template.includes('proof?.testimonials.map'), false);
});
