/**
 * Pins the release 2 public-claims guard (scripts/lib/publicClaimsGuard.ts),
 * which verify:public-claims runs in prebuild.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { findPublicClaims, scanRepositoryForPublicClaims } from '../scripts/lib/publicClaimsGuard';

const ids = (text: string) => findPublicClaims(text).map((hit) => hit.id);

test('catches each prohibited claim, including across JSX line breaks', () => {
  assert.ok(ids('Idaho Registered Contractor #8381215, bonded and insured.').includes('bonded'));
  assert.ok(ids('Bonded · Insured').includes('bonded'));
  assert.ok(ids('It covers our crews and our subcontractors.').includes('coverage-includes-subcontractors'));
  assert.ok(ids('covering our people and the subcontractors we hire').includes('subcontractors-we-hire'));
  assert.ok(ids('One contract, one project manager, one invoice.').includes('one-invoice'));
  assert.ok(ids('design and construction under\n          a single contract').includes('one-contract'));
  // Owner decision, 13 November 2026: the central estimator at /instant-estimate gives an
  // on-screen preliminary range, so instant-estimate wording is allowed (next test). It must
  // never be called a quote or a final price, and no specific time is promised.
  assert.ok(ids('Get an instant quote for your kitchen').includes('instant-quote'));
  assert.ok(ids('an instant online quote').includes('instant-quote'));
  assert.ok(ids('an instant firm price').includes('instant-quote'));
  assert.ok(ids('Get your quote in a few minutes.').includes('quote-in-minutes'));
  assert.ok(ids('The online estimator gives you a planning range in 5 minutes.').includes('estimate-in-timed-minutes'));
  assert.ok(ids('See your price range\n          in under a minute').includes('estimate-in-timed-minutes'));
  assert.ok(ids('your estimate in 60 seconds').includes('estimate-in-timed-minutes'));
  assert.ok(ids('Same-day approval decisions').includes('same-day-approval'));
  assert.ok(ids('you can get a decision the same day').includes('decision-same-day'));
  assert.ok(ids('Recurring service customers may set up automatic billing').includes('recurring-billing'));
  assert.ok(ids("If you're not satisfied with a service, please contact us within 48 hours").includes('48-hour-satisfaction'));
});

test('allows the replacement wording', () => {
  assert.deepEqual(ids('Idaho Registered Contractor #8381215 and insured.'), []);
  assert.deepEqual(ids('One accountable company and one point of contact for your project.'), []);
  assert.deepEqual(ids('Work performed by our own team carries a one-year workmanship warranty.'), []);
  assert.deepEqual(ids('explore planning ranges, or request a quote'), []);
});

// Owner decision, 13 November 2026: the central estimator at /instant-estimate shows a
// preliminary range on screen, so the wording the guard used to reject is accurate now.
test('allows instant-estimate wording for the central estimator', () => {
  assert.deepEqual(ids('try the instant estimator'), []);
  assert.deepEqual(ids('Get an instant estimate'), []);
  assert.deepEqual(ids('an instant preliminary estimate and a preliminary price range'), []);
  assert.deepEqual(ids('The online estimator gives you a planning range in a few minutes.'), []);
  assert.deepEqual(ids('See a preliminary price range in minutes, free, with no appointment.'), []);
  assert.deepEqual(ids('A firm written proposal follows a free 60 to 90 minute in-home visit.'), []);
});

test('the repository is clean', () => {
  assert.deepEqual(scanRepositoryForPublicClaims(), []);
});
