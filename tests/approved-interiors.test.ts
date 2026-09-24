import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');
const inventory: { route: string; file: string; seoSignature: string }[] = JSON.parse(read('docs/interior-route-audit.json'));
const printer = ts.createPrinter({ removeComments: true });

function seoSignature(source: string, file: string) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const nodes: string[] = [];
  function visit(node: ts.Node) {
    const protectedFunction = ts.isFunctionDeclaration(node) && ['generateMetadata', 'generateStaticParams'].includes(node.name?.text ?? '');
    const metadata = ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText(tree) === 'metadata');
    const schema = ts.isCallExpression(node) && /^(generate\w*Schema|buildPageMetadata|catalogMetadata|catalogDescription)$/.test(node.expression.getText(tree));
    if (protectedFunction || metadata || schema) nodes.push(printer.printNode(ts.EmitHint.Unspecified, node, tree).replace(/\s+/g, ' '));
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return createHash('sha256').update(JSON.stringify(nodes.sort())).digest('hex');
}

for (const entry of inventory) {
  test(`${entry.route}: interior layout and preserved SEO contract`, () => {
    const source = read(entry.file);
    assert.match(source, /<InteriorPage\b/);
    assert.equal(seoSignature(source, entry.file), entry.seoSignature, 'Intentional SEO changes require reviewing and updating the route audit.');
  });
}

test('interior CSS follows the original family and system layers', () => {
  const source = read('app/layout.tsx');
  const styles = [...source.matchAll(/import ['"](.+\.css)['"]/g)].map(match => match[1]);
  assert.equal(styles.at(-1), './approved-interiors.css');
  assert.ok(styles.indexOf('./family.css') < styles.indexOf('./approved-system.css'));
});

test('contact hero puts the estimate before the secondary consultation link', () => {
  const source = read('app/contact/page.tsx');
  assert.match(source, /interior-contact-actions[\s\S]*?<InteriorEstimateLink\s*\/>[\s\S]*?href="#consult"/);
  assert.match(read('components/approved/InteriorLayout.tsx'), /href="\/estimate"/);
});
