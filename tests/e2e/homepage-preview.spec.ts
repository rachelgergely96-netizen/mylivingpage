import { expect, test } from "@playwright/test";

test("Observatory prototype presents a real Living Page and primary action", async ({ page }) => {
  await page.goto("/homepage-preview");

  await expect(page).toHaveTitle(/Living Page Observatory Prototype/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { name: "Your work shouldn't sit still." })).toBeVisible();
  await expect(page.getByText("One identity")).toBeVisible();

  const primaryCta = page.getByTestId("homepage-primary-cta");
  await expect(primaryCta).toHaveAttribute(
    "href",
    "/signup?ref=homepage_observatory_primary&next=/create",
  );

  const heroStage = page.locator("[data-observatory-live-page]");
  await expect(heroStage.locator('[data-theme-id="atlas"]')).toBeVisible();
  await expect(heroStage.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  const heroStageBox = await heroStage.boundingBox();
  const heroCanvasBox = await heroStage.locator('[data-theme-renderer-status="ready"]').boundingBox();
  expect(heroStageBox).not.toBeNull();
  expect(heroCanvasBox).not.toBeNull();
  expect(Math.abs(heroStageBox!.height - heroCanvasBox!.height)).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(1);

  const motionToggle = page.getByTestId("observatory-motion-toggle");
  await expect(motionToggle).toHaveAccessibleName("Pause ambient motion");
  await motionToggle.click();
  await expect(motionToggle).toHaveAttribute("aria-pressed", "true");
  await expect(motionToggle).toHaveAccessibleName("Pause ambient motion");
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);
  await motionToggle.click();
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("visual-direction rail supports keyboard selection and announces the world", async ({ page }) => {
  await page.goto("/homepage-preview");

  const observatory = page.locator("[data-home-observatory]");
  const directions = observatory.getByRole("radiogroup", { name: "Choose a visual direction" });
  const precise = directions.getByRole("radio", { name: /Precise/ });
  const cinematic = directions.getByRole("radio", { name: /Cinematic/ });

  await precise.focus();
  await page.keyboard.press("ArrowRight");

  await expect(cinematic).toBeFocused();
  await expect(cinematic).toHaveAttribute("aria-checked", "true");
  await expect(observatory.locator('[data-theme-id="nocturne"]')).toBeVisible();
  await expect(page.getByTestId("observatory-status")).toContainText("Nocturne selected");
});

test("Living Gallery transfers motion to one selected live world", async ({ page }) => {
  await page.goto("/homepage-preview");

  const gallery = page.locator("[data-living-gallery]");
  await gallery.scrollIntoViewIfNeeded();

  const expressive = gallery.getByRole("radio", { name: /Creative signal[\s\S]*Atelier/ });
  await expressive.click();

  await expect(expressive).toHaveAttribute("aria-checked", "true");
  await expect(expressive.locator('[data-theme-id="atelier"]')).toBeVisible();
  await expect(expressive.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  const galleryCanvasWrapperBox = await expressive.locator("[data-homepage-theme-canvas]").boundingBox();
  const galleryCanvasBox = await expressive.locator('[data-theme-renderer-status="ready"]').boundingBox();
  expect(galleryCanvasWrapperBox).not.toBeNull();
  expect(galleryCanvasBox).not.toBeNull();
  expect(Math.abs(galleryCanvasWrapperBox!.height - galleryCanvasBox!.height)).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(1);
  await expect(page.locator("[data-homepage-theme-canvas]")).toHaveCount(1);
  await expect(gallery.locator("[data-gallery-card]")).toHaveCount(5);

  const galleryMotionToggle = page.getByTestId("gallery-motion-toggle");
  await expect(galleryMotionToggle).toBeVisible();
  await galleryMotionToggle.click();
  await expect(galleryMotionToggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);
});

test("tablet layout stacks before minimum columns can overflow", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto("/homepage-preview");

  const copy = page.getByRole("heading", { name: "Your work shouldn't sit still." });
  const observatory = page.locator("[data-home-observatory]");
  await expect(copy).toBeVisible();
  await expect(observatory).toBeVisible();

  const copyBox = await copy.boundingBox();
  const observatoryBox = await observatory.boundingBox();
  expect(copyBox).not.toBeNull();
  expect(observatoryBox).not.toBeNull();
  expect(observatoryBox!.y).toBeGreaterThan(copyBox!.y);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("reduced motion and mobile preserve the complete prototype", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/homepage-preview");

  await expect(page.locator('[data-motion-state="reduced"]')).toBeVisible();
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your work shouldn't sit still." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "One career can feel many different ways." })).toBeAttached();
  await expect(page.getByRole("heading", { name: "The identity stays. The format moves." })).toBeAttached();

  const warmDirection = page
    .locator("[data-home-observatory]")
    .getByRole("radio", { name: /Grounded/ });
  await warmDirection.click();
  await expect(warmDirection).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("[data-observatory-live-page] [data-theme-id=\"quarry\"]")).toBeVisible();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("production homepage remains isolated from the prototype", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "Make your experience easier to understand and harder to forget.",
    }),
  ).toBeVisible();
  await expect(page.locator("[data-home-observatory]")).toHaveCount(0);
});
