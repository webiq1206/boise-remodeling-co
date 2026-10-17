import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GOOGLE_ADS_ESTIMATOR_LABEL,
  GOOGLE_ADS_LEAD_LABEL,
  acceptedInquiryId,
  trackGoogleAdsEstimatorConversion,
} from '../lib/googleAdsConversion.ts';
import {trackAcceptedInquiry, type AcceptedInquiryResponse} from '../lib/inquiryTracking.ts';

const ESTIMATOR = GOOGLE_ADS_ESTIMATOR_LABEL;
const FORM = GOOGLE_ADS_LEAD_LABEL;

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function conversions(calls: unknown[][]) {
  return calls
    .filter((call) => call[0] === 'event' && call[1] === 'conversion')
    .map((call) => call[2] as {send_to: string; transaction_id?: string});
}

function withBrowser(run: (calls: unknown[][], timers: Array<{fn: () => void; ms: number}>) => void) {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const priorFetch = globalThis.fetch;
  const calls: unknown[][] = [];
  const timers: Array<{fn: () => void; ms: number}> = [];
  const fake: Record<string, unknown> = {
    localStorage: new MemoryStorage(),
    sessionStorage: new MemoryStorage(),
    location: {href: 'https://boiseremodeling.co/estimate'},
    setTimeout: (fn: () => void, ms: number) => { timers.push({fn, ms}); return timers.length; },
    gtag: (...args: unknown[]) => calls.push(args),
  };
  Object.defineProperty(globalThis, 'window', {value: fake, configurable: true});
  globalThis.fetch = async () => new Response(null, {status: 200});
  try { run(calls, timers); }
  finally {
    if (prior) Object.defineProperty(globalThis, 'window', prior);
    else delete (globalThis as {window?: unknown}).window;
    globalThis.fetch = priorFetch;
  }
}

test.describe('estimator and form conversion labels', {concurrency: false}, () => {
test('finishing the estimator fires the estimator label and not the form label', () => {
  const intake = {accepted: true, projectId: 'remodeling:abc', reference: 'R-1', revision: 1};
  assert.equal(acceptedInquiryId(intake), undefined);
  withBrowser((calls) => {
    assert.equal(trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'intake:remodeling:abc', acceptedInquiryId(intake)), true);
    trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'estimator:draft-1');
    const sent = conversions(calls);
    assert.deepEqual(sent.map((row) => row.send_to), [ESTIMATOR, ESTIMATOR]);
    assert.equal(sent.some((row) => row.send_to === FORM), false);
    assert.equal(sent[0].transaction_id, 'intake:remodeling:abc');
  });
});

test('a lead created with the estimator fires the form label once', () => {
  const lead: AcceptedInquiryResponse = {
    accepted: true,
    inquiryId: '11111111-1111-4111-8111-111111111111',
    duplicate: false,
    conversionEligible: true,
    delivery: 'sent',
  };
  assert.equal(acceptedInquiryId(lead), lead.inquiryId);
  assert.equal(acceptedInquiryId({...lead, conversionEligible: false}), undefined);
  withBrowser((calls) => {
    trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'estimator:draft-lead', acceptedInquiryId(lead));
    trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'estimator:draft-lead', acceptedInquiryId(lead));
    trackAcceptedInquiry(lead, 'kitchen');
    const sent = conversions(calls);
    const estimator = sent.filter((row) => row.send_to === ESTIMATOR);
    const form = sent.filter((row) => row.send_to === FORM);
    assert.equal(estimator.length, 1);
    assert.equal(form.length, 1);
    assert.equal(form[0].transaction_id, lead.inquiryId);
    assert.equal(sent.length, 2);
  });
});

test('an accepted form fires only the form label', () => {
  const lead: AcceptedInquiryResponse = {
    accepted: true,
    inquiryId: '22222222-2222-4222-8222-222222222222',
    duplicate: false,
    conversionEligible: true,
    delivery: 'sent',
  };
  withBrowser((calls) => {
    trackAcceptedInquiry(lead, 'bathroom');
    trackAcceptedInquiry(lead, 'bathroom');
    trackAcceptedInquiry({...lead, conversionEligible: false}, 'bathroom');
    const sent = conversions(calls);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].send_to, FORM);
    assert.equal(sent[0].transaction_id, lead.inquiryId);
    assert.equal(sent.some((row) => row.send_to === ESTIMATOR), false);
  });
});

test('estimator completion reuses the 5s gtag retry', () => {
  withBrowser((calls, timers) => {
    const browser = window as unknown as {gtag?: (...args: unknown[]) => void};
    delete browser.gtag;
    assert.equal(trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'estimator:lazy', '33333333-3333-4333-8333-333333333333'), false);
    trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'estimator:lazy', '33333333-3333-4333-8333-333333333333');
    assert.equal(timers.length, 1);
    assert.equal(timers[0].ms, 500);
    assert.equal(trackGoogleAdsEstimatorConversion({service: 'kitchen'}, 'estimator:lazy-stop', undefined, 10), false);
    assert.equal(timers.length, 1);
    browser.gtag = (...args: unknown[]) => calls.push(args);
    timers[0].fn();
    const sent = conversions(calls);
    assert.deepEqual(sent.map((row) => row.send_to).sort(), [ESTIMATOR, FORM].sort());
    assert.equal(sent.filter((row) => row.send_to === FORM).length, 1);
  });
});

test('estimator call sites use the estimator label and the form keeps its own', () => {
  const estimator = readFileSync(new URL('../components/P5Estimator.tsx', import.meta.url), 'utf8');
  const inquiry = readFileSync(new URL('../lib/inquiryTracking.ts', import.meta.url), 'utf8');
  assert.equal(estimator.includes('trackGoogleAdsLeadConversion'), false);
  assert.equal(estimator.includes(FORM), false);
  assert.equal(estimator.includes(ESTIMATOR), false);
  const intakeAt = estimator.indexOf('trackGoogleAdsEstimatorConversion({service:latest.answers.service},`intake:${receipt.projectId}`,acceptedInquiryId(value))');
  const submitAt = estimator.indexOf('trackGoogleAdsEstimatorConversion({service:d.answers.service},`estimator:${d.id}`,acceptedInquiryId(data))');
  assert.ok(intakeAt > estimator.indexOf('requireIntakeReceipt(value)'));
  assert.ok(submitAt > estimator.indexOf("operationFetch('/api/p5-estimator/submit'"));
  assert.ok(inquiry.includes('trackGoogleAdsLeadConversion({ projectType }, response.inquiryId)'));
  assert.equal(inquiry.includes(ESTIMATOR), false);
  assert.equal(inquiry.includes('trackGoogleAdsEstimatorConversion'), false);
});
});
