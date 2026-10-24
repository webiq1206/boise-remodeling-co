import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GTAG_READY_ATTEMPTS,
  GTAG_READY_WAIT_MS,
  GOOGLE_ADS_ESTIMATOR_LABEL,
  GOOGLE_ADS_LEAD_LABEL,
  trackGoogleAdsLeadConversion,
} from '../lib/googleAdsConversion.ts';

const ESTIMATOR = GOOGLE_ADS_ESTIMATOR_LABEL;
const FORM = GOOGLE_ADS_LEAD_LABEL;
const ENGINE_HASH = 'b0671d01cb603f1283f389b2310a96f7f2c70d94ba686c60457a8049b46c59c1';

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
  const calls: unknown[][] = [];
  const timers: Array<{fn: () => void; ms: number}> = [];
  const fake: Record<string, unknown> = {
    sessionStorage: new MemoryStorage(),
    setTimeout: (fn: () => void, ms: number) => { timers.push({fn, ms}); return timers.length; },
    gtag: (...args: unknown[]) => calls.push(args),
  };
  Object.defineProperty(globalThis, 'window', {value: fake, configurable: true});
  try { run(calls, timers); }
  finally {
    if (prior) Object.defineProperty(globalThis, 'window', prior);
    else delete (globalThis as {window?: unknown}).window;
  }
}

test.describe('estimator and form conversion labels', {concurrency: false}, () => {
test('an estimator key fires both labels once', () => {
  withBrowser((calls) => {
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'intake:remodeling:abc'), true);
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:draft-1'), true);
    const sent = conversions(calls);
    assert.deepEqual(sent.map((row) => row.send_to), [ESTIMATOR, FORM, ESTIMATOR, FORM]);
    assert.deepEqual(sent.map((row) => row.transaction_id), [
      'intake:remodeling:abc',
      'abc',
      'estimator:draft-1',
      'draft-1',
    ]);
  });
});

test('a repeated key fires nothing', () => {
  withBrowser((calls) => {
    trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:once');
    const first = calls.length;
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:once'), false);
    assert.equal(trackGoogleAdsLeadConversion({projectType: 'kitchen'}, 'inquiry-once'), true);
    const afterForm = calls.length;
    assert.equal(trackGoogleAdsLeadConversion({projectType: 'kitchen'}, 'inquiry-once'), false);
    assert.equal(calls.length, afterForm);
    assert.equal(first, 2);
    assert.equal(afterForm, 3);
  });
});

test('a form key fires the form label only', () => {
  withBrowser((calls) => {
    assert.equal(trackGoogleAdsLeadConversion({projectType: 'bathroom'}, '22222222-2222-4222-8222-222222222222'), true);
    const sent = conversions(calls);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].send_to, FORM);
    assert.equal(sent[0].transaction_id, '22222222-2222-4222-8222-222222222222');
  });
});

test('a missing gtag retries for ten seconds and still fires both labels once', () => {
  assert.equal(GTAG_READY_ATTEMPTS * GTAG_READY_WAIT_MS, 10000);
  withBrowser((calls, timers) => {
    const browser = window as unknown as {gtag?: (...args: unknown[]) => void};
    delete browser.gtag;
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:lazy'), false);
    trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:lazy');
    assert.equal(timers.length, 1);
    assert.equal(timers[0].ms, GTAG_READY_WAIT_MS);
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:stop', GTAG_READY_ATTEMPTS), false);
    assert.equal(timers.length, 1);
    browser.gtag = (...args: unknown[]) => calls.push(args);
    timers[0].fn();
    const sent = conversions(calls);
    assert.deepEqual(sent.map((row) => row.send_to), [ESTIMATOR, FORM]);
    assert.deepEqual(sent.map((row) => row.transaction_id), ['estimator:lazy', 'lazy']);
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:lazy'), false);
    assert.equal(conversions(calls).length, 2);
  });
});

