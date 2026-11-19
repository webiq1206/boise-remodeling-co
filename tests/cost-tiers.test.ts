import assert from 'node:assert/strict';
import test from 'node:test';
import { SERVICE_SEO_CONTENT } from '../shared/seoContent.ts';

// Tier cards restate the cost copy. A figure that is not in that copy is a new
// price, and prices are the owner's to set.
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
  assert.ok(tiered >= 3, 'kitchen, bathroom and ADU carry tiers');
});
