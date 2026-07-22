import { expect, test } from "@playwright/test";

const productionHomepage = "/";

test("production homepage makes the value and first action clear above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto(productionHomepage);

  await expect(page).toHaveTitle(/Turn Your Résumé Into a Page You Can Share/);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your résumé, alive on the web." }),
  ).toBeVisible();
  await expect(page.getByText("professional page you can update", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Product assurances")).toContainText("Completely free");
  await expect(page.getByLabel("Product assurances")).toContainText("Private until published");

  const primaryCta = page.getByTestId("homepage-primary-cta");
  await expect(primaryCta).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  await expect(page.getByRole("link", { name: "See it transform" })).toHaveAttribute(
    "href",
    "#live-product-story",
  );
  const primaryBox = await primaryCta.boundingBox();
  expect(primaryBox).not.toBeNull();
  expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(768);

  const startActions = page.locator("[data-start-action]");
  await expect(startActions).toHaveCount(4);
  expect(
    await startActions.evaluateAll((links) =>
      links.every(
        (link) =>
          link.textContent?.includes("Create my free page") &&
          link.getAttribute("href")?.startsWith("/signup?") &&
          link.getAttribute("href")?.includes("next=/create"),
      ),
    ),
  ).toBe(true);

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(4_500);
});

test("the transformation opens on the Living Page and keeps one truthful source visible", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  await expect(
    story.getByRole("heading", { name: "See one résumé become more useful." }),
  ).toBeVisible();

  const referral = story.getByRole("button", { name: /Living Page/ });
  const application = story.getByRole("button", { name: /Application PDF/ });
  const introduction = story.getByRole("button", { name: /Share Card \+ QR/ });
  await expect(story.locator("[data-story-moment]")).toHaveCount(3);
  await expect(referral).toHaveAttribute("aria-pressed", "true");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
  await expect(story.getByRole("heading", { name: "Professional page" })).toBeVisible();
  await expect(story.locator("[data-truth-source]")).toBeVisible();
  await expect(story.locator("[data-truth-destination]")).toBeVisible();
  await expect(story.locator("[data-transform-motion]")).toContainText("Same facts, new form");
  expect(
    await story.locator("[data-transform-motion] b").first().evaluate(
      (node) => getComputedStyle(node).animationName,
    ),
  ).toContain("truthTravel");

  await application.click();
  await expect(application).toHaveAttribute("aria-pressed", "true");
  await expect(story.getByRole("heading", { name: "ATS-ready PDF" })).toBeVisible();
  await expect(story.getByText("Avery-Morgan_Product-Lead.pdf")).toBeVisible();

  await introduction.click();
  await expect(introduction).toHaveAttribute("aria-pressed", "true");
  await expect(story.getByRole("heading", { name: "Share Card + QR" })).toBeVisible();
  const qr = story.getByRole("img", { name: "Sample QR code preview for the professional page" });
  await expect(qr).toBeVisible();

  for (const element of [
    story,
    introduction,
    story.locator('[data-story-output="introduction"] > article'),
    qr,
  ]) {
    expect(await element.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("0px");
  }
});

test("homepage defines an editable three-step path and a clear stopping point", async ({ page }) => {
  await page.goto(productionHomepage);

  const workflow = page.locator("[data-default-workflow]");
  const steps = workflow.locator("[data-workflow-step]");
  await expect(workflow.getByRole("list", { name: "The simplest way to start" })).toBeVisible();
  await expect(steps).toHaveCount(3);
  expect(
    await steps.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-workflow-step"))),
  ).toEqual(["upload", "review", "publish"]);
  await expect(steps.nth(0)).toContainText("Bring your résumé");
  await expect(steps.nth(1)).toContainText("Review the truth");
  await expect(steps.nth(1)).toContainText("Every inferred field stays editable");
  await expect(steps.nth(2)).toContainText("Share one living link");

  const shortcut = page.locator("[data-overwhelmed-shortcut]");
  await expect(shortcut).toContainText("A complete first session");
  await expect(shortcut.locator("[data-stopping-point]")).toContainText("You can stop there");
  const shortcutLink = shortcut.getByRole("link", { name: "Create my free page" });
  await expect(shortcutLink).toHaveAttribute(
    "href",
    "/signup?ref=landing_quick_start&next=/create",
  );
  const shortcutBox = await shortcutLink.boundingBox();
  expect(shortcutBox).not.toBeNull();
  expect(shortcutBox!.height).toBeGreaterThanOrEqual(44);
});

