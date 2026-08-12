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

test("the hero shows the page itself and keeps one résumé source visible", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  await expect(
    story.getByRole("heading", {
      name: "See one résumé become a Living Page.",
    }),
  ).toBeVisible();

  // No output picker: the Living Page is the stage, titled inside its shell.
  await expect(story.locator("[data-story-moment]")).toHaveCount(0);
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
  await expect(story.getByRole("heading", { name: "Your Living Page" })).toBeVisible();

  // Both ends of the transformation stay on screen so the "same facts"
  // proof survives without a tab to switch between them.
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

  // The homepage teaches the interaction once, then lets the cue disappear.
  // Only the showroom preview is narrowed; real Living Pages keep the shared
  // uniform foreground contract.
  await expect(story.locator("[data-homepage-motion-cue]")).toContainText(
    "Move here to explore",
  );
  const motionPreview = story.locator('[data-homepage-motion-preview="hero"]');
  const motionRoot = motionPreview.locator("xpath=ancestor::*[@data-living-output][1]");
  const foregroundRatio = await motionPreview.evaluate((preview) => {
    const foreground = preview.querySelector<HTMLElement>(".resume-theme-content");
    if (!foreground) return 1;
    return foreground.getBoundingClientRect().width / preview.getBoundingClientRect().width;
  });
  expect(foregroundRatio).toBeLessThanOrEqual(0.89);
  expect(
    await motionRoot.locator("canvas").evaluate((canvas) => getComputedStyle(canvas).cursor),
  ).toBe("crosshair");

  // The style chooser always addresses the Living Page now that no other
  // output can occupy the stage.
  await expect(story.locator("[data-story-style-chooser]")).toContainText("page styles");
  await expect(story.locator("[data-story-style-chooser]")).toContainText(
    "Try five looks. Same information.",
  );

  for (const element of [story, story.locator("[data-story-living-output]")]) {
    expect(await element.evaluate((node) => getComputedStyle(node).borderRadius)).not.toBe("");
  }
});

test("homepage promises an editable review and a clear stopping point", async ({ page }) => {
  await page.goto(productionHomepage);

  const workflow = page.locator("[data-default-workflow]");
  await expect(workflow.getByRole("heading", { name: "From résumé to published page." })).toBeVisible();
  await expect(workflow).toContainText("Import");
  await expect(workflow).toContainText("Review");
  await expect(workflow).toContainText("Publish");
  await expect(workflow.locator("[data-editable-promise]")).toContainText(
    "Every field stays editable",
  );
  await expect(workflow.locator("[data-editable-promise]")).toContainText(
    "private until you publish",
  );

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
  const outcomes = searchReadiness.locator("[data-readable-outcomes]");
  await expect(outcomes).toContainText("Export a clean PDF");
  await expect(outcomes).toContainText("without\n            changing the link");
  await expect(searchReadiness).toContainText(
    "does not invent experience, guarantee how hiring software will read or rank a résumé",
  );

  // The cost objection now sits immediately before the final ask rather than
  // at the end of the chapter about what a recruiter receives.
  const freePromise = page.locator("[data-free-promise]");
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
  // Choosing a style replays the facts travelling from the résumé to the
  // page: same facts, new world. That cycle is what the tabs used to drive.
  await expect(transform).toHaveAttribute("data-transform-cycle", "1");
  const livingOutput = story.locator("[data-story-living-output]");
  await expect(livingOutput).toHaveAttribute("data-theme-id", "nocturne");
  await expect(livingOutput.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  await expect(chooser.locator("[data-style-selection-status]"))
    .toContainText("Calm and focused · Nocturne");

  // The selection survives interacting with the rest of the hero.
  await story.locator("[data-also-included]").scrollIntoViewIfNeeded();
  await expect(livingOutput).toHaveAttribute("data-theme-id", "nocturne");
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
  // The page leads on a phone; the résumé it came from reads underneath at
  // supporting scale, with no output picker in between.
  await expect(page.locator("[data-story-mobile-summary]")).toHaveCount(0);
  const sourceBox = await page.locator("[data-truth-source]").boundingBox();
  const pageBox = await page.locator("[data-truth-destination]").boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(pageBox).not.toBeNull();
  expect(sourceBox!.height).toBeLessThanOrEqual(160);
  expect(pageBox!.y).toBeLessThan(sourceBox!.y);
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
