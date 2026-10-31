import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOG_POSTS } from '../shared/blogContent.ts';
import { GUIDE_PAGES } from '../shared/guideContent.ts';
import { CONTENT_HUBS } from '../shared/contentHubs.ts';
import { SERVICES } from '../shared/contentData.ts';
import { toSentenceCase } from '../shared/sentenceCase.ts';

test('sentence case keeps proper nouns, acronyms and clause starts', () => {
  assert.equal(toSentenceCase('Kitchen Remodel Cost in Boise: 2026 Planning Ranges'), 'Kitchen remodel cost in Boise: 2026 planning ranges');
  assert.equal(toSentenceCase('Does a Kitchen Remodel Add Value? Kitchen ROI Explained'), 'Does a kitchen remodel add value? Kitchen ROI explained');
  assert.equal(toSentenceCase('Ada vs Canyon County Remodel Permits'), 'Ada vs Canyon County remodel permits');
  assert.equal(toSentenceCase('Boise Remodeling Cost Guide (2026 Planning Ranges)'), 'Boise remodeling cost guide (2026 planning ranges)');
  assert.equal(toSentenceCase('Terms of Service for Boise Remodeling Co'), 'Terms of service for Boise Remodeling Co');
  assert.equal(toSentenceCase('Harris Ranch Remodeling Guide'), 'Harris Ranch remodeling guide');
  assert.equal(toSentenceCase('ADU / Guest House'), 'ADU / guest house');
  assert.equal(toSentenceCase('Mother-in-Law Suites & Multigenerational Living Remodels'), 'Mother-in-law suites & multigenerational living remodels');
});

test('rendered H1s change only capitals, never wording', () => {
  const titles = [
    ...BLOG_POSTS.map((p) => p.title),
    ...GUIDE_PAGES.map((g) => g.title),
    ...CONTENT_HUBS.map((h) => h.title),
    ...SERVICES.map((s) => s.name),
  ];
  for (const title of titles) {
    const out = toSentenceCase(title);
    assert.equal(out.toLowerCase(), title.toLowerCase(), title);
    assert.equal(out[0], out[0].toUpperCase(), title);
  }
});
