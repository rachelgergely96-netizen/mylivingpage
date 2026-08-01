import { expect, test } from "@playwright/test";

const productionHomepage = "/";

test("production homepage makes the value and first action clear above the fold", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.goto(productionHomepage);

  await expect(page).toHaveTitle(/Turn your résumé into a page you can share/);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your résumé, alive on the web." }),
  ).toBeVisible();
  await expect(page.getByText("one link you can update anytime", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Product assurances")).toContainText("Completely free");
  await expect(page.getByLabel("Product assurances")).toContainText("Private until published");
  await expect(page.getByLabel("Product assurances")).toBeVisible();

  const primaryCta = page.getByTestId("homepage-primary-cta");
  await expect(primaryCta).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  const transformationLink = page.locator('a[href="#live-product-story"]');
  await expect(transformationLink).toHaveAttribute(
    "href",
    "#live-product-story",
  );
  await expect(transformationLink).toBeHidden();
  const primaryBox = await primaryCta.boundingBox();
  const assurancesBox = await page.getByLabel("Product assurances").boundingBox();
  expect(primaryBox).not.toBeNull();
  expect(assurancesBox).not.toBeNull();
  expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(600);
  expect(assurancesBox!.y + assurancesBox!.height).toBeLessThanOrEqual(600);

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
  // Budget grew deliberately when the Living Page and Share Card chapters
  // were added; keep the page under ~5 desktop viewports.
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(6_200);
});

test("the transformation opens on the web page and keeps one résumé source visible", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  await expect(
    story.getByRole("heading", {
      name: "See one résumé become a Living Page.",
    }),
  ).toBeVisible();

  const referral = story.getByRole("button", { name: /Web page/ });
  const application = story.getByRole("button", { name: /Résumé PDF/ });
  const introduction = story.getByRole("button", { name: /Card \+ QR code/ });
  await expect(story.locator("[data-story-moment]")).toHaveCount(3);
  await expect(referral).toHaveAttribute("aria-pressed", "true");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
  await expect(story.getByRole("heading", { name: "Your Living Page" })).toBeVisible();
  await expect(story.locator("[data-truth-source]")).toBeVisible();
  await expect(story.locator("[data-truth-destination]")).toBeVisible();
  await expect(story.locator("[data-transform-motion]")).toContainText("Same facts");
  expect(
    await story.locator("[data-transform-motion] b").first().evaluate(
      (node) => getComputedStyle(node).animationName,
    ),
  ).toContain("truthTravel");
  expect(
    await story.locator("[data-transform-motion] b").first().evaluate(
      (node) => Number.parseFloat(getComputedStyle(node).fontSize),
    ),
  ).toBeGreaterThanOrEqual(9);

  await application.click();
  await expect(application).toHaveAttribute("aria-pressed", "true");
  await expect(story.getByRole("heading", { name: "PDF for applications" })).toBeVisible();
  await expect(story.getByText("Avery-Morgan_Product-Lead.pdf")).toBeVisible();
  await expect(story.locator("[data-story-style-chooser]")).toContainText("Page styles");
  await expect(story.locator("[data-story-style-chooser]")).toContainText(
    "Pick a look to return to the Living Page.",
  );

  await introduction.click();
  await expect(introduction).toHaveAttribute("aria-pressed", "true");
  await expect(story.getByRole("heading", { name: "Card + QR code" })).toBeVisible();
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
  await expect(steps.nth(1)).toContainText("Review your details");
  await expect(steps.nth(1)).toContainText("Every field stays editable");
  await expect(steps.nth(2)).toContainText("Publish your page");

  const shortcut = page.locator("[data-overwhelmed-shortcut]");
  await expect(shortcut).toContainText("First visit");
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
    searchReadiness.getByRole("heading", {
      name: "Your style can change. Your details stay clear.",
    }),
  ).toBeVisible();
  await expect(searchReadiness).toContainText("hiring software (ATS)");
  const readableDetails = searchReadiness.locator("[data-readable-detail-types]");
  await expect(readableDetails).toContainText("Job titles");
  await expect(readableDetails).toContainText("The roles you've held");
  await expect(readableDetails).toContainText("Skills");
  await expect(readableDetails).toContainText("What you know how to do");
  await expect(readableDetails).toContainText("Results");
  await expect(readableDetails).toContainText("What changed because of your work");
  await expect(
    searchReadiness.getByRole("heading", { name: "Export a clean PDF" }),
  ).toBeVisible();
  await expect(
    searchReadiness.getByRole("heading", { name: "Keep the structure legible" }),
  ).toBeVisible();
  await expect(
    searchReadiness.getByRole("heading", { name: "Update without a new link" }),
  ).toBeVisible();
  await expect(searchReadiness).toContainText(
    "does not invent experience, guarantee how hiring software will read or rank a résumé",
  );

  const freePromise = searchReadiness.locator("[data-free-promise]");
  await expect(
    freePromise.getByRole("heading", { name: "Everything on this page is free." }),
  ).toBeVisible();
  await expect(freePromise).toContainText("No credit card. No subscription.");
  await expect(freePromise).toContainText("No trial. No hidden fees.");
});

