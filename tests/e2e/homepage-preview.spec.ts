import { expect, test } from "@playwright/test";

test("action-first prototype presents a professional page and one consistent start intent", async ({ page }) => {
  await page.goto("/homepage-preview");

  await expect(page).toHaveTitle(/Turn Your Résumé Into a Page You Can Share/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(
    page.getByRole("heading", { name: "Turn your résumé into a page you can share." }),
  ).toBeVisible();
  await expect(page.getByText("Add your résumé", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-ignore-guidance]").first()).toContainText(
    "ignore themes, statistics, PDFs, QR codes, and motion settings",
  );

  const primaryCta = page.getByTestId("homepage-primary-cta");
  await expect(primaryCta).toHaveAttribute(
    "href",
    "/signup?ref=homepage_observatory_primary&next=/create",
  );
  const startActions = page.locator("[data-start-action]");
  await expect(startActions).toHaveCount(4);
  expect(
    await startActions.evaluateAll((links) =>
      links.every(
        (link) =>
          link.textContent?.trim() === "Add my résumé" &&
          link.getAttribute("href")?.startsWith("/signup?") &&
          link.getAttribute("href")?.includes("next=/create"),
      ),
    ),
  ).toBe(true);

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
  await expect(motionToggle).toHaveAccessibleName("Pause motion");
  await motionToggle.click();
  await expect(motionToggle).toHaveAttribute("data-motion-paused", "true");
  await expect(motionToggle).toHaveAccessibleName("Resume motion");
  await expect(motionToggle).toContainText("Resume motion");
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);
  await motionToggle.click();
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("prototype defines a three-step path, a minimum path, and a stopping point", async ({ page }) => {
  await page.goto("/homepage-preview");

  const workflow = page.locator("[data-default-workflow]");
  const steps = workflow.locator("[data-workflow-step]");
  await expect(workflow.getByRole("list", { name: "The simplest way to start" })).toBeVisible();
  await expect(steps).toHaveCount(3);
  expect(
    await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-workflow-step"))),
  ).toEqual(["upload", "review", "publish"]);
  await expect(steps.nth(0)).toContainText("Add your résumé");
  await expect(steps.nth(1)).toContainText("Check 3 essentials");
  await expect(steps.nth(2)).toContainText("Publish one link");

  const shortcut = page.locator("[data-overwhelmed-shortcut]");
  await expect(shortcut).toContainText("Minimum path · required checks only");
  await expect(shortcut.locator("[data-stopping-point]")).toContainText("You can stop here");
  await expect(shortcut.locator("[data-ignore-guidance]")).toContainText(
    "Ignore colors, page styles, statistics, PDFs, QR codes, and advanced settings for now",
  );
  const shortcutLink = shortcut.getByRole("link", { name: "Add my résumé" });
  await expect(shortcutLink).toHaveAttribute(
    "href",
    "/signup?ref=homepage_overwhelmed_start&next=/create",
  );
  const shortcutBox = await shortcutLink.boundingBox();
  expect(shortcutBox).not.toBeNull();
  expect(shortcutBox!.height).toBeGreaterThanOrEqual(44);
});

test("one-page style chooser uses equal controls and supports keyboard selection", async ({ page }) => {
  await page.goto("/homepage-preview");

  const gallery = page.locator("[data-living-gallery]");
  await gallery.scrollIntoViewIfNeeded();
  const directions = gallery.getByRole("radiogroup", {
    name: "Choose a style for the same professional page",
  });
  const clear = directions.getByRole("radio", { name: /Clear and structured/ });
  const calm = directions.getByRole("radio", { name: /Calm and focused/ });

  const optionBoxes = await directions.getByRole("radio").evaluateAll((options) =>
    options.map((option) => {
      const box = option.getBoundingClientRect();
      return { height: Math.round(box.height), width: Math.round(box.width) };
    }),
  );
  expect(new Set(optionBoxes.map(({ height }) => height)).size).toBe(1);
  expect(new Set(optionBoxes.map(({ width }) => width)).size).toBe(1);

  await clear.focus();
  await page.keyboard.press("ArrowRight");

  await expect(calm).toBeFocused();
  await expect(calm).toHaveAttribute("aria-checked", "true");
  await expect(calm).toHaveAttribute("data-theme-id", "nocturne");
  await expect(gallery.locator("[data-style-preview]")).toHaveAttribute("data-theme-id", "nocturne");
  await expect(gallery.locator("[data-style-preview]")).toContainText(
    "Calm and focused · Nocturne",
  );
  await expect(page.getByTestId("observatory-status")).toContainText("Nocturne selected");
});

test("style chooser transfers motion to one stable Living Resume preview", async ({ page }) => {
  await page.goto("/homepage-preview");

  const gallery = page.locator("[data-living-gallery]");
  await gallery.scrollIntoViewIfNeeded();
  const preview = gallery.locator("[data-style-preview]");

  const expressive = gallery.getByRole("radio", { name: /Creative and expressive[\s\S]*Atelier/ });
  await expressive.click();

  await expect(expressive).toHaveAttribute("aria-checked", "true");
  await expect(preview).toHaveAttribute("data-theme-id", "atelier");
  await expect(preview.locator('[data-theme-id="atelier"]')).toBeVisible();
  await expect(preview.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  const galleryCanvasWrapperBox = await preview.locator("[data-homepage-theme-canvas]").boundingBox();
  const galleryCanvasBox = await preview.locator('[data-theme-renderer-status="ready"]').boundingBox();
  expect(galleryCanvasWrapperBox).not.toBeNull();
  expect(galleryCanvasBox).not.toBeNull();
  expect(Math.abs(galleryCanvasWrapperBox!.height - galleryCanvasBox!.height)).toBeLessThanOrEqual(2);
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(1);
  await expect(page.locator("[data-homepage-theme-canvas]")).toHaveCount(1);
  await expect(gallery.locator("[data-gallery-card]")).toHaveCount(5);

  const galleryMotionToggle = page.getByTestId("gallery-motion-toggle");
  await expect(galleryMotionToggle).toBeVisible();
  await galleryMotionToggle.click();
  await expect(galleryMotionToggle).toHaveAttribute("data-motion-paused", "true");
  await expect(galleryMotionToggle).toHaveAccessibleName("Resume motion");
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);
});

test("tablet layout stacks before minimum columns can overflow", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto("/homepage-preview");

  const copy = page.getByRole("heading", {
    name: "Turn your résumé into a page you can share.",
  });
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
  await expect(
    page.getByRole("heading", { name: "Turn your résumé into a page you can share." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add. Check. Publish." })).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Choose a style—or keep this one." }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Your page is useful before you use every tool." }),
  ).toBeAttached();

  const warmDirection = page
    .locator("[data-living-gallery]")
    .getByRole("radio", { name: /Practical and grounded/ });
  await warmDirection.click();
  await expect(warmDirection).toHaveAttribute("aria-checked", "true");
  await expect(warmDirection).toHaveAttribute("data-theme-id", "quarry");

  const styleRail = page.locator("[data-living-gallery]").getByRole("radiogroup", {
    name: "Choose a style for the same professional page",
  });
  expect(
    await styleRail.evaluate((rail) => rail.scrollWidth > rail.clientWidth),
  ).toBe(true);

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("normal actions stay separate from reference, statistics, and advanced tools", async ({ page }) => {
  await page.goto("/homepage-preview");

  const laterSection = page.locator("#use-later");
  await expect(
    laterSection.getByRole("heading", { name: "Your page is useful before you use every tool." }),
  ).toBeAttached();

  const everyday = laterSection.locator("[data-everyday-actions]");
  await expect(everyday.locator('[data-action-priority="normal"]')).toHaveCount(2);
  await expect(everyday).toContainText("Update your page");
  await expect(everyday).toContainText("Share your link");

  const optionalTools = laterSection.locator("[data-optional-tools]");
  await expect(optionalTools).not.toHaveAttribute("open", "");
  await optionalTools.getByText("Optional tools", { exact: true }).click();
  await expect(optionalTools).toHaveAttribute("open", "");
  await expect(optionalTools.locator("[data-later-tool]")).toHaveCount(5);
  await expect(optionalTools.locator("[data-reference-tools]"))
    .toContainText("Examples and guides");
  await expect(optionalTools.locator('[data-tool-kind="statistics"]')).toContainText(
    "Wait until your link has been shared for 7 days",
  );
  await expect(optionalTools.locator('[data-tool-kind="advanced"]')).toContainText(
    "The starting settings already work",
  );
  await expect(optionalTools.locator('[data-action-priority="primary"]')).toHaveCount(0);
});

test("production homepage remains isolated from the prototype", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("[data-action-first]")).toHaveCount(0);
  await expect(page.locator("[data-home-observatory]")).toHaveCount(0);
});
