/**
 * The homepage price slider is retired (owner, 21 November 2026: one source
 * of prices). The planning range slider ran this site's own older engine and
 * showed figures that differed from the P5 instant estimator, so the homepage
 * now shows a short instant estimate block in its place: no figure, one link
 * per project the estimator prices for this brand, and the path to a person
 * beside it. PlanningRangeExplorer.tsx stays in the repository, unmounted.
 *
 * These tests render the real homepage body and check the block, and check
 * that no page on the site still links to the slider's anchor.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// CSS modules have no meaning in node: each class name reads as its own key.
(Module as unknown as { _extensions: Record<string, (module: { exports: unknown }) => void> })._extensions[".css"] = (module) => {
  module.exports = new Proxy({}, { get: (_, key) => (key === "__esModule" ? undefined : String(key)) });
};

let html = "";
let block = "";
let blockStart = -1;
let HOME_ESTIMATOR_PROJECTS: ReadonlyArray<{ id: string; label: string }> = [];
let estimatorHref: (project?: string | null) => string = () => "";
let CTA_REQUEST = "";
let REQUEST_PATH = "";
let phoneHref = "";

test.before(async () => {
  // tsx compiles JSX to React.createElement, as the other render tests rely on.
  (globalThis as { React?: typeof React }).React = React;
  const { ApprovedHome } = await import("../components/approved/ApprovedHome.tsx");
  const cta = await import("../shared/ctaCopy.ts");
  const { SITE_CONFIG } = await import("../shared/siteConfig.ts");
  ({ HOME_ESTIMATOR_PROJECTS, estimatorHref, CTA_REQUEST, REQUEST_PATH } = cta);
  phoneHref = SITE_CONFIG.phoneHref;
  html = renderToStaticMarkup(React.createElement(ApprovedHome, { hero: null }));
  blockStart = html.indexOf('id="estimate-by-project"');
  block = html.slice(blockStart, html.indexOf("</section>", blockStart));
});

test("the homepage renders no price slider", () => {
  assert.doesNotMatch(readFileSync("components/approved/ApprovedHome.tsx", "utf8"), /<PlanningRangeExplorer\b|import \{PlanningRangeExplorer\}/);
  assert.doesNotMatch(html, /type="range"/, "no range input");
  assert.doesNotMatch(html, /planning-range-explorer|data-testid="planning-figure"|Modeled planning range/);
  // The component itself is kept, unmounted, as the owner asked.
  assert.match(readFileSync("components/approved/PlanningRangeExplorer.tsx", "utf8"), /export function PlanningRangeExplorer/);
});

test("the block links the instant estimate for every project, with the path to a person", () => {
  assert.ok(blockStart > 0, "the block is on the homepage");
  assert.ok(html.indexOf('id="estimate-by-project"') > html.indexOf('id="our-work"'), "same place as the slider: after the gallery");
  assert.ok(html.indexOf('id="estimate-by-project"') < html.indexOf('id="how-we-build"'), "and before the process");
  assert.deepEqual(
    HOME_ESTIMATOR_PROJECTS.map((p) => p.id),
    ["kitchen-remodel", "bathroom-remodel", "basement-finish", "whole-home", "flooring", "interior-paint", "addition"],
    "the remodeling brand's projects in p5-home-co brands.ts",
  );
  for (const project of HOME_ESTIMATOR_PROJECTS) {
    assert.ok(block.includes(`href="${estimatorHref(project.id)}"`), project.id);
    assert.equal(estimatorHref(project.id), `/instant-estimate?project=${project.id}`);
    assert.ok(block.includes(`>${project.label}<`), project.label);
  }
  assert.match(block, /href="\/instant-estimate"[^>]*>Not sure yet</, "an eighth tile opens the estimator's own chooser");
  assert.equal((block.match(/data-estimator-project=/g) ?? []).length, 8, "seven projects and the chooser: two full rows of four");
  assert.ok(block.includes(`href="${REQUEST_PATH}"`) && block.includes(`>${CTA_REQUEST}<`), "Request a quote beside it");
  assert.ok(block.includes(`href="${phoneHref}"`), "and the phone");
  assert.match(block, /fam-btn fam-btn--secondary fam-btn--lg fam-btn--on-dark/, "family button styles");
  assert.ok(block.includes('id="planning-ranges"'), "old outside links still land on the block");
});

test("the block shows no figure and follows the wording rules", () => {
  const text = block.replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(text, /\$\s?\d|\d{1,3},\d{3}/, "no price");
  assert.doesNotMatch(text, /instant\s+(?:quote|bid)|final price|firm price|guaranteed/i);
  assert.doesNotMatch(text, /\b\d+\s+(?:minutes?|seconds?)\b/i);
  assert.equal(text.includes(String.fromCharCode(0x2014)), false, "no em dash");
  assert.doesNotMatch(text, /near me/i);
});

test("no page on the site links to the retired slider anchor", () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.(tsx?|mjs|txt|json)$/.test(name) && /(?:["'`(}]|\.co)\/#(?:planning-ranges|calculator)\b/.test(readFileSync(file, "utf8"))) offenders.push(file);
    }
  };
  for (const dir of ["app", "components", "shared", "lib", "public"]) walk(dir);
  assert.deepEqual(offenders, []);
});
