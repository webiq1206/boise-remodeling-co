/**
 * MF-v23-1 follow-up: C10 keyboard clearance at 320 / 360 / 390 with 280px sim.
 * Relies on useKeyboardInset (no manual wizard.bottom override).
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3414";
const OUT =
  process.env.OUT_DIR ||
  "/cursor/stores/bc-fa516634-edf2-495a-8bfc-8fbd19e4966b/media/boise-remodeling-co/design-review/v2-3-mf2";

const PHONES = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
];

const KB = 280;

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function installKeyboard(page) {
  await page.evaluate((height) => {
    document.getElementById("fake-keyboard")?.remove();
    const kb = document.createElement("div");
    kb.id = "fake-keyboard";
    kb.setAttribute("aria-hidden", "true");
    Object.assign(kb.style, {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "0",
      height: `${height}px`,
      background: "#d8d4cc",
      borderTop: "1px solid #2c302f33",
      zIndex: "200",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      font: "600 14px/1 system-ui,sans-serif",
      color: "#2c302f",
      pointerEvents: "none",
    });
    kb.textContent = "On-screen keyboard (simulated)";
    document.body.appendChild(kb);
  }, KB);
}

async function removeKeyboard(page) {
  await page.evaluate(() => document.getElementById("fake-keyboard")?.remove());
}

async function measureField(page, field, viewport) {
  return page.evaluate(
    ({ fieldName, vpName, vh, kb }) => {
      const wizard = document.querySelector(".estimate-wizard");
      const bar = document.querySelector(".estimate-wizard-bar");
      const next = document.querySelector('[data-testid="estimate-wizard-next"]');
      const input =
        document.querySelector(`input[name="${fieldName}"]`) ||
        document.querySelector(`textarea[name="${fieldName}"]`);
      const usable = vh - kb;
      const barRect = bar?.getBoundingClientRect();
      const nextRect = next?.getBoundingClientRect();
      const inputRect = input?.getBoundingClientRect();
      const insetAttr = wizard?.getAttribute("data-keyboard-inset") || null;
      const insetCss = wizard
        ? getComputedStyle(wizard).getPropertyValue("--ew-keyboard-inset").trim()
        : null;
      const barBehindKb = barRect ? barRect.bottom > usable + 0.5 : true;
      const nextBehindKb = nextRect ? nextRect.bottom > usable + 0.5 : true;
      const inputBehindKb = inputRect ? inputRect.bottom > usable + 0.5 : true;
      const bodyOverflow = getComputedStyle(document.body).overflow;
      const htmlOverflow = getComputedStyle(document.documentElement).overflow;
      return {
        field: `${fieldName}@${vpName}`,
        viewport: vpName,
        keyboardInsetAttr: insetAttr,
        keyboardInsetCss: insetCss,
        usable,
        barTop: barRect?.top ?? null,
        barBottom: barRect?.bottom ?? null,
        nextBottom: nextRect?.bottom ?? null,
        inputBottom: inputRect?.bottom ?? null,
        inputTop: inputRect?.top ?? null,
        barBehindKb,
        nextBehindKb,
        inputBehindKb,
        bodyOverflow,
        htmlOverflow,
        estimateKeyboard: document.body.dataset.estimateKeyboard || null,
      };
    },
    { fieldName: field, vpName: viewport.name, vh: viewport.height, kb: KB },
  );
}

async function fillThroughProject(page) {
  await page.locator('.estimate-choice-card', { hasText: "Kitchen" }).click();
  await page.locator('[data-testid="estimate-wizard-next"]').click();
  await page.waitForTimeout(250);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const keyboardGeometry = [];
  const notes = [];

  try {
    for (const vp of PHONES) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        hasTouch: true,
        isMobile: true,
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/estimate`, { waitUntil: "networkidle", timeout: 120000 });
      await page.waitForSelector('[data-testid="estimate-request-wizard"]', { timeout: 60000 });
      await page.waitForTimeout(300);
      await shot(page, `estimate-step1-project-${vp.name}`);

      await fillThroughProject(page);

      // Name
      await page.locator('input[name="name"]').click();
      await page.waitForTimeout(150);
      await installKeyboard(page);
      await page.waitForTimeout(150);
      keyboardGeometry.push(await measureField(page, "name", vp));
      await shot(page, `estimate-step2-keyboard-name-${vp.name}`);
      await removeKeyboard(page);
      await page.fill('input[name="name"]', "Sam Reviewer");
      await page.locator('[data-testid="estimate-wizard-next"]').click();
      await page.waitForTimeout(250);

      // Phone
      await page.locator('input[name="phone"]').click();
      await page.waitForTimeout(150);
      await installKeyboard(page);
      await page.waitForTimeout(150);
      keyboardGeometry.push(await measureField(page, "phone", vp));
      await shot(page, `estimate-step3-keyboard-phone-${vp.name}`);
      await removeKeyboard(page);
      await page.fill('input[name="phone"]', "2085550199");
      await page.locator('[data-testid="estimate-wizard-next"]').click();
      await page.waitForTimeout(250);

      // Email
      await page.locator('input[name="email"]').click();
      await page.waitForTimeout(150);
      await installKeyboard(page);
      await page.waitForTimeout(150);
      keyboardGeometry.push(await measureField(page, "email", vp));
      await shot(page, `estimate-step4-keyboard-email-${vp.name}`);
      await removeKeyboard(page);
      await page.fill('input[name="email"]', "sam@example.com");
      await page.locator('[data-testid="estimate-wizard-next"]').click();
      await page.waitForTimeout(250);

      // Details note
      await page.locator('textarea[name="message"]').click();
      await page.waitForTimeout(150);
      await installKeyboard(page);
      await page.waitForTimeout(150);
      keyboardGeometry.push(await measureField(page, "message", vp));
      await shot(page, `estimate-step5-keyboard-note-${vp.name}`);
      await removeKeyboard(page);
      await page.fill(
        'textarea[name="message"]',
        "Kitchen remodel in Meridian, keep layout, new cabinets.",
      );
      await page.locator('[data-testid="estimate-wizard-next"]').click();
      await page.waitForTimeout(250);
      await shot(page, `estimate-step6-review-${vp.name}`);

      if (vp.name === "390x844") {
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="estimate-request-wizard"]');
        await page.waitForTimeout(350);
        const restored = await page.locator(".estimate-wizard-step-title").textContent();
        notes.push({ persist: { restoredTitle: restored?.trim() } });
        await shot(page, "estimate-persist-after-refresh-390x844");
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const fails = keyboardGeometry.filter(
    (row) => row.barBehindKb || row.nextBehindKb || row.inputBehindKb,
  );
  const summary = {
    sha: process.env.GIT_SHA || null,
    capturedAt: new Date().toISOString(),
    method:
      "Playwright Chromium. Keyboard: focus + data-estimate-keyboard + 280px fixed overlay. Inset from useKeyboardInset (no manual bottom override).",
    keyboardPass: fails.length === 0,
    failCount: fails.length,
    fails: fails.map((f) => ({
      field: f.field,
      inset: f.keyboardInsetAttr,
      barTop: f.barTop,
      usable: f.usable,
      barBehindKb: f.barBehindKb,
      nextBehindKb: f.nextBehindKb,
      inputBehindKb: f.inputBehindKb,
    })),
    keyboardGeometry,
    notes,
  };

  await writeFile(path.join(OUT, "measurements.json"), JSON.stringify(summary, null, 2));
  await writeFile(
    path.join(OUT, "README.md"),
    [
      "# Boise Remodeling Co — MF2 C10 keyboard evidence",
      "",
      `**Captured:** ${summary.capturedAt}`,
      `**SHA:** ${summary.sha || "(set GIT_SHA)"}`,
      `**Pass:** ${summary.keyboardPass}`,
      "",
      "Required sizes 320×568, 360×640, 390×844 with 280px keyboard sim on name / phone / email / note.",
      "",
    ].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        out: OUT,
        keyboardPass: summary.keyboardPass,
        failCount: summary.failCount,
        fails: summary.fails,
        sample: keyboardGeometry.filter((g) => g.field.startsWith("name@")),
      },
      null,
      2,
    ),
  );
  if (!summary.keyboardPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
