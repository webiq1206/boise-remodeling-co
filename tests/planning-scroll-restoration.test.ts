import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual component while effects wait until after a pointer gesture.
// This reproduces slow initial hydration without replacing its scroll behavior.
function scrollComponent(initialPath = "/", initialHash = "") {
  let pathname = initialPath, hook = 0, scrollY = 0;
  const refs: Array<{ current: unknown }> = [], dependencies: unknown[][] = [];
  const pending: Array<() => void> = [], listeners = new Map<string, () => void>();
  const calls: Array<{ top: number; left: number; behavior: string }> = [];
  const exports: any = {};
  const effect = (callback: () => void, deps: unknown[]) => {
    const index = hook++, previous = dependencies[index];
    if (!previous || deps.some((value, i) => value !== previous[i])) pending.push(callback);
    dependencies[index] = deps;
  };
  const location = { pathname: initialPath, hash: initialHash };
  vm.runInNewContext(ts.transpileModule(readFileSync("components/ScrollToTop.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, {
    exports,
    require(name: string) {
      if (name === "react") return {
        useRef(value: unknown) { const index = hook++; return refs[index] ||= { current: value }; },
        useEffect: effect, useLayoutEffect: effect,
      };
      if (name === "next/navigation") return { usePathname: () => pathname };
      throw new Error(`Unexpected dependency ${name}`);
    },
    window: {
      location,
      addEventListener(name: string, callback: () => void) { listeners.set(name, callback); },
      removeEventListener(name: string) { listeners.delete(name); },
      scrollTo(options: { top: number; left: number; behavior: string }) { calls.push({ ...options }); scrollY = options.top; },
    },
  });
  return {
    calls,
    render(path = pathname, hash = location.hash) { pathname = path; location.pathname = path; location.hash = hash; hook = 0; exports.ScrollToTop(); },
    flush() { for (const callback of pending.splice(0)) callback(); },
    move(top: number) { scrollY = top; },
    popstate(path: string) { location.pathname = path; listeners.get("popstate")?.(); },
    get scrollY() { return scrollY; },
  };
}

test("delayed initial hydration preserves the quote-link pointer position", () => {
  const app = scrollComponent();
  app.render(); app.move(1213); app.flush();
  assert.equal(app.scrollY, 1213, "pointerup must see the same scroll position as pointerdown");
  assert.deepEqual(app.calls, []);
});

test("initial hash and restored history positions survive hydration", () => {
  for (const [hash, top] of [["#planning", 480], ["", 860]] as const) {
    const app = scrollComponent("/services/kitchen-remodeling", hash);
    app.move(top); app.render(); app.flush();
    assert.equal(app.scrollY, top);
    assert.deepEqual(app.calls, []);
  }
});

test("ordinary later routes reset once and same-path renders preserve scroll", () => {
  const app = scrollComponent();
  app.render(); app.flush(); app.move(900);
  app.render("/estimate"); app.flush();
  assert.equal(app.scrollY, 0);
  assert.deepEqual(app.calls, [{ top: 0, left: 0, behavior: "instant" }]);
  app.move(480); app.render("/estimate"); app.flush();
  assert.equal(app.scrollY, 480);
  assert.equal(app.calls.length, 1);
});

test("a later hash destination keeps native anchor positioning", () => {
  const app = scrollComponent();
  app.render(); app.flush(); app.move(680);
  app.render("/services", "#kitchens"); app.flush();
  assert.equal(app.scrollY, 680);
  assert.deepEqual(app.calls, []);
});

test("Back and Forward retain the browser's restored position", () => {
  const app = scrollComponent();
  app.render(); app.flush();
  app.render("/estimate"); app.flush();
  app.move(1213); app.popstate("/"); app.render("/"); app.flush();
  assert.equal(app.scrollY, 1213);
  app.move(480); app.popstate("/estimate"); app.render("/estimate"); app.flush();
  assert.equal(app.scrollY, 480);
  assert.equal(app.calls.length, 1, "history restoration must not invoke route scroll reset");
});
