/**
 * The central P5 estimator on this site (owner decision, 13 November 2026).
 *
 * There is ONE estimator. It runs on p5homeco.com and this site frames it at
 * /instant-estimate. These tests pin that the page exists and frames it for
 * this brand, that the central CTA leads there, that the frame component holds
 * no pricing code, and that a service the estimator cannot price keeps its
 * "Request a quote" action.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { FAMILY_BRAND } from "../lib/familyBrand.ts";
import { SERVICES } from "../shared/contentData.ts";
import {
  CTA_PRIMARY,
  CTA_PRIMARY_SHORT,
  CTA_REQUEST,
  ESTIMATOR_PATH,
  ESTIMATOR_PROJECT_BY_SERVICE,
  REQUEST_PATH,
  articleCtaDestination,
  estimatorHref,
  primaryCtaForService,
} from "../shared/ctaCopy.ts";
import { getSiteUrlGroups } from "../lib/siteUrls.ts";

const read = (file: string) => readFileSync(file, "utf8");
const PAGE = "app/instant-estimate/page.tsx";
const FRAME = "components/estimator/EstimatorFrame.tsx";
const ANALYTICS = "components/estimator/EstimatorAnalytics.tsx";

test("/instant-estimate exists and frames the estimator for this brand", () => {
  assert.ok(existsSync(PAGE), "the page exists");
  const page = read(PAGE);
  assert.equal(FAMILY_BRAND.id, "remodeling");
  assert.match(page, /import EstimatorFrame from "@\/components\/estimator\/EstimatorFrame";/);
  assert.match(page, /<EstimatorFrame\s+brand="remodeling"\s+project=\{project\}\s+title="[^"]+"\s+headerOffset=\{HEADER_OFFSET\}\s*\/>/);
  assert.match(page, /<EstimatorAnalytics \/>/);
  // The project comes from the query string and is validated before it reaches the frame.
  assert.match(page, /const PROJECT_ID = \/\^\[a-z0-9-\]\{1,40\}\$\/;/);
  assert.match(page, /PROJECT_ID\.test\(requested\) \? requested : null/);
  // The header offset is the family header's desktop height token.
  assert.match(page, /const HEADER_OFFSET = 76;/);
  assert.match(read("styles/family-tokens.css"), /--header-height: 76px;/);
  // One short h1, the canonical, and the path to a person.
  assert.equal(page.match(/<h1\b/g)?.length, 1);
  assert.match(page, /alternates: \{ canonical: buildCanonical\(ESTIMATOR_PATH\) \}/);
  assert.match(page, /href=\{REQUEST_PATH\}/);
  assert.match(page, /<BusinessPhoneLink/);
  // It is not under /estimate, so it keeps the normal header and footer.
  assert.equal(ESTIMATOR_PATH, "/instant-estimate");
  assert.equal(ESTIMATOR_PATH.startsWith("/estimate"), false);
});

test("the central CTA leads to /instant-estimate", () => {
  assert.equal(FAMILY_BRAND.cta.href, "/instant-estimate");
  assert.equal(FAMILY_BRAND.cta.href, ESTIMATOR_PATH);
  assert.equal(FAMILY_BRAND.cta.label, CTA_PRIMARY_SHORT);
  assert.equal(CTA_PRIMARY, "Get an instant estimate");
  assert.equal(estimatorHref("../../admin"), ESTIMATOR_PATH, "a malformed project never reaches the link");
  const urls = getSiteUrlGroups().flatMap((group) => group.entries.map((entry) => entry.path));
  assert.ok(urls.includes(ESTIMATOR_PATH), "the page is in the sitemap inventory");
  assert.match(read("public/llms.txt"), /\/instant-estimate/);
});

test("the frame component only frames p5homeco.com and holds no pricing code", () => {
  const frame = read(FRAME);
  assert.match(frame, /const ESTIMATOR_ORIGIN = "https:\/\/p5homeco\.com";/);
  assert.match(frame, /\$\{ESTIMATOR_ORIGIN\}\/estimator\/embed\?/);
  const imports = [...frame.matchAll(/^import\s[^;]*?from\s+["']([^"']+)["'];/gm)].map((match) => match[1]);
  assert.deepEqual(imports, ["react"], "the frame imports React and nothing else");
  // Its header comment names what lives on p5homeco.com; the code itself prices nothing.
  const code = frame.replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(code, /estimateEngine|calculateEstimate|priceScope|costBook|shared\/costs|shared\/takeoff|lib\/p5|quickbooks|margin|\$\d/i);
  assert.doesNotMatch(code, /gtag|trackEvent|fbq/, "the frame sends nothing to analytics itself");
  // Neither estimator file may reach into this site's own pricing engines.
  for (const file of [FRAME, ANALYTICS, PAGE]) {
    assert.doesNotMatch(read(file), /from\s+["'][^"']*(?:estimateEngine|shared\/costs|shared\/takeoff|shared\/re10|lib\/p5\/|server\/)[^"']*["']/, file);
  }
});

test("only estimator_completed counts as a lead, once per page view", () => {
  const analytics = read(ANALYTICS);
  assert.match(analytics, /^"use client";/);
  assert.match(analytics, /window\.addEventListener\(ESTIMATOR_EVENT, onEstimatorEvent\)/);
  assert.match(analytics, /const ESTIMATOR_EVENT = "p5-estimator-event";/);
  assert.match(analytics, /trackEvent\(detail\.name, params\);/);
  assert.match(analytics, /estimator_brand:/);
  assert.match(analytics, /estimator_project:/);
  assert.match(analytics, /const LEAD_EVENT = "estimator_completed";/);
  assert.match(analytics, /if \(detail\.name !== LEAD_EVENT \|\| leadSent\.current\) return;\s*leadSent\.current = true;\s*trackEvent\("generate_lead"/);
  assert.equal(analytics.match(/trackEvent\("generate_lead"/g)?.length, 1);
  // Owner, 13 November 2026: an estimator lead also reaches Google Ads, once, with the lead.
  assert.equal(analytics.match(/trackGoogleAdsLeadConversion\(/g)?.length, 1);
  assert.ok(analytics.indexOf("trackGoogleAdsLeadConversion(") > analytics.indexOf("leadSent.current = true;"), "the Ads conversion must sit behind the once-only lead guard");
  assert.match(analytics, /trackGoogleAdsLeadConversion\(\{ projectType: [^}]+\}, `instant:\$\{id\}`\)/);
  // Owner, 13 November 2026: the same finished estimate is a Meta Lead, once, behind the same guard,
  // sharing the lead's id and carrying a project category only.
  assert.equal(analytics.match(/trackMetaEvent\(/g)?.length, 1);
  assert.ok(analytics.indexOf("trackMetaEvent(") > analytics.indexOf("leadSent.current = true;"), "the Meta Lead must sit behind the once-only lead guard");
  assert.match(analytics, /trackMetaEvent\(\s*"Lead",\s*\{ content_name: [^}]+content_category: ESTIMATOR_LEAD_SOURCE \},\s*undefined,\s*`instant:\$\{id\}`,?\s*\)/);
  // The "instant:" key must not make the Ads helper send a second generate_lead.
  assert.doesNotMatch("instant:abc", /^(?:intake|estimator):/);
  assert.match(analytics, /const ESTIMATOR_LEAD_SOURCE = "instant_estimator";/);
  assert.match(analytics, /return null;/);
});

test("a service page opens the estimator on its project, and an unpriced service keeps Request a quote", () => {
  assert.deepEqual(ESTIMATOR_PROJECT_BY_SERVICE, {
    "kitchen-remodel": "kitchen-remodel",
    "bathroom-remodel": "bathroom-remodel",
    "whole-home-remodel": "whole-home",
    "basement-remodel": "basement-finish",
    "room-addition": "addition",
  });
  const slugs = SERVICES.map((service) => service.slug);
  for (const slug of Object.keys(ESTIMATOR_PROJECT_BY_SERVICE)) assert.ok(slugs.includes(slug), `${slug} is a real service`);
  assert.deepEqual(primaryCtaForService("kitchen-remodel"), {
    label: "Get an instant estimate",
    href: "/instant-estimate?project=kitchen-remodel",
    kind: "estimator",
    project: "kitchen-remodel",
  });
  assert.equal(primaryCtaForService("basement-remodel").href, "/instant-estimate?project=basement-finish");
  for (const slug of ["adu", "outdoor-living", "aging-in-place"]) {
    assert.ok(slugs.includes(slug), `${slug} is a real service`);
    assert.deepEqual(primaryCtaForService(slug), { label: CTA_REQUEST, href: REQUEST_PATH, kind: "request", project: null }, slug);
  }
  // Every service is decided one way or the other; a new service defaults to the request form.
  for (const slug of slugs) assert.ok(["estimator", "request"].includes(primaryCtaForService(slug).kind));
  assert.equal(primaryCtaForService("a-service-added-later").kind, "request");
  assert.deepEqual(primaryCtaForService(), { label: CTA_PRIMARY, href: ESTIMATOR_PATH, kind: "estimator", project: null });
  assert.equal(articleCtaDestination("outdoor-living"), "request");
  assert.equal(articleCtaDestination("kitchen-remodeling"), "estimator");
  const template = read("components/seo/LandingPageTemplate.tsx");
  assert.match(template, /const primaryCta = primaryCtaForService\(related\.serviceSlug\);/);
  assert.match(template, /<InteriorHeroActions serviceSlug=\{related\.serviceSlug\} \/>/);
});

test("the homepage sells the estimator near the top and keeps every existing tool", () => {
  const home = read("components/approved/ApprovedHome.tsx");
  assert.ok(home.indexOf("<InstantEstimateBand />") > home.indexOf("{hero}"));
  assert.ok(home.indexOf("<InstantEstimateBand />") < home.indexOf('id="services"'), "the band sits right under the hero");
  const band = read("components/approved/InstantEstimateBand.tsx");
  assert.match(band, /href=\{ESTIMATOR_PATH\}[^>]*>\{CTA_PRIMARY\}/);
  assert.match(band, /href=\{REQUEST_PATH\}>\{CTA_REQUEST\}/);
  assert.equal(band.match(/^  '[^']+',$/gm)?.length, 3, "three short benefits");
  // Nothing was unmounted: the planner, the short request and the chat assistant are still there.
  assert.match(home, /<PlanningRangeExplorer \/>/);
  assert.match(read("app/page.tsx"), /<HeroConversion \/>/);
  assert.match(read("app/layout.tsx"), /<AssistantWidget \/>/);
  assert.ok(existsSync("app/estimate/page.tsx"));
});

test("estimator wording never calls it a quote and never promises a time", () => {
  for (const file of [PAGE, "components/approved/InstantEstimateBand.tsx"]) {
    const visible = read(file).replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}|^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(visible, /instant\s+(?:quote|bid)|guaranteed\s+price|no contact information/i, file);
    assert.doesNotMatch(visible, /\b\d+\s+(?:minutes?|seconds?)\b/i, file);
    assert.equal(visible.includes(String.fromCharCode(0x2014)), false, `${file} has an em dash`);
    assert.doesNotMatch(visible, /near me/i, file);
  }
});
