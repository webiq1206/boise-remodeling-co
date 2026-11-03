import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('home H1 keeps the Boise remodeling keyword and the cost heading is shorter', () => {
  const hero = readFileSync('components/approved/ApprovedHomeHero.tsx', 'utf8');
  const ranges = readFileSync('components/approved/PlanningRangeExplorer.tsx', 'utf8');
  assert.match(hero, /title="Boise home remodeling\."/);
  assert.match(hero, /titleAccent="One team, start to finish\."/);
  assert.match(ranges, /Treasure Valley <em>remodel plans\.<\/em>/);
  assert.equal(ranges.includes('What Treasure Valley remodels'), false);
});

test('phone rules cap type, center the hero, and keep a 44px tap floor', () => {
  const css = readFileSync('app/mobile-polish.css', 'utf8');
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /font-size: 40px/);
  assert.match(css, /font-size: 36px/);
  assert.match(css, /font-size: 16px/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /text-align: center/);
  assert.match(css, /padding-block: 64px/);
  assert.match(css, /var\(--color-charcoal\)/);
});
