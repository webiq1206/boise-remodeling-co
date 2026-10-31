import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '../components/Footer.tsx';
import { generateLocalBusinessSchema, generateOrganizationSchema, generateServiceSchema } from '../lib/schema.ts';
import { BUSINESS_INFO } from '../lib/seo.ts';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

// Owner decision 2026-10-31: no Boise Remodeling Co Facebook or Instagram exists.
const GONE = /(facebook|instagram)\.com\/boiseremodeling/i;

test('no rendered link or schema names the non-existent brand profiles', () => {
  assert.equal(GONE.test(renderToStaticMarkup(React.createElement(Footer))), false);
  assert.equal(BUSINESS_INFO.sameAs.some((url) => GONE.test(url)), false);
  for (const node of [generateLocalBusinessSchema(), generateOrganizationSchema()]) {
    assert.equal(GONE.test(JSON.stringify(node)), false);
    assert.deepEqual((node as any).parentOrganization.name, 'P5 Home Co');
    assert.equal((node as any).parentOrganization.url, 'https://p5homeco.com');
  }
  const provider = (generateServiceSchema('Kitchen remodel', 'Kitchen remodeling') as any).provider;
  assert.equal(provider.parentOrganization.name, 'P5 Home Co');
  const root = new URL('..', import.meta.url).pathname;
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(n) ? [p] : [];
  });
  for (const file of ['app', 'components', 'lib', 'shared'].flatMap((d) => walk(join(root, d)))) {
    assert.equal(GONE.test(readFileSync(file, 'utf8')), false, file);
  }
});