test('intake confirm and estimate submit on one project fire the form label once', () => {
  withBrowser((calls) => {
    trackGoogleAdsLeadConversion({service: 'kitchen'}, 'intake:remodeling:project-9');
    trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:project-9');
    const sent = conversions(calls);
    const estimator = sent.filter((row) => row.send_to === ESTIMATOR);
    const form = sent.filter((row) => row.send_to === FORM);
    assert.deepEqual(estimator.map((row) => row.transaction_id), ['intake:remodeling:project-9', 'estimator:project-9']);
    assert.equal(form.length, 1);
    assert.equal(form[0].transaction_id, 'project-9');
  });
});

test('a finish that did not create an accepted lead fires only the estimator label', () => {
  withBrowser((calls) => {
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'estimator:'), true);
    const sent = conversions(calls);
    assert.deepEqual(sent.map((row) => row.send_to), [ESTIMATOR]);
    assert.equal(sent[0].transaction_id, 'estimator:');
  });
});

test('a thrown gtag does not escape the conversion call', () => {
  withBrowser(() => {
    (window as unknown as {gtag: () => void}).gtag = () => { throw new Error('tag blocked'); };
    assert.doesNotThrow(() => trackGoogleAdsLeadConversion({service: 'kitchen'}, 'intake:throws'));
    assert.equal(trackGoogleAdsLeadConversion({service: 'kitchen'}, 'intake:throws'), false);
  });
});

test('accepted, duplicate, and 409 are decided at the engine call sites', () => {
  const estimator = readFileSync(new URL('../components/P5Estimator.tsx', import.meta.url), 'utf8');
  const intakeStart = estimator.indexOf('async function submitIntake');
  const submitStart = estimator.indexOf('async function submit(');
  const intake = estimator.slice(intakeStart, submitStart);
  const notOk = intake.indexOf('if(!response.ok)throw');
  const receipt = intake.indexOf('requireIntakeReceipt(value)');
  const intakeTrack = intake.indexOf('trackGoogleAdsLeadConversion({service:latest.answers.service},`intake:${receipt.projectId}`)');
  assert.ok(notOk >= 0 && notOk < intakeTrack);
  assert.ok(receipt > notOk && receipt < intakeTrack);
  const submit = estimator.slice(submitStart);
  const submitTrack = submit.indexOf('trackGoogleAdsLeadConversion({service:d.answers.service},`estimator:${d.id}`)');
  assert.ok(submitTrack > 0);
  const submitCall = submit.slice(submitTrack, submit.indexOf(');', submitTrack));
  assert.equal(submitCall.includes('accepted'), false);
  assert.equal(submitCall.includes('data.accepted'), false);
});

test('the shared estimator engine is unchanged', () => {
  const estimator = readFileSync(new URL('../components/P5Estimator.tsx', import.meta.url), 'utf8');
  const hash = createHash('sha256').update(estimator.replace(/\r\n/g, '\n')).digest('hex');
  const manifest = JSON.parse(readFileSync(new URL('../lib/p5/shared-manifest.json', import.meta.url), 'utf8')) as {
    source: string;
    commit: string;
    files: Record<string, string>;
  };
  assert.equal(hash, ENGINE_HASH);
  assert.equal(manifest.files['components/P5Estimator.tsx'], ENGINE_HASH);
  assert.equal(manifest.source, 'p5-home-co');
  assert.equal(manifest.commit, 'b3256f7b46c5c89a9f9991c33397d4a1e83a0d33');
  assert.match(estimator, /trackGoogleAdsLeadConversion\(\{service:latest\.answers\.service\},`intake:\$\{receipt\.projectId\}`\)/);
  assert.match(estimator, /trackGoogleAdsLeadConversion\(\{service:d\.answers\.service\},`estimator:\$\{d\.id\}`\)/);
  assert.equal(estimator.includes(ESTIMATOR), false);
  assert.equal(estimator.includes(FORM), false);
  assert.equal(estimator.includes('trackGoogleAdsEstimatorConversion'), false);
});
});
