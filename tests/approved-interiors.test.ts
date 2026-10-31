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
  for (const layer of ['./family.css', './approved-system.css', './approved-interiors.css', './audit-accessibility.css']) assert.ok(styles.includes(layer), layer);
  assert.ok(styles.indexOf('./family.css') < styles.indexOf('./approved-system.css'));
  assert.ok(styles.indexOf('./approved-system.css') < styles.indexOf('./approved-interiors.css'));
  assert.ok(styles.indexOf('./approved-interiors.css') < styles.indexOf('./audit-accessibility.css'), 'accessibility corrections override the presentation layers');
});

// Phase 1 (2026-10-31): one label for one action. The hero's second
// "Request a consultation" link to the same form was removed on purpose.
test('contact hero has one Request a quote action to the visit form', () => {
  const source = read('app/contact/page.tsx');
  assert.match(source, /<div className="interior-contact-actions"><InteriorEstimateLink label=\{CTA_PRIMARY\} href="\/contact#consult"\/><\/div>/);
  assert.doesNotMatch(source, /Request a consultation/);
  assert.doesNotMatch(source, /Get my online estimate|href="\/estimate"/);
  assert.match(read('components/approved/InteriorLayout.tsx'), /href='\/estimate'/);
});
