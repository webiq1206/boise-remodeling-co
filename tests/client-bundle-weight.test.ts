import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// The root layout's client components shipped every blog post (about 850KB of
// source, 292KB gzipped) on every page because ConsultationForm imported one
// numeral component through the components/marketing barrel, which re-exports
// BlogPostLayout. Walk the static client import graph from the layout and
// make sure the blog content is not reachable from it again.
const ROOT = process.cwd();
function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2));
  else if (spec.startsWith('@shared/')) base = path.join(ROOT, 'shared', spec.slice(8));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  if (existsSync(base) && statSync(base).isFile()) return base;
  const stem = base.replace(/\.(tsx?|jsx?)$/, '');
  for (const ext of ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
    if (existsSync(stem + ext)) return stem + ext;
  }
  return null;
}
function staticImports(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const out: string[] = [];
  for (const m of source.matchAll(/(?:import|export)\s+(type\s+)?[^'";]*?from\s*['"]([^'"]+)['"]|^\s*import\s+['"]([^'"]+)['"]/gm)) {
    if (m[1]) continue;
    const resolved = resolveImport(file, m[2] ?? m[3]);
    if (resolved && /\.(tsx?|jsx?)$/.test(resolved)) out.push(resolved);
  }
  return out;
}

test('no client component in the root layout reaches the blog post content', () => {
  const layout = path.join(ROOT, 'app/layout.tsx');
  const clientEntries = staticImports(layout).filter((file) => /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')));
  assert.ok(clientEntries.some((f) => f.endsWith('components/Providers.tsx')), 'Providers is a client entry');
  const seen = new Map<string, string | null>(clientEntries.map((f) => [f, null]));
  const queue = [...clientEntries];
  const blocked = ['shared/content/allBlogPosts.ts', 'shared/blogContent.ts', 'components/marketing/index.ts'];
  while (queue.length) {
    const file = queue.shift()!;
    const rel = path.relative(ROOT, file);
    if (blocked.includes(rel)) {
      const chain: string[] = [];
      for (let at: string | null = file; at; at = seen.get(at) ?? null) chain.unshift(path.relative(ROOT, at));
      assert.fail(`root layout client bundle reaches ${rel}: ${chain.join(' -> ')}`);
    }
    for (const dep of staticImports(file)) {
      if (!seen.has(dep)) { seen.set(dep, file); queue.push(dep); }
    }
  }
});

// A "use client" module re-exported from a barrel becomes a client reference
// for every server page that imports the barrel, used or not. BlogIndexClient
// (every blog post, for the index filter) in components/marketing/index.ts put
// about 286KB gzipped on /about, /contact and every other page using Section.
test('client modules re-exported by the marketing barrel do not carry the blog posts', () => {
  const barrel = path.join(ROOT, 'components/marketing/index.ts');
  const reexports = staticImports(barrel).filter((file) => /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')));
  assert.ok(reexports.some((f) => f.endsWith('components/marketing/Section.tsx')));
  for (const entry of reexports) {
    const seen = new Set([entry]);
    const queue = [entry];
    while (queue.length) {
      const file = queue.shift()!;
      assert.notEqual(path.relative(ROOT, file), 'shared/blogContent.ts', `${path.relative(ROOT, entry)} reaches the blog posts`);
      for (const dep of staticImports(file)) if (!seen.has(dep)) { seen.add(dep); queue.push(dep); }
    }
  }
});

// The blog index filter imported BLOG_POSTS on the client, so /blog shipped
// every article body (about 290KB gzipped) and desktop pages paid for it again
// when the header link prefetched /blog. The index now receives card summaries
// as props. No client module anywhere may import the post content.
function clientFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, name.name);
    if (name.isDirectory()) { if (name.name !== 'node_modules') out.push(...clientFiles(rel)); continue; }
    if (!/\.(tsx?|jsx?)$/.test(name.name)) continue;
    if (/^\s*['"]use client['"]/.test(readFileSync(path.join(ROOT, rel), 'utf8'))) out.push(path.join(ROOT, rel));
  }
  return out;
}

test('no client module reaches the blog post content', () => {
  const entries = ['app', 'components', 'hooks', 'lib'].filter((d) => existsSync(path.join(ROOT, d))).flatMap(clientFiles);
  assert.ok(entries.some((f) => f.endsWith('components/marketing/BlogIndexClient.tsx')));
  for (const entry of entries) {
    const seen = new Map<string, string | null>([[entry, null]]);
    const queue = [entry];
    while (queue.length) {
      const file = queue.shift()!;
      if (path.relative(ROOT, file) === 'shared/blogContent.ts') {
        const chain: string[] = [];
        for (let at: string | null = file; at; at = seen.get(at) ?? null) chain.unshift(path.relative(ROOT, at));
        assert.fail(`client module reaches the blog posts: ${chain.join(' -> ')}`);
      }
      for (const dep of staticImports(file)) if (!seen.has(dep)) { seen.set(dep, file); queue.push(dep); }
    }
  }
});
