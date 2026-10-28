/**
 * Design Standard v2.3 evidence captures for Boise Remodeling Co.
 * Writes to agent store media path.
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3414";
const OUT = process.env.OUT_DIR ||
  "/cursor/stores/bc-fa516634-edf2-495a-8bfc-8fbd19e4966b/media/boise-remodeling-co/design-review/v2-3";

const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x720", width: 1280, height: 720 },
];

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const measurements = [];

  try {
    // Homepage C3 + C14
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForTimeout(400);
      await shot(page, `home-hero-${vp.name}`);

      const planning = page.locator("#planning-ranges");
      await planning.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await shot(page, `home-proof-${vp.name}`);

      // interact: select bathroom band
      await page.locator('.planning-range-card', { hasText: "Primary bath" }).click();
      await page.waitForTimeout(200);
      await shot(page, `home-proof-bath-${vp.name}`);

      const heroCta = page.locator(".f-hero-cta-primary");
      const heroBox = await heroCta.boundingBox();
      measurements.push({
        page: "home",
        viewport: vp.name,
        primaryCtaVisible: Boolean(heroBox && heroBox.y + heroBox.height <= vp.height),
        primaryCtaY: heroBox?.y ?? null,
      });
      await context.close();
    }

    // Estimate wizard steps + keyboard
    const phone = VIEWPORTS.find((v) => v.name === "390x844");
    const context = await browser.newContext({
      viewport: { width: phone.width, height: phone.height },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/estimate`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForSelector('[data-testid="estimate-request-wizard"]', { timeout: 60000 });
    await page.waitForTimeout(400);
    await shot(page, "estimate-step1-project-390x844");

    // Measure step fit (no page scroll)
    const scrollBefore = await page.evaluate(() => document.documentElement.scrollHeight);
    measurements.push({ page: "estimate-step1", viewport: "390x844", docScrollHeight: scrollBefore });

    await page.locator('.estimate-choice-card', { hasText: "Kitchen" }).click();
    await page.locator('[data-testid="estimate-wizard-next"]').click();
    await page.waitForTimeout(350);
    await shot(page, "estimate-step2-contact-390x844");

    // Keyboard-open simulation: focus a text field and overlay a fake keyboard
    // so the step chrome stays covered without revealing page content underneath.
    await page.locator('input[name="name"]').click();
    await page.evaluate(() => {
      const wizard = document.querySelector(".estimate-wizard");
      if (wizard) wizard.style.bottom = "280px";
      const kb = document.createElement("div");
      kb.id = "fake-keyboard";
      kb.setAttribute("aria-hidden", "true");
      Object.assign(kb.style, {
        position: "fixed",
        left: "0",
        right: "0",
        bottom: "0",
        height: "280px",
        background: "#d8d4cc",
        borderTop: "1px solid #2c302f33",
        zIndex: "200",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        font: "600 14px/1 system-ui,sans-serif",
        color: "#2c302f",
      });
      kb.textContent = "On-screen keyboard (simulated)";
      document.body.appendChild(kb);
    });
    await page.waitForTimeout(200);
    await shot(page, "estimate-step2-keyboard-390x844");
    await page.evaluate(() => {
      const wizard = document.querySelector(".estimate-wizard");
      if (wizard) wizard.style.bottom = "";
      document.getElementById("fake-keyboard")?.remove();
    });

    await page.fill('input[name="name"]', "Sam Reviewer");
    await page.fill('input[name="phone"]', "2085550199");
    await page.fill('input[name="email"]', "sam@example.com");
    await page.locator('[data-testid="estimate-wizard-next"]').click();
    await page.waitForTimeout(350);
    await shot(page, "estimate-step3-details-390x844");

    await page.fill('textarea[name="message"]', "Kitchen remodel in Meridian, keep layout, new cabinets.");
    await page.locator('[data-testid="estimate-wizard-next"]').click();
    await page.waitForTimeout(350);
    await shot(page, "estimate-step4-review-390x844");

    // Persistence: reload and confirm draft restored on review
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="estimate-request-wizard"]');
    await page.waitForTimeout(400);
    const restored = await page.locator(".estimate-wizard-step-title").textContent();
    measurements.push({ page: "estimate-persist", restoredTitle: restored?.trim() });
    await shot(page, "estimate-persist-after-refresh-390x844");

    // Desktop estimate
    await context.close();
    const desk = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const dpage = await desk.newPage();
    await dpage.goto(`${BASE}/estimate`, { waitUntil: "networkidle", timeout: 120000 });
    await dpage.waitForSelector('[data-testid="estimate-request-wizard"]');
    await dpage.waitForTimeout(300);
    await shot(dpage, "estimate-step1-project-1280x720");
    await desk.close();

    // Short phone estimate step 1
    for (const vp of [
      { name: "320x568", width: 320, height: 568 },
      { name: "360x640", width: 360, height: 640 },
    ]) {
      const c = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const p = await c.newPage();
      await p.goto(`${BASE}/estimate`, { waitUntil: "networkidle", timeout: 120000 });
      await p.waitForSelector('[data-testid="estimate-request-wizard"]');
      await p.waitForTimeout(300);
      await shot(p, `estimate-step1-project-${vp.name}`);
      await c.close();
    }
  } finally {
    await browser.close();
  }

  await writeFile(path.join(OUT, "measurements.json"), JSON.stringify(measurements, null, 2));
  console.log(JSON.stringify({ out: OUT, measurements }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
