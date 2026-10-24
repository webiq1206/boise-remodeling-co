import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import {
  applyClarityMask,
  CLARITY_FIELD_SELECTOR,
  CLARITY_MASK_ATTRIBUTE,
  CLARITY_MASK_VALUE,
  clarityFieldMaskScript,
} from '../lib/clarityMask';

type FakeNode = {
  nodeType: number;
  tag: string;
  children: FakeNode[];
  attrs: Map<string, string>;
  parentElement: FakeNode | null;
  matches: (selector: string) => boolean;
  querySelectorAll: (selector: string) => FakeNode[];
  setAttribute: (name: string, value: string) => void;
  getAttribute: (name: string) => string | null;
};

function el(tag: string, children: FakeNode[] = [], attrsInit: Record<string, string> = {}): FakeNode {
  const attrs = new Map<string, string>(Object.entries(attrsInit));
  const node: FakeNode = {
    nodeType: 1,
    tag,
    children,
    attrs,
    parentElement: null,
    matches(selector: string) {
      return selector.split(',').map((part) => part.trim()).includes(tag);
    },
    querySelectorAll(selector: string) {
      const found: FakeNode[] = [];
      const walk = (current: FakeNode) => {
        for (const child of current.children) {
          if (child.matches(selector)) found.push(child);
          walk(child);
        }
      };
      walk(node);
      return found;
    },
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    getAttribute(name: string) {
      return attrs.get(name) ?? null;
    },
  };
  for (const child of children) child.parentElement = node;
  return node;
}

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (path.endsWith('.tsx')) files.push(path);
  }
  return files;
}

function tagSlice(source: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === '\\') {
        i += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
}

test('every form field is masked for Clarity', () => {
  const consultation = el('form', [
    el('input'),
    el('textarea'),
    el('div', [el('select'), el('input')]),
    el('button'),
  ]);
  applyClarityMask(consultation);
  const fields = consultation.querySelectorAll(CLARITY_FIELD_SELECTOR);
  assert.equal(fields.length, 4);
  for (const field of fields) {
    assert.equal(field.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
  }
  assert.equal(consultation.children[3].attrs.has(CLARITY_MASK_ATTRIBUTE), false);

  const added = el('input');
  applyClarityMask(added);
  assert.equal(added.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);

  const script = clarityFieldMaskScript();
  assert.match(script, /data-clarity-mask/);
  assert.match(script, /"True"/);
  assert.equal(CLARITY_FIELD_SELECTOR, 'form,input,textarea,select');
  assert.match(script, /form,input,textarea,select/);
  assert.match(script, /MutationObserver/);
  assert.match(script, /addedNodes/);
  assert.match(script, /childList:true,subtree:true/);
  const observer = script.slice(script.indexOf('MutationObserver'));
  assert.equal(observer.includes('mask(document)'), false);

  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /clarity-field-mask/);
  assert.match(layout, /clarityFieldMaskScript\(\)/);

  const manifest = JSON.parse(readFileSync(new URL('../lib/p5/shared-manifest.json', import.meta.url), 'utf8')) as {
    files: Record<string, string>;
  };
  const shared = new Set(Object.keys(manifest.files));
  const root = new URL('..', import.meta.url).pathname;
  const misses: string[] = [];
  for (const file of [...walk(join(root, 'components')), ...walk(join(root, 'app'))]) {
    const rel = file.slice(root.length).replace(/^\/+/, '');
    if (shared.has(rel)) continue;
    const source = readFileSync(file, 'utf8');
    for (const tag of ['input', 'textarea', 'select']) {
      const re = new RegExp(`<${tag}\\b`, 'g');
      let match: RegExpExecArray | null;
      while ((match = re.exec(source))) {
        const slice = tagSlice(source, match.index);
        if (!slice.includes(`${CLARITY_MASK_ATTRIBUTE}="${CLARITY_MASK_VALUE}"`)) {
          misses.push(`${rel}: <${tag}`);
        }
      }
    }
  }
  assert.deepEqual(misses, []);

  const estimator = readFileSync(new URL('../components/P5Estimator.tsx', import.meta.url), 'utf8');
  assert.match(estimator, /<input\b/);
  assert.match(estimator, /<textarea\b/);
  assert.match(estimator, /<select\b/);
  assert.equal(shared.has('components/P5Estimator.tsx'), true);
});

test('a form ancestor is masked so echoed text and suggestions are covered', () => {
  const suggestions = el('ul');
  const form = el('form', [el('input', [], { type: 'text' }), suggestions]);
  applyClarityMask(form);
  assert.equal(form.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
  assert.equal(suggestions.attrs.has(CLARITY_MASK_ATTRIBUTE), false);

  const label = el('label', [el('input', [], { type: 'radio' })]);
  const wrapped = el('form', [label]);
  applyClarityMask(wrapped);
  assert.equal(wrapped.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
  assert.equal(label.attrs.has(CLARITY_MASK_ATTRIBUTE), false);
});

test('a checkbox with no masked ancestor masks its parent', () => {
  const already = el('input', [], { type: 'text' });
  const parent = el('div', [el('input', [], { type: 'checkbox' })]);
  applyClarityMask(parent);
  assert.equal(parent.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
  assert.equal(parent.children[0].attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
  assert.equal(already.attrs.has(CLARITY_MASK_ATTRIBUTE), false);

  for (const type of ['radio', 'range', 'button']) {
    const holder = el('div', [el('input', [], { type })]);
    applyClarityMask(holder);
    assert.equal(holder.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE, type);
  }
});

test('the consultation success panel is masked', () => {
  const source = readFileSync(new URL('../components/ConsultationForm.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('data-testid="consultation-success"');
  assert.ok(start > 0);
  const tag = source.slice(source.lastIndexOf('<', start), source.indexOf('>', start) + 1);
  assert.match(tag, /data-clarity-mask="True"/);
  assert.match(source, /submitted\.name\.split\(" "\)\[0\]/);
  assert.match(source, /submitted\?\.address/);
});

test('the assistant transcript container is masked', () => {
  const source = readFileSync(new URL('../components/assistant/AssistantWidget.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('ref={logRef}');
  assert.ok(start > 0);
  const tag = source.slice(source.lastIndexOf('<', start), source.indexOf('>', start) + 1);
  assert.match(tag, /role="log"/);
  assert.match(tag, /data-clarity-mask="True"/);
});

 test('unwrapped controls never mask the document body or html', () => {
  for (const tag of ['body', 'html']) {
   for (const type of ['checkbox', 'radio', 'range', 'button']) {
    for (const serialized of [false, true]) {
     const input = el('input', [], { type });
     const root = el(tag, [input]);
     if (serialized) runInNewContext(clarityFieldMaskScript(), { document: Object.assign(root, { documentElement: root }) });
     else applyClarityMask(root);
     assert.equal(root.attrs.has(CLARITY_MASK_ATTRIBUTE), false);
     assert.equal(input.attrs.get(CLARITY_MASK_ATTRIBUTE), CLARITY_MASK_VALUE);
    }
   }
  }
 });
