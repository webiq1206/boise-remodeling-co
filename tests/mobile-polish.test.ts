import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('home keywords and the current ungated planning calculator survive phone polish', () => {
  const hero = readFileSync('components/approved/ApprovedHomeHero.tsx', 'utf8');
  const ranges = readFileSync('components/approved/PlanningRangeExplorer.tsx', 'utf8');
  assert.match(hero, /title="Boise home remodeling\."/);
  assert.match(hero, /titleAccent="One team, start to finish\."/);
  assert.match(ranges, /Your remodel\.<br \/><em>A clearer starting point\.<\/em>/);
  assert.match(ranges, /calculateEstimate\(input, 0\)/);
  assert.match(ranges, /See a modeled budget immediately, without sharing contact details/);
  assert.match(ranges, /\["Project", "Size", "Finish", "Layout", "Review"\]/);
  assert.equal(ranges.includes('const RANGES ='), false);
});

test('phone polish preserves canonical type and controls instead of universal overrides', () => {
  const css = readFileSync('app/mobile-polish.css', 'utf8');
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /text-align: center/);
  assert.match(css, /min-height: var\(--touch-min\)/);
  assert.match(css, /gap: var\(--space-4\)/);
  assert.match(css, /overflow-x: auto/);
  assert.match(css, /max-inline-size: 100%/);
  assert.doesNotMatch(css, /font-size\s*:|line-height\s*:|!important/);
  assert.doesNotMatch(css, /\b(?:input|textarea|select|label|legend)\b\s*[,\[.{:#]/);
});

test('phone scrolling stays on the document for anchors, planning steps and the TOC', () => {
  const css = readFileSync('app/mobile-polish.css', 'utf8');
  const layout = readFileSync('app/layout.tsx', 'utf8');
  const scroll = readFileSync('components/ScrollToTop.tsx', 'utf8');
  assert.doesNotMatch(css, /m-phone-scroll|height:\s*100svh|overflow:\s*hidden|position:\s*static/);
  assert.doesNotMatch(layout, /m-phone-scroll|m-phone-frame/);
  assert.doesNotMatch(scroll, /m-phone-scroll/);
  assert.match(scroll, /window\.scrollTo/);
});
