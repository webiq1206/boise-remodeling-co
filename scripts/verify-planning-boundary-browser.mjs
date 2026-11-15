import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, webkit } from "@playwright/test";

const base = new URL(process.env.PLANNING_TEST_BASE_URL || "http://127.0.0.1:34864");
if (!["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) || !["http:", "https:"].includes(base.protocol) || base.username || base.password) throw new Error("Use a loopback preview");
const output = path.resolve(process.env.PLANNING_EVIDENCE_DIR || "test-results/planning-boundary");
mkdirSync(output, { recursive: true });
const engine = process.env.PLANNING_TEST_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch({ headless: true, ...(engine === chromium && process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ["--no-sandbox"] } : {}) });
const context = await browser.newContext({ serviceWorkers: "block", reducedMotion: "reduce" });
const records = [], errors = [], blocked = [];
let mode = "normal", releaseOld, releaseHang, pricingRequests = 0;
await context.route("**/*", async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin === base.origin && url.pathname === "/api/planning-range" && request.method() === "POST") {
    pricingRequests++;
    if (mode === "fail") return route.fulfill({ status: 503, json: { error: "Synthetic isolated outage" } });
    if (mode === "hang") {
      await new Promise(resolve => { releaseHang = resolve; });
      return route.fulfill({ status: 200, json: { priceLow: 111, priceHigh: 222 } }).catch(() => {});
    }
    if (mode === "race" && request.postDataJSON().project === "kitchen") {
      await new Promise(resolve => { releaseOld = resolve; });
      return route.fulfill({ status: 200, json: { priceLow: 111, priceHigh: 222 } }).catch(() => {});
    }
    return route.continue();
  }
  const asset = /\.(?:png|webp|jpe?g|svg|ico|woff2?|ttf|css|js|map)$/.test(url.pathname);
  if (url.origin === base.origin && request.method() === "GET" && !url.pathname.startsWith("/api/") && (url.pathname === "/" || url.pathname.startsWith("/_next/") || asset)) return route.continue();
  blocked.push({ method: request.method(), path: url.origin === base.origin ? url.pathname : "external" });
  return route.abort();
});
await context.routeWebSocket("**/*", socket => socket.close());
const waitRange = page => page.waitForFunction(() => { const element = document.querySelector("[data-testid=planning-figure]"); return element && element.getAttribute("aria-busy") !== "true" && element.textContent.startsWith("$"); });
try {
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base.href, { waitUntil: "networkidle", timeout: 180000 });
  await waitRange(page);
  const card = page.getByTestId("planning-step"), figure = page.getByTestId("planning-figure");
  await card.scrollIntoViewIfNeeded();
  const start = await figure.innerText();
  assert.equal(start, "$57.9k to $64.1k");
  records.push({ state: "initial", range: start });

  mode = "fail";
  await card.getByRole("radio", { name: "Bathroom", exact: true }).check();
  await page.waitForFunction(() => document.querySelector("[data-testid=planning-figure]")?.textContent === "Range unavailable");
  assert.equal(await figure.innerText(), "Range unavailable");
  assert.equal(await card.getByRole("button", { name: "Try range again", exact: true }).isVisible(), true);
  await page.screenshot({ path: path.join(output, "error-390x844.png"), fullPage: false });
  records.push({ state: "failure", noStaleRange: true });
  mode = "normal";
  await card.getByRole("button", { name: "Try range again", exact: true }).click();
  await waitRange(page);
  assert.equal(await figure.innerText(), "$24.9k to $27.6k");
  records.push({ state: "retry", range: await figure.innerText() });

  mode = "hang";
  await card.getByRole("radio", { name: "Kitchen", exact: true }).check();
  await page.waitForFunction(() => document.querySelector("[data-testid=planning-figure]")?.textContent === "Range unavailable");
  assert.ok(releaseHang, "the timeout branch actually had a pending request");
  releaseHang();
  mode = "normal";
  await card.getByRole("button", { name: "Try range again", exact: true }).click();
  await waitRange(page);
  assert.equal(await figure.innerText(), start);
  records.push({ state: "timeout-recovery", range: await figure.innerText() });
  await card.getByRole("radio", { name: "Bathroom", exact: true }).check();
  await waitRange(page);

  mode = "race";
  const oldRequest = page.waitForRequest(request => request.url() === new URL("/api/planning-range", base).href && request.postDataJSON().project === "kitchen");
  await card.getByRole("radio", { name: "Kitchen", exact: true }).check();
  await oldRequest;
  for (let i = 0; !releaseOld && i < 100; i++) await page.waitForTimeout(10);
  assert.ok(releaseOld, "the delayed request was observed");
  await card.getByRole("radio", { name: "Bathroom", exact: true }).check();
  await waitRange(page);
  releaseOld();
  await page.waitForTimeout(250);
  assert.equal(await figure.innerText(), "$24.9k to $27.6k", "an old response must not replace the current selection");
  records.push({ state: "late-response", range: await figure.innerText() });
  mode = "normal";
  const beforeDebounce = pricingRequests;
  await card.evaluate(element => {
    const option = value => element.querySelector(`input[type=radio][value="${value}"]`);
    option("kitchen").click(); option("bathroom").click(); option("kitchen").click();
  });
  await waitRange(page);
  await page.waitForTimeout(250);
  assert.equal(await figure.innerText(), start);
  assert.equal(pricingRequests - beforeDebounce, 1, "rapid selections are debounced into one request");
  records.push({ state: "debounce", requests: pricingRequests - beforeDebounce });

  for (const [project, bathroomCount, priceLow, priceHigh] of [
    ["whole-home", 1, 289000, 320000], ["whole-home", 2, 313000, 346000],
    ["adu", 0, 172000, 190000], ["adu", 1, 196000, 216000],
  ]) {
    const response = await context.request.post(new URL("/api/planning-range", base).href, { data: { project, finish: "mid-range", sqft: 1800, refinements: { bathroomCount } } });
    // ADUs use the supported size bounds, but are priced per dwelling.
    if (project === "adu") { assert.equal(response.status(), 400); continue; }
    assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), { priceLow, priceHigh });
  }
  for (const [bathroomCount, priceLow, priceHigh] of [[0, 172000, 190000], [1, 196000, 216000]]) {
    const response = await context.request.post(new URL("/api/planning-range", base).href, { data: { project: "adu", finish: "mid-range", sqft: 600, refinements: { bathroomCount } } });
    assert.equal(response.status(), 200); assert.deepEqual(await response.json(), { priceLow, priceHigh });
  }
  records.push({ state: "real-endpoint-credit-parity", cases: 4 });
  const signatures = ["P5 Cost Database 2026.xlsx (Master sheet)", "Door hardware install / replace, per door (labor)", "Jared Brost: unified overhead instruction, September 10, 2026"];
  for (const [name, headers] of [["public-home.html", {}], ["public-home.rsc", { RSC: "1" }]]) {
    const response = await context.request.get(base.href, { headers });
    assert.equal(response.status(), 200);
    const body = await response.text();
    for (const signature of signatures) assert.ok(!body.includes(signature), `${name} exposed private pricing`);
    assert.ok(!/annualOverhead["']?\s*:\s*(?:420000|42e4)\b/.test(body));
    writeFileSync(path.join(output, name), body);
    records.push({ state: name, contentType: response.headers()["content-type"], bytes: Buffer.byteLength(body) });
  }
  const publicRange = await context.request.post(new URL("/api/planning-range", base).href, { data: { project: "kitchen", finish: "mid-range", sqft: 250 } });
  const publicValue = await publicRange.json();
  assert.deepEqual(publicValue, { priceLow: 57900, priceHigh: 64100 });
  writeFileSync(path.join(output, "public-range.json"), JSON.stringify(publicValue));
  assert.deepEqual(errors, []);
  assert.ok(!blocked.some(request => request.method !== "GET"), "no lead, customer or analytics submission was attempted");
  await page.screenshot({ path: path.join(output, "recovered-390x844.png"), fullPage: false });
  await page.close();
  mode = "fail";
  const failureLayouts = [];
  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [844, 390]]) {
    const failurePage = await context.newPage();
    await failurePage.setViewportSize({ width, height });
    await failurePage.goto(base.href, { waitUntil: "networkidle" });
    await failurePage.evaluate(() => sessionStorage.removeItem("brc-home-planning-v1"));
    await failurePage.reload({ waitUntil: "networkidle" });
    await failurePage.waitForFunction(() => document.querySelector("[data-testid=planning-figure]")?.textContent === "Range unavailable");
    const failureCard = failurePage.getByTestId("planning-step");
    for (let step = 0; step < 5; step++) {
      await failurePage.evaluate(() => { const card = document.querySelector("[data-testid=planning-step]"), header = document.querySelector("[data-family-header]"); scrollBy({ top: card.getBoundingClientRect().top - header.getBoundingClientRect().height - 16, behavior: "instant" }); });
      await failurePage.waitForTimeout(100);
      const geometry = await failureCard.evaluate(card => {
        const rect = card.getBoundingClientRect(), header = document.querySelector("[data-family-header]").getBoundingClientRect();
        const back = [...card.querySelectorAll("button")].find(button => button.textContent === "Back"), navigation = back.parentElement.getBoundingClientRect();
        return { width: innerWidth, height: innerHeight, visualWidth: visualViewport?.width, visualHeight: visualViewport?.height, top: rect.top, bottom: rect.bottom, headerBottom: header.bottom, navigationTop: navigation.top, documentWidth: document.documentElement.scrollWidth };
      });
      assert.ok(geometry.top >= geometry.headerBottom - 1, `error ${width}x${height} step ${step}: header obstruction`);
      assert.ok(geometry.bottom <= (width < 640 ? geometry.navigationTop : height) + 1, `error ${width}x${height} step ${step}: step overflow`);
      assert.ok(geometry.documentWidth <= width + 1, `error ${width}x${height} step ${step}: horizontal overflow`);
      assert.equal(await failureCard.getByRole("button", { name: "Try range again", exact: true }).isVisible(), width < 1024);
      failureLayouts.push({ step, requested: { width, height }, actual: geometry });
      await failurePage.screenshot({ path: path.join(output, `error-step-${step}-${width}x${height}.png`) });
      if (step < 4) await failureCard.getByRole("button", { name: "Next", exact: true }).click();
    }
    await failurePage.close();
  }
  records.push({ state: "all-error-steps", captures: failureLayouts.length });
  writeFileSync(path.join(output, "report.json"), JSON.stringify({ browser: browser.version(), engine: process.env.PLANNING_TEST_BROWSER || "chromium", viewport: { width: 390, height: 844 }, emulation: true, records, failureLayouts, pageErrors: errors, blocked }, null, 2));
  console.log(JSON.stringify({ passed: records.length, states: records.map(record => record.state), blockedRequests: blocked.length }));
} finally { await browser.close(); }
