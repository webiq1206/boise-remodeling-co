import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '../components/Footer.tsx';
import { generateLocalBusinessSchema, generateOrganizationSchema, generateServiceSchema } from '../lib/schema.ts';
import { BUSINESS_INFO } from '../lib/seo.ts';
import { getExternalProfileUrls, P5_FACEBOOK_URL, P5_GBP_URL } from '../shared/gbpProfile.ts';

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

// Owner decision 2026-11-01: P5 Home Co's one Google Business Profile joins the
// parent organization's sameAs beside its Facebook page, and never this brand's.
test('the P5 Google profile sits on the parent organization only', () => {
  assert.equal(P5_GBP_URL, 'https://www.google.com/search?kgmid=/g/11ntl1t7dc');
  const before = process.env.NEXT_PUBLIC_GBP_URL;
  process.env.NEXT_PUBLIC_GBP_URL = P5_GBP_URL;
  try {
    for (const node of [generateLocalBusinessSchema(), generateOrganizationSchema()] as any[]) {
      assert.deepEqual(node.parentOrganization.sameAs, [P5_FACEBOOK_URL, P5_GBP_URL]);
      assert.equal(JSON.stringify(node.sameAs ?? []).includes('kgmid'), false);
    }
    assert.equal(BUSINESS_INFO.sameAs.includes(P5_GBP_URL), false);
    assert.equal(getExternalProfileUrls().includes(P5_GBP_URL), false, 'NEXT_PUBLIC_GBP_URL never feeds the brand sameAs');
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_GBP_URL;
    else process.env.NEXT_PUBLIC_GBP_URL = before;
  }
});