test("homepage explains readable content and the always-free promise without overclaiming", async ({ page }) => {
  await page.goto(productionHomepage);

  const searchReadiness = page.locator("[data-search-readiness]");
  await expect(
    searchReadiness.getByRole("heading", { name: "A memorable page. Recognizable information." }),
  ).toBeVisible();
  await expect(searchReadiness).toContainText("recruiters, ATS tools, search, and AI-assisted tools");
  await expect(searchReadiness.getByRole("heading", { name: "ATS-ready PDF" })).toBeVisible();
  await expect(
    searchReadiness.getByRole("heading", { name: "Readable by recruiters + AI tools" }),
  ).toBeVisible();
  await expect(
    searchReadiness.getByRole("heading", { name: "A page with its own address" }),
  ).toBeVisible();
  await expect(searchReadiness).toContainText(
    "No tool can guarantee how every system will parse or rank your résumé",
  );

  const freePromise = searchReadiness.locator("[data-free-promise]");
  await expect(
    freePromise.getByRole("heading", { name: "One Living Resume. Completely free. Always." }),
  ).toBeVisible();
  await expect(freePromise).toContainText("No card or subscription required");
  await expect(freePromise).toContainText("No trial. No hidden fees.");
});

test("the five-theme rail updates the real Living Page preview immediately", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  const chooser = story.locator("[data-story-style-chooser]");
  await chooser.scrollIntoViewIfNeeded();
  await expect(chooser).toContainText("59 living themes");
  await expect(chooser).toContainText("Your information stays the same");

  const stageBox = await story.locator("[data-story-stage]").boundingBox();
  const chooserBox = await chooser.boundingBox();
  expect(stageBox).not.toBeNull();
  expect(chooserBox).not.toBeNull();
  expect(chooserBox!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);

  const directions = chooser.getByRole("radiogroup", {
    name: "Choose a style for the Living Page above",
  });
  const calm = directions.getByRole("radio", { name: /Calm and focused/ });
  await expect(directions.getByRole("radio")).toHaveCount(5);
  await calm.click();

  await expect(calm).toHaveAttribute("aria-checked", "true");
  await expect(story.getByRole("button", { name: /Living Page/ }))
    .toHaveAttribute("aria-pressed", "true");
  const livingOutput = story.locator("[data-story-living-output]");
  await expect(livingOutput).toHaveAttribute("data-theme-id", "nocturne");
  await expect(livingOutput.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  await expect(chooser.locator("[data-style-selection-status]"))
    .toContainText("Calm and focused · Nocturne");

  await story.getByRole("button", { name: /Share Card \+ QR/ }).click();
  await expect(story.getByRole("img", { name: /Sample QR code/ })).toBeVisible();
  await story.getByRole("button", { name: /Living Page/ }).click();
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "nocturne");
});

test("theme controls are equal and support roving keyboard selection", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  const chooser = story.locator("[data-story-style-chooser]");
  await chooser.scrollIntoViewIfNeeded();
  const directions = chooser.getByRole("radiogroup", {
    name: "Choose a style for the Living Page above",
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
  await expect(calm).toHaveAttribute("tabindex", "0");
  await expect(clear).toHaveAttribute("tabindex", "-1");
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "nocturne");

  await page.keyboard.press("End");
  const expressive = directions.getByRole("radio", { name: /Creative and expressive/ });
  await expect(expressive).toBeFocused();
  await expect(expressive).toHaveAttribute("aria-checked", "true");
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "atelier");
  await expect(page.locator('[data-theme-renderer-status="ready"]')).toHaveCount(1);
});

test("tablet and mobile layouts stay usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto(productionHomepage);

  const copy = page.getByRole("heading", { name: "Your résumé, alive on the web." });
  const story = page.locator("[data-live-product-story]");
  const copyBox = await copy.boundingBox();
  const storyBox = await story.boundingBox();
  expect(copyBox).not.toBeNull();
  expect(storyBox).not.toBeNull();
  expect(storyBox!.y).toBeGreaterThan(copyBox!.y);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByTestId("homepage-primary-cta")).toBeVisible();
  const storyButtons = page.locator("[data-story-moment]");
  expect(
    await storyButtons.evaluateAll((buttons) =>
      buttons.every((button) => button.getBoundingClientRect().height >= 44),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("reduced motion keeps the full transformation understandable and interactive", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productionHomepage);

  await expect(page.locator('[data-motion-state="reduced"]')).toBeVisible();
  const story = page.locator("[data-live-product-story]");
  await expect(story.locator("[data-truth-source]")).toBeVisible();
  await expect(story.locator("[data-truth-destination]")).toBeVisible();
  await expect(story.locator("[data-transform-motion] b").first()).toBeHidden();
  await expect(story.getByRole("heading", { name: "Professional page" })).toBeVisible();

  const practical = story.getByRole("radio", { name: /Practical and grounded/ });
  await practical.click();
  await expect(practical).toHaveAttribute("aria-checked", "true");
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "quarry");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("homepage preview remains a noindex review mirror", async ({ page }) => {
  await page.goto("/homepage-preview");

  await expect(page).toHaveURL(/\/homepage-preview$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/www\.mylivingpage\.com\/?$/,
  );
  await expect(page.locator("[data-action-first]")).toBeVisible();
  await expect(page.getByText("Homepage conversion prototype", { exact: true })).toBeVisible();
});
