import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import test from 'node:test';
import { landingFAQSchema } from '../lib/landing-schema.ts';
import { AREA_CITY_COPY } from '../shared/content/areaCopy.ts';
import { GBP_QA_SEED } from '../shared/gbpProfile.ts';
import { AREA_PAGE_FAQS } from '../shared/seoContent.ts';

const REGISTRATION_ANSWER =
  'Yes. P5 Home Co LLC, Idaho Registered Contractor #8381215. Insured; certificate on request.';
const REGISTRATION_QUESTION = 'Are you a registered contractor and insured?';

// Built so this file does not contain the claim word it rejects.
const CLAIM = 'bond' + 'ed';
const CLAIM_RE = new RegExp(`\\b${CLAIM}\\b`, 'i');

const SCAN_ROOTS = ['app', 'components', 'lib', 'shared', 'public', 'scripts', 'backlink-engine'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage']);
const TEXT_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.txt', '.json', '.html']);
const ALLOW = new Set<string>();

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
}

test('published copy, FAQ, meta and JSON-LD do not claim bonded', () => {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(root, files);
  const hits: string[] = [];
  for (const abs of files) {
    const rel = relative(process.cwd(), abs).split('\\').join('/');
    if (ALLOW.has(rel)) continue;
    const ext = rel.slice(rel.lastIndexOf('.'));
    if (!TEXT_EXT.has(ext)) continue;
    if (CLAIM_RE.test(readFileSync(abs, 'utf8'))) hits.push(rel);
  }
  assert.deepEqual(hits, []);
});

test('area FAQ answers match FAQPage JSON-LD and do not claim a bond', () => {
  const groups: Array<[string, Array<{ question: string; answer: string }>]> = [
    ['fallback', AREA_PAGE_FAQS],
    ...Object.entries(AREA_CITY_COPY).map(
      ([city, copy]) => [city, copy.faqs] as [string, Array<{ question: string; answer: string }>],
    ),
  ];
  for (const [label, faqs] of groups) {
    const schema = landingFAQSchema(faqs);
    const entities = schema.mainEntity as Array<{
      name: string;
      acceptedAnswer: { text: string };
    }>;
    assert.equal(entities.length, faqs.length, label);
    faqs.forEach((faq, index) => {
      assert.equal(entities[index].name, faq.question, `${label} question ${index}`);
      assert.equal(entities[index].acceptedAnswer.text, faq.answer, `${label} answer ${index}`);
      assert.equal(CLAIM_RE.test(faq.question), false, faq.question);
      assert.equal(CLAIM_RE.test(faq.answer), false, faq.answer);
    });
    const registration = faqs.filter((faq) => faq.question === REGISTRATION_QUESTION);
    assert.equal(registration.length, 1, label);
    assert.equal(registration[0].answer, REGISTRATION_ANSWER, label);
    assert.equal(JSON.stringify(schema).includes(REGISTRATION_ANSWER), true, label);
  }

  const gbp = GBP_QA_SEED.find((entry) => entry.question === REGISTRATION_QUESTION);
  assert.ok(gbp);
  assert.equal(gbp.answer, REGISTRATION_ANSWER);
});
