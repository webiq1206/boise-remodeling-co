import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
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

const OTHER_BUSINESS_REVIEWS = [
  'Lawn Care',
  'Lawn Care Kuna',
  'taking care of our yard',
  'Best Christmas light installation',
  'recommended them to all our neighbors',
  'beautiful patio in our backyard',
];

test('the public testimonials API returns no seed rows while the flag is off', async () => {
  const route = text('../app/api/testimonials/route.ts');
  const gate = route.indexOf('if (!SHOW_TESTIMONIALS)');
  const read = route.indexOf('db.select');
  assert.ok(gate >= 0 && read > gate, 'the flag returns before any database read');
  assert.equal(/from\s+["']@\/lib\/db["']/.test(route), false);
  assert.equal(/from\s+["']@\/server\/storage["']/.test(route), false);
  assert.equal(/from\s+["']\.\/db["']/.test(route), false);
  const response = await GET();
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  const body = await response.json();
  assert.deepEqual(body, []);
  const serialized = JSON.stringify(body);
  for (const name of SEED_NAMES) assert.equal(serialized.includes(name), false, name);
  for (const phrase of OTHER_BUSINESS_REVIEWS) assert.equal(serialized.includes(phrase), false, phrase);
});

test('the flag-off API returns [] in production with no database', () => {
  const env = { ...process.env, NODE_ENV: 'production' };
  delete env.DATABASE_URL;
  delete env.NEXT_PHASE;
  const probe = spawnSync(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      [
        "const mod = await import('./app/api/testimonials/route.ts');",
        'const GET = mod.GET ?? mod.default?.GET;',
        "if (typeof GET !== 'function') throw new Error('GET missing: ' + Object.keys(mod).join(','));",
        'const response = await GET();',
        'const body = await response.json();',
        "if (response.status !== 200) throw new Error('status ' + response.status);",
        "if (JSON.stringify(body) !== '[]') throw new Error('body ' + JSON.stringify(body));",
        "if (response.headers.get('cache-control') !== 'no-store, max-age=0') throw new Error('cache ' + response.headers.get('cache-control'));",
      ].join('\n'),
    ],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env,
      encoding: 'utf8',
    },
  );
  assert.equal(probe.status, 0, `${probe.stderr || ''}\n${probe.stdout || ''}`);
});

test('client source does not carry the other business review text', () => {
  const roots = ['app', 'components', 'shared', 'lib', 'public'];
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.next') continue;
      const file = join(dir, name);
      const info = statSync(file);
      if (info.isDirectory()) walk(file);
      else if (info.isFile() && info.size < 2_000_000) {
        const body = readFileSync(file, 'utf8');
        for (const phrase of OTHER_BUSINESS_REVIEWS) {
          if (body.includes(phrase)) hits.push(`${file}: ${phrase}`);
        }
      }
    }
  };
  for (const root of roots) walk(root);
  assert.deepEqual(hits, []);
  const guard = text('../scripts/grep-client-reviews.mjs');
  assert.match(guard, /Lawn Care/);
  assert.match(guard, /taking care of our yard/);
  assert.match(text('../package.json'), /next build && node scripts\/grep-client-reviews\.mjs/);
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
    text('../app/design-ideas/page.tsx'),
    text('../public/llms.txt'),
    text('../public/llms-full.txt'),
  ].join('\n');
  for (const phrase of BANNED) assert.equal(surfaces.includes(phrase), false, phrase);

  const page = text('../app/design-ideas/page.tsx');
  assert.match(page, /Captioned for materials and layout, not invented project records/);
  assert.match(page, /titleOverride: 'Remodeling Design Ideas'/);
  assert.equal(page.includes('Homeowner reviews'), false);
  assert.equal(page.includes('Project gallery'), false);

  const entry = getSiteUrlGroups().flatMap((group) => group.entries).find((item) => item.path === '/design-ideas');
  // Sentence case since owner decision C (1 November 2026); still not "Testimonials".
  assert.equal(entry?.label, 'Design ideas');

  const template = text('../components/seo/LandingPageTemplate.tsx');
  assert.match(template, /testimonialsForPublish\(proof\?\.testimonials\)/);
  assert.equal(template.includes('proof.testimonials.map'), false);
  assert.equal(template.includes('proof?.testimonials.map'), false);
});


test('review bundle guard still rejects foreign reviews when ripgrep is unavailable', () => {
  const directory = mkdtempSync(join(tmpdir(), 'review-bundle-'));
  const script = fileURLToPath(new URL('../scripts/grep-client-reviews.mjs', import.meta.url));
  try {
    mkdirSync(join(directory, '.next/static/nested'), { recursive: true });
    const bundle = join(directory, '.next/static/nested/chunk.js');
    const scan = () => spawnSync(process.execPath, [script], {
      cwd: directory, env: { ...process.env, PATH: join(directory, 'no-executables') }, encoding: 'utf8',
    });
    writeFileSync(bundle, 'Approved remodeling copy');
    assert.equal(scan().status, 0);
    for (const phrase of ['Lawn Care', 'taking care of our yard', 'Best Christmas light installation', 'recommended them to all our neighbors', 'beautiful patio in our backyard']) {
      writeFileSync(bundle, phrase);
      const result = scan();
      assert.equal(result.status, 1, phrase);
      assert.match(result.stderr, /client bundle contains forbidden review text/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
