import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const denied = new Set(["shared/estimateEngine.ts", "shared/planningBookPrice.ts", "server/services/planningRangeEndpoint.ts", "lib/p5/priceBookData.ts", "lib/p5/pricing.ts"]);
function imports(file: string) {
  const source = ts.createSourceFile(file, readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const values: string[] = [];
  const resolve = (spec: string) => {
    const base = spec.startsWith("@/") ? path.join(root, spec.slice(2)) : spec.startsWith(".") ? path.resolve(root, path.dirname(file), spec) : null;
    if (!base) return;
    const resolved = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map(extension => base + extension).find(candidate => existsSync(candidate) && /\.(?:ts|tsx)$/.test(candidate));
    if (resolved) values.push(path.relative(root, resolved));
  };
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly) continue;
      if (clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.every(item => item.isTypeOnly)) continue;
    } else if (statement.isTypeOnly) continue;
    resolve(statement.moduleSpecifier.text);
  }
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require")) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) resolve(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return values;
}

function clientEntries(dir: string): string[] {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return clientEntries(file);
    if (!/\.(?:ts|tsx)$/.test(file)) return [];
    const source = ts.createSourceFile(file, readFileSync(path.join(root, file), "utf8"), ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
      if (statement.expression.text === "use client") return [file];
    }
    return [];
  });
}

test("every public planning presentation consumer keeps private pricing outside its runtime import graph", () => {
  const entries = ["app", "components", "hooks"].flatMap(clientEntries);
  assert.ok(entries.length > 100, "scan every current client entry point");
  const seen = new Set<string>();
  const visit = (file: string, chain: string[]) => {
    assert.ok(!denied.has(file), [...chain, file].join(" → "));
    if (seen.has(file)) return;
    seen.add(file);
    for (const dependency of imports(file)) visit(dependency, [...chain, file]);
  };
  for (const entry of entries) visit(entry, []);
  assert.ok(seen.has("shared/estimatePresentation.ts"));
});

test("private planning modules reject browser execution", async () => {
  const prior = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true });
  try { await assert.rejects(import("../shared/planningBookPrice.ts"), /server only/); }
  finally {
    if (prior) Object.defineProperty(globalThis, "window", prior);
    else delete (globalThis as { window?: unknown }).window;
  }
});
