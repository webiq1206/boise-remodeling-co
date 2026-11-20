import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVICE_SEO_CONTENT } from '../shared/seoContent.ts';

// Tier cards restate the cost copy. A figure that is not in that copy is a new
// price, and prices are the owner's to set. Every figure in both comes from the
// P5 instant estimator (shared/content/p5PublishedFigures.json, owner,
// 20 November 2026); tests/p5-published-figures.test.ts checks that side.
test('every cost tier figure is already in that service cost copy', () => {
  let tiered = 0;
  for (const [slug, content] of Object.entries(SERVICE_SEO_CONTENT)) {
    if (!content.costTiers) continue;
    tiered++;
    assert.ok(content.costGuidance, `${slug} has tiers but no cost copy`);
    const copy = content.costGuidance.paragraphs.join(' ');
    assert.ok(content.costTiers.length >= 2 && content.costTiers.length <= 3, `${slug}: two or three tiers fill a row`);
    for (const tier of content.costTiers) {
      const figures = tier.range.match(/\$[\d,]+/g) ?? [];
      assert.ok(figures.length > 0, `${slug}: "${tier.label}" names no figure`);
      for (const figure of figures) assert.ok(copy.includes(figure), `${slug}: ${figure} is not in the cost copy`);
      assert.ok(!/\$/.test(tier.note ?? ''), `${slug}: a tier note carries no figure`);
    }
  }
  assert.ok(tiered >= 5, 'kitchen, bathroom, whole-home, addition and basement carry tiers');
});

// The instant estimator prices no ADU conversion, deck or aging-in-place work
// for this brand, so those pages carry no figure and no tier at all.
test('services the instant estimator does not price carry no figure', () => {
  for (const slug of ['adu', 'outdoor-living', 'aging-in-place']) {
    const content = SERVICE_SEO_CONTENT[slug];
    assert.ok(content, `${slug} has content`);
    assert.equal(content.costTiers, undefined, `${slug} has no tiers`);
    assert.ok(!/\$\s?\d/.test(JSON.stringify(content)), `${slug}: no dollar figure anywhere in its content`);
  }
});
