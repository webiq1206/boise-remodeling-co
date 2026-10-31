import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { applyClarityMask, CLARITY_MASK_ATTRIBUTE, CLARITY_MASK_VALUE, clarityFieldMaskScript } from '../lib/clarityMask.ts';

// The homepage and contact page logged a React hydration attribute mismatch:
// the pre-hydration mask script rewrote the consultation form's "true" to
// "True" and stamped Radix's hidden mirror <select>, both before hydration.
// Forms keep rendering "true" (pinned in p5-call-text-click.test.ts).

type Node = {
  nodeType: number; tag: string; children: Node[]; attrs: Map<string, string>; parentElement: Node | null;
  matches: (s: string) => boolean; querySelectorAll: (s: string) => Node[];
  setAttribute: (n: string, v: string) => void; getAttribute: (n: string) => string | null;
};
function el(tag: string, children: Node[] = [], init: Record<string, string> = {}): Node {
  const attrs = new Map(Object.entries(init));
  const node: Node = {
    nodeType: 1, tag, children, attrs, parentElement: null,
    matches: (s) => s.split(',').map((p) => p.trim()).includes(tag),
    querySelectorAll(s) {
      const out: Node[] = [];
      const walk = (n: Node) => { for (const c of n.children) { if (c.matches(s)) out.push(c); walk(c); } };
      walk(node);
      return out;
    },
    setAttribute: (n, v) => { attrs.set(n, v); },
    getAttribute: (n) => attrs.get(n) ?? null,
  };
  for (const c of children) c.parentElement = node;
  return node;
}

test('a hidden mirror select inside a masked form is left as rendered', () => {
  const mirror = el('select', [], { 'aria-hidden': 'true' });
  const field = el('input');
  const form = el('form', [field, el('div', [mirror])], { [CLARITY_MASK_ATTRIBUTE]: CLARITY_MASK_VALUE });
  applyClarityMask(form);
  assert.equal(mirror.attrs.has(CLARITY_MASK_ATTRIBUTE), false, 'covered by the masked form');
  assert.equal(field.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);

  // Without a masked ancestor a hidden field is still stamped.
  const lone = el('select', [], { 'aria-hidden': 'true' });
  applyClarityMask(el('div', [lone]));
  assert.equal(lone.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
});

test('an element already masked in any casing is left exactly as rendered', () => {
  const form = el('form', [el('input')], { [CLARITY_MASK_ATTRIBUTE]: 'true' });
  applyClarityMask(form);
  assert.equal(form.attrs.get(CLARITY_MASK_ATTRIBUTE), 'true');
  assert.equal(form.children[0].attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
});

test('the inline script applies the same rules', () => {
  const script = clarityFieldMaskScript();
  assert.match(script, /coveredMirror/);
  assert.match(script, /toLowerCase\(\)==="true"/);
  assert.match(script, /function stamp\(node\)\{\s*if\(!masked\(node\)\)/);
  const source = readFileSync(new URL('../components/ConsultationForm.tsx', import.meta.url), 'utf8');
  assert.match(source, /<form\s+data-clarity-mask="true"/);
});
