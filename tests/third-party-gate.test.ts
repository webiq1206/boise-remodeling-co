import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { MetaPixel } from '../components/MetaPixel.tsx';
import { MicrosoftClarity } from '../components/MicrosoftClarity.tsx';
import {
  THIRD_PARTY_FALLBACK_MS,
  THIRD_PARTY_GATE,
  THIRD_PARTY_INTERACTION_EVENTS,
  thirdPartyGateScript,
} from '../lib/thirdPartyGate.ts';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

// Owner decision 2026-11-01 (supersedes the phase 5 "nothing before
// interaction" rule for Meta only): the Meta Pixel inserts fbevents.js at the
// window load event, with no interaction wait and no 5 second wait, so paid-ad
// Landing Page Views are counted. Clarity keeps waiting for the first
// interaction or 5s after load. Both install their command stubs at once, so
// calls queue from the first moment.

type Listener = () => void;
function browser(readyState = 'loading') {
  const listeners = new Map<string, Listener[]>();
  const timers: { fn: Listener; ms: number }[] = [];
  const inserted: string[] = [];
  const script = () => ({ src: '', async: false });
  const window: Record<string, unknown> = {
    addEventListener: (type: string, fn: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type: string, fn: Listener) => listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn)),
  };
  const document = {
    readyState,
    createElement: script,
    getElementsByTagName: () => [{ parentNode: { insertBefore: (node: { src: string }) => inserted.push(node.src) } }],
  };
  window.document = document;
  window.window = window;
  window.setTimeout = (fn: Listener, ms: number) => { timers.push({ fn, ms }); return timers.length; };
  window.clearTimeout = () => {};
  const fire = (type: string) => { for (const fn of listeners.get(type) ?? []) fn(); };
  const run = (source: string) => runInNewContext(source, window);
  return { window, document, listeners, timers, inserted, fire, run };
}

function pixelScript(): string {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const el = MetaPixel() as React.ReactElement<{ children: string; strategy: string }>;
    assert.equal(el.props.strategy, 'afterInteractive');
    return el.props.children;
  } finally {
    process.env.NODE_ENV = before;
  }
}

function clarityScript(): string {
  const before = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const el = MicrosoftClarity() as React.ReactElement<{ dangerouslySetInnerHTML: { __html: string } }>;
    return el.props.dangerouslySetInnerHTML.__html;
  } finally {
    process.env.NODE_ENV = before;
  }
}

test('the gate opens on the first interaction and only then runs queued loaders', () => {
  assert.deepEqual([...THIRD_PARTY_INTERACTION_EVENTS], ['pointerdown', 'keydown', 'scroll', 'touchstart']);
  for (const event of THIRD_PARTY_INTERACTION_EVENTS) {
    const b = browser();
    b.run(thirdPartyGateScript());
    let ran = 0;
    (b.window[THIRD_PARTY_GATE] as (fn: Listener) => void)(() => { ran += 1; });
    assert.equal(ran, 0, `nothing runs before ${event}`);
    b.fire(event);
    assert.equal(ran, 1, event);
    b.fire(event);
    assert.equal(ran, 1, `${event} releases once`);
    (b.window[THIRD_PARTY_GATE] as (fn: Listener) => void)(() => { ran += 1; });
    assert.equal(ran, 2, 'a loader registered after the gate opened runs at once');
  }
});

test('without interaction the gate opens no sooner than 5 seconds after load', () => {
  assert.ok(THIRD_PARTY_FALLBACK_MS >= 5000);
  const b = browser('loading');
  b.run(thirdPartyGateScript());
  let ran = 0;
  (b.window[THIRD_PARTY_GATE] as (fn: Listener) => void)(() => { ran += 1; });
  assert.equal(b.timers.length, 0, 'no timer is armed before the load event');
  b.fire('load');
  assert.equal(b.timers.length, 1);
  assert.ok(b.timers[0].ms >= 5000);
  assert.equal(ran, 0);
  b.timers[0].fn();
  assert.equal(ran, 1);
});

const FBEVENTS = 'https://connect.facebook.net/en_US/fbevents.js';

test('the Meta Pixel queues PageView at once and loads fbevents.js at the load event, not behind the gate', () => {
  const source = pixelScript();
  assert.doesNotMatch(source, new RegExp(THIRD_PARTY_GATE), 'the pixel loader does not go through the interaction gate');
  const b = browser('loading');
  b.run(thirdPartyGateScript());
  b.run(source);
  const fbq = b.window.fbq as { queue: unknown[][] };
  assert.equal(typeof fbq, 'function');
  const queued = Array.from(fbq.queue).map((args) => Array.from(args as ArrayLike<unknown>).slice(0, 2).join(':'));
  assert.deepEqual(queued.map((q) => q.split(':')[0]), ['set', 'init', 'track']);
  assert.equal(queued[2], 'track:PageView');
  assert.deepEqual(b.inserted, [], 'fbevents.js is not requested before the load event');
  (b.window.fbq as (...args: unknown[]) => void)('track', 'Lead', {}, { eventID: 'x' });
  assert.equal(fbq.queue.length, 4, 'a Lead fired before load is queued for fbevents.js');
  b.fire('load');
  assert.deepEqual(b.inserted, [FBEVENTS], 'fbevents.js loads at the load event with no interaction and no timer');
  b.fire('pointerdown');
  for (const timer of b.timers) timer.fn();
  assert.deepEqual(b.inserted, [FBEVENTS], 'opening the gate later does not load it twice');
});

test('the Meta Pixel loads fbevents.js at once when the page has already loaded', () => {
  const b = browser('complete');
  b.run(thirdPartyGateScript());
  b.run(pixelScript());
  assert.deepEqual(b.inserted, [FBEVENTS]);
});

test('Clarity installs its stub at once and loads its tag only through the gate', () => {
  const source = clarityScript();
  const b = browser();
  b.run(thirdPartyGateScript());
  b.run(source);
  assert.equal(typeof b.window.clarity, 'function');
  (b.window.clarity as (...args: unknown[]) => void)('set', 'page', 'about');
  assert.equal((b.window.clarity as unknown as { q: unknown[] }).q.length, 1);
  assert.deepEqual(b.inserted, []);
  b.fire('load');
  assert.deepEqual(b.inserted, [], 'Clarity does not load at the load event');
  b.fire('keydown');
  assert.equal(b.inserted.length, 1);
  assert.match(b.inserted[0], /^https:\/\/www\.clarity\.ms\/tag\/x5wrjdadlb\?ref=bwt$/);
});

test('the root layout installs the gate before the pixel and keeps the Clarity field mask', () => {
  const layout = readFileSync('app/layout.tsx', 'utf8');
  const gate = layout.indexOf('<Script id="third-party-gate" strategy="beforeInteractive">');
  assert.ok(gate > 0, 'gate script is beforeInteractive');
  assert.ok(layout.indexOf('<MetaPixel />') > gate);
  assert.ok(layout.indexOf('<MicrosoftClarity />') > gate);
  assert.match(layout, /<Script id="clarity-field-mask" strategy="beforeInteractive">/);
  for (const file of ['components/MetaPixel.tsx', 'components/MicrosoftClarity.tsx']) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /lazyOnload|beforeInteractive/, file);
  }
});
