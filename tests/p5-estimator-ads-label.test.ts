import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  GOOGLE_ADS_ESTIMATOR_LABEL,
  GOOGLE_ADS_LEAD_LABEL,
  googleAdsLeadParams,
  trackGoogleAdsLeadConversion,
} from '../lib/googleAdsConversion.ts';

function withWindow(run: (calls: unknown[][]) => void) {
  const calls: unknown[][] = [];
  const store = new Map<string, string>();
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const fake = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    },
    gtag: (...args: unknown[]) => { calls.push(args); },
    setTimeout: () => 0,
  };
  Object.defineProperty(globalThis, 'window', { value: fake, configurable: true });
  try {
    run(calls);
  } finally {
    if (prior) Object.defineProperty(globalThis, 'window', prior);
    else delete (globalThis as { window?: unknown }).window;
  }
}

test('estimator completion fires its own label and keeps the transaction id', () => {
  withWindow((calls) => {
    assert.equal(trackGoogleAdsLeadConversion({ service: 'kitchen' }, 'estimator:draft-1'), true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0][0], 'event');
    assert.equal(calls[0][1], 'conversion');
    const params = calls[0][2] as { send_to: string; transaction_id: string; currency: string; value: number };
    assert.equal(params.send_to, 'AW-18354188204/cEzmCPOagKAdEKzf-q9E');
    assert.equal(params.send_to, GOOGLE_ADS_ESTIMATOR_LABEL);
    assert.notEqual(params.send_to, GOOGLE_ADS_LEAD_LABEL);
    assert.equal(params.transaction_id, 'estimator:draft-1');
    assert.equal(params.currency, 'USD');
    assert.equal(params.value, 200);
    assert.equal(trackGoogleAdsLeadConversion({ service: 'kitchen' }, 'estimator:draft-1'), false);
    assert.equal(calls.length, 1);
  });
});

test('an estimator intake key uses the estimator label, not the consultation form label', () => {
  withWindow((calls) => {
    assert.equal(trackGoogleAdsLeadConversion({ service: 'bath' }, 'intake:project-1'), true);
    const params = calls[0][2] as { send_to: string; transaction_id: string };
    assert.equal(params.send_to, GOOGLE_ADS_ESTIMATOR_LABEL);
    assert.equal(params.transaction_id, 'intake:project-1');
  });
});

test('consultation form params stay on the form label with the inquiry id', () => {
  const params = googleAdsLeadParams({ projectType: 'kitchen' }, 'inquiry-1');
  assert.equal(params.send_to, 'AW-18354188204/LE2vCPXstO8cEKzf-q9E');
  assert.equal(params.send_to, GOOGLE_ADS_LEAD_LABEL);
  assert.equal(params.transaction_id, 'inquiry-1');
});

test('the shared estimator does not choose either Ads label', () => {
  const source = readFileSync(new URL('../components/P5Estimator.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('cEzmCPOagKAdEKzf-q9E'), false);
  assert.equal(source.includes('LE2vCPXstO8cEKzf-q9E'), false);
  assert.match(source, /trackGoogleAdsLeadConversion\(\{service:latest\.answers\.service\},`intake:\$\{receipt\.projectId\}`\)/);
  assert.match(source, /trackGoogleAdsLeadConversion\(\{service:d\.answers\.service\},`estimator:\$\{d\.id\}`\)/);
});
