import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CITIES } from '../shared/contentData';
import { BLOG_POSTS } from '../shared/blogContent';
import { GUIDE_PAGES } from '../shared/guideContent';
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

/** Letter names (L, L-shaped, U) and a few yoo-sounds the service helper does not cover. */
function blogArticle(word: string): 'a' | 'an' {
  if (/^[A-Z](?:-[A-Za-z]+)?$/.test(word)) {
    return /^[AEFHILMNORSX]/.test(word[0] ?? '') ? 'an' : 'a';
  }
  if (/^un(?!i(?:fi|t|que|versal|verse|son|form|fy|corn|lateral|sex|ted))/i.test(word)) return 'an';
  if (/^(usable|user|useful|usage)/i.test(word)) return 'a';
  return indefiniteArticle(word);
}

function publishedText(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(publishedText);
  if (value && typeof value === 'object') return Object.values(value).flatMap(publishedText);
  return [];
}

test('blog posts use a or an for the following word', () => {
  const misses: string[] = [];
  for (const post of BLOG_POSTS) {
    const text = publishedText(post).join('\n').replace(/<[^>]+>/g, ' ');
    const re = /\b(a|an)\s+([A-Za-z][A-Za-z-]*)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const actual = match[1];
      const expected = blogArticle(match[2]);
      if (actual !== expected) misses.push(`${post.slug}: ${actual} ${match[2]}`);
    }
  }
  assert.deepEqual(misses, []);
});

test('a size used as a compound adjective is hyphenated', () => {
  const pages = [...BLOG_POSTS, ...GUIDE_PAGES];
  const misses: string[] = [];
  for (const page of pages) {
    const text = publishedText(page).join('\n');
    const re = /\d[\d,]* square foot [A-Za-z]/g;
    const found = text.match(re);
    if (found) misses.push(`${page.slug}: ${found.join('; ')}`);
  }
  assert.deepEqual(misses, []);
});

test('company tel links use +1 and the visible number stays the same', () => {
  assert.equal(SITE_CONFIG.phone, '(208) 477-1169');
  assert.equal(SITE_CONFIG.phoneHref, 'tel:+12084771169');
  const outreach = readFileSync(new URL('../shared/reviewOutreach.ts', import.meta.url), 'utf8');
  assert.equal(outreach.includes('tel:2084771169'), false);
  assert.match(outreach, /SITE_CONFIG\.phoneHref/);
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

test('every vCard line is at most 75 octets and lines use CRLF', () => {
  const card = buildBusinessVCard();
  assert.equal(card.endsWith('\r\n'), true);
  assert.equal(card.replace(/\r\n/g, '').includes('\n'), false);
  const physical = card.slice(0, -2).split('\r\n');
  const logical: string[] = [];
  for (const line of physical) {
    assert.ok(Buffer.byteLength(line) <= 75, `${Buffer.byteLength(line)} octets: ${line}`);
    if (line.startsWith(' ')) {
      assert.ok(logical.length > 0);
      logical[logical.length - 1] += line.slice(1);
    } else {
      logical.push(line);
    }
  }
  const note = logical.find((line) => line.startsWith('NOTE:'));
  assert.ok(note);
  assert.match(note, /Treasure Valley · Ada and Canyon County/);
  assert.match(note, /Hours: Monday 7:00 AM - 6:00 PM\\; Tuesday 7:00 AM - 6:00 PM\\; Wednesday 7:00 AM - 6:00 PM\\; Thursday 7:00 AM - 6:00 PM\\; Friday 7:00 AM - 6:00 PM\\; Saturday 8:00 AM - 4:00 PM\\; Sunday Closed/);
});
