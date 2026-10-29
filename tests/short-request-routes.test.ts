import test from 'node:test';
import assert from 'node:assert/strict';
import { isShortRequestPath } from '../lib/shortRequestRoutes.ts';
import { isEstimatorPath } from '../lib/p5/estimatorRoutes.ts';
test('short request and nested estimator keep distinct chrome ownership', () => {
 assert.equal(isShortRequestPath('/estimate'), true);
 assert.equal(isEstimatorPath('/estimate', 'remodeling'), false);
 for (const path of ['/estimate/scope', '/estimate/p5-preview']) {
  assert.equal(isShortRequestPath(path), false);
  assert.equal(isEstimatorPath(path, 'remodeling'), true);
 }
 for (const path of ['/', '/estimates', '/estimate-other', null, undefined]) assert.equal(isShortRequestPath(path), false);
});