test("the five-theme rail updates the real Living Page preview immediately", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  const chooser = story.locator("[data-story-style-chooser]");
  await chooser.scrollIntoViewIfNeeded();
  await expect(chooser).toContainText("59 page styles");
  await expect(chooser).toContainText("Same information");

  const stageBox = await story.locator("[data-story-stage]").boundingBox();
  const chooserBox = await chooser.boundingBox();
  expect(stageBox).not.toBeNull();
  expect(chooserBox).not.toBeNull();
  expect(chooserBox!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);

  const directions = chooser.getByRole("radiogroup", {
    name: "Choose a page style",
  });
  const calm = directions.getByRole("radio", { name: /Calm and focused/ });
  const transform = story.locator("[data-transform-motion]");
  await expect(transform).toHaveAttribute("data-transform-cycle", "0");
  await expect(directions.getByRole("radio")).toHaveCount(5);
  await calm.click();

  await expect(calm).toHaveAttribute("aria-checked", "true");
  await expect(transform).toHaveAttribute("data-transform-cycle", "0");
  await expect(story.getByRole("button", { name: /Web page/ }))
    .toHaveAttribute("aria-pressed", "true");
  const livingOutput = story.locator("[data-story-living-output]");
  await expect(livingOutput).toHaveAttribute("data-theme-id", "nocturne");
  await expect(livingOutput.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  await expect(chooser.locator("[data-style-selection-status]"))
    .toContainText("Calm and focused · Nocturne");

  await story.getByRole("button", { name: /Card \+ QR code/ }).click();
  await expect(story.getByRole("img", { name: /Sample QR code/ })).toBeVisible();
  await story.getByRole("button", { name: /Web page/ }).click();
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "nocturne");
});

test("theme controls are equal and support roving keyboard selection", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  const chooser = story.locator("[data-story-style-chooser]");
  await chooser.scrollIntoViewIfNeeded();
  const directions = chooser.getByRole("radiogroup", {
    name: "Choose a page style",
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
  // The story stage keeps exactly one animated canvas; the Living Page
  // chapter below owns the only other one on the page.
  await expect(story.locator('[data-theme-renderer-status="ready"]')).toHaveCount(1);
  await expect(page.locator('[data-theme-renderer-status="ready"]')).toHaveCount(2);
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
  await expect(page.getByRole("link", { name: "See an example" })).toBeVisible();
  await expect(page.locator("[data-story-mobile-summary]")).toContainText(
    "Pick an output. Your facts stay the same.",
  );
  const sourceBox = await page.locator("[data-truth-source]").boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(sourceBox!.height).toBeLessThanOrEqual(160);
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
  await expect(story.getByRole("heading", { name: "Your Living Page" })).toBeVisible();

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

test("the page and card chapters share one style selection", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(productionHomepage);

  const pagesChapter = page.locator("[data-living-pages-chapter]");
  const cardChapter = page.locator("[data-share-card-chapter]");

  await pagesChapter.scrollIntoViewIfNeeded();
  await expect(
    pagesChapter.getByRole("heading", { name: "A page with a world behind it." }),
  ).toBeVisible();
  await expect(pagesChapter.locator("[data-pages-style]")).toHaveCount(5);

  const card = cardChapter.locator("[data-testid='story-share-card']");
  await expect(card).toHaveAttribute("data-theme-id", "velvet");

  await pagesChapter.locator("[data-pages-style='atlas']").click();
  await expect(pagesChapter.locator("[data-pages-stage]")).toBeVisible();
  await expect(card).toHaveAttribute("data-theme-id", "atlas");

  await cardChapter.scrollIntoViewIfNeeded();
  await expect(
    cardChapter.getByRole("heading", { name: "A card people can hold—and scan." }),
  ).toBeVisible();
  await expect(cardChapter.locator("[data-share-card-glass-shell]")).toBeVisible();
  await expect(cardChapter.locator("[data-card-stage]")).toContainText("Matched to");
});
