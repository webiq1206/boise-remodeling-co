import { expect, test, type Page } from "@playwright/test";

/* The standard estimator is a guided, one-step-at-a-time wizard. These tests
   drive the real flow through its shipped test ids:

   project -> address -> layout -> size -> upgrades -> [bathrooms] -> [kitchen]
   -> finish -> details -> review -> your details (gate) -> result

   The lead API is stubbed so the result reveal is deterministic and does not
   depend on a database being reachable from the test runner. */

async function openCalculator(page: Page) {
  await page.route("**/api/estimate-lead", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/#calculator");
  await page.locator("#calculator").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("wizard-progress")).toBeVisible();
}

/** Advance one step with the sticky Continue control. */
async function next(page: Page) {
  await page.getByTestId("wizard-next").click();
}

/** Walk from the first step to the review screen for a kitchen project. */
async function walkToReview(page: Page) {
  // Step: project (required selection unlocks Continue).
  await expect(page.getByTestId("wizard-next")).toBeDisabled();
  await page.getByTestId("calc-tab-kitchen").click();
  await expect(page.getByTestId("wizard-next")).toBeEnabled();
  await next(page);

  // Step: address (optional) - skip it.
  await next(page);

  // Step: layout (required).
  await page.locator('[data-testid^="calc-subtype-"]').first().click();
  await next(page);

  // Step: size (slider carries a default).
  await expect(page.getByTestId("calc-sqft-slider")).toBeVisible();
  await next(page);

  // Step: upgrades (optional).
  await next(page);

  // Step: finish (required).
  await page.locator('[data-testid^="calc-finish-"]').first().click();
  await next(page);

  // Step: details (assumptions confirm) -> review.
  await next(page);

  await expect(page.getByTestId("step-heading")).toHaveText("Review your project");
}

/** From the review screen, pass the gate and reach the result. */
async function passGate(page: Page) {
  await page.getByTestId("review-continue").click();
  await page.getByTestId("gate-input-name").fill("Test User");
  await page.getByTestId("gate-input-email").fill("test@example.com");
  await page.getByTestId("gate-input-phone").fill("2085551234");
  await page.getByTestId("gate-input-address").fill("123 Main St, Boise ID 83702");
  await page.getByTestId("gate-continue").click();
  await expect(page.getByTestId("estimate-range")).toBeVisible({ timeout: 15_000 });
}

test.describe("Standard estimator - guided wizard (desktop)", () => {
  test("opens on the project step with the primary action disabled and no price", async ({ page }) => {
    await openCalculator(page);

    await expect(page.getByTestId("step-heading")).toHaveText("Choose your project");
    await expect(page.getByTestId("wizard-sticky-nav")).toBeVisible();
    await expect(page.getByTestId("wizard-next")).toBeDisabled();
    await expect(page.locator('[data-testid="estimate-range"]')).toHaveCount(0);
  });

  test("walks the full flow to a structured result", async ({ page }) => {
    await openCalculator(page);
    await walkToReview(page);

    // Every entered answer is grouped on the review screen with its own Edit.
    await expect(page.getByTestId("review-project")).toBeVisible();
    await expect(page.getByTestId("review-layout")).toBeVisible();
    await expect(page.getByTestId("review-finish")).toBeVisible();
    await expect(page.getByTestId("review-project-edit")).toBeVisible();

    await passGate(page);

    // Result overview + editable-scope + sticky next-step actions.
    await expect(page.getByTestId("edit-scope-cta-inline")).toBeVisible();
    await expect(page.getByTestId("result-sticky-actions")).toBeVisible();
    await expect(page.getByTestId("result-primary")).toBeVisible();
    await expect(page.getByTestId("edit-scope-cta")).toBeVisible();
    await expect(page.getByTestId("result-print")).toBeVisible();
    await expect(page.getByTestId("result-start-over")).toBeVisible();

    // The estimate is persisted for the consultation handoff.
    const stored = await page.evaluate(() => sessionStorage.getItem("brc_estimate"));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored as string);
    expect(parsed.project).toBe("kitchen");
    expect(parsed.priceLow).toBeGreaterThan(0);
  });

  test("Back preserves earlier answers", async ({ page }) => {
    await openCalculator(page);

    await page.getByTestId("calc-tab-kitchen").click();
    await next(page);
    await expect(page.getByTestId("step-heading")).toHaveText("Your property address");

    await page.getByTestId("wizard-back").click();
    await expect(page.getByTestId("step-heading")).toHaveText("Choose your project");
    // The earlier choice is still selected - nothing was lost moving backward.
    await expect(page.getByTestId("calc-tab-kitchen")).toHaveAttribute("aria-selected", "true");
  });

  test("editing a section from review returns straight back to review", async ({ page }) => {
    await openCalculator(page);
    await walkToReview(page);

    // Jump straight to the finish step from the review screen.
    await page.getByTestId("review-finish-edit").click();
    await expect(page.getByTestId("step-heading")).toHaveText("Finish level");

    // Choosing a finish and continuing lands back on review, not the next step.
    await page.locator('[data-testid^="calc-finish-"]').first().click();
    await next(page);
    await expect(page.getByTestId("step-heading")).toHaveText("Review your project");
  });

  test("scope stays editable after the result is shown", async ({ page }) => {
    await openCalculator(page);
    await walkToReview(page);
    await passGate(page);

    await page.getByTestId("edit-scope-cta-inline").click();
    await expect(page.getByTestId("step-heading")).toHaveText("Review your project");

    // Returning through the flow recalculates and shows the result again.
    await page.getByTestId("review-continue").click();
    await expect(page.getByTestId("estimate-range")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Standard estimator - guided wizard (mobile)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("sticky nav is present with large touch targets", async ({ page }) => {
    await openCalculator(page);

    const nav = page.getByTestId("wizard-sticky-nav");
    await expect(nav).toBeVisible();

    // Primary action meets the 44px minimum touch-target height.
    const box = await page.getByTestId("wizard-next").boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
