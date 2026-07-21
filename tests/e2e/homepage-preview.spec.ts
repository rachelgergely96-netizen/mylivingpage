import { expect, test } from "@playwright/test";

const productionHomepage = "/";

test("production homepage presents a professional page and one consistent start intent", async ({ page }) => {
  await page.goto(productionHomepage);

  await expect(page).toHaveTitle(/Turn Your Résumé Into a Page You Can Share/);
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Turn your résumé into a page you can share." }),
  ).toBeVisible();
  await expect(page.getByText("Add your résumé", { exact: true }).first()).toBeVisible();
  await expect(page.locator("[data-hero-supporting-copy]")).toContainText(
    "apply for a role, get referred, or make an introduction",
  );
  await expect(page.getByText("That is the whole first session", { exact: false })).toHaveCount(0);
  await expect(page.getByText("For now, ignore", { exact: false })).toHaveCount(0);
  await expect(page.getByLabel("Product assurances")).toContainText("Completely free");

  const primaryCta = page.getByTestId("homepage-primary-cta");
  await expect(primaryCta).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  await expect(page.getByRole("link", { name: "Try the live sample" })).toHaveAttribute(
    "href",
    "#live-product-story",
  );
  const startActions = page.locator("[data-start-action]");
  await expect(startActions).toHaveCount(4);
  expect(
    await startActions.evaluateAll((links) =>
      links.every(
        (link) =>
          link.textContent?.includes("Add my résumé") &&
          link.getAttribute("href")?.startsWith("/signup?") &&
          link.getAttribute("href")?.includes("next=/create"),
      ),
    ),
  ).toBe(true);

  await expect(page.getByRole("region", { name: "The three-step default workflow" }))
    .toHaveAttribute("tabindex", "0");
  await expect(page.locator("[data-homepage-theme-canvas]")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("live product story opens on the Share Card and switches among three truthful outputs", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  await expect(
    story.getByRole("heading", { name: "What do you need to be understood for?" }),
  ).toBeVisible();

  const application = story.getByRole("button", { name: /Applying for a role/ });
  const referral = story.getByRole("button", { name: /Getting referred/ });
  const introduction = story.getByRole("button", { name: /Making an introduction/ });
  await expect(story.locator("[data-story-moment]")).toHaveCount(3);
  await expect(introduction).toHaveAttribute("aria-pressed", "true");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "introduction");
  await expect(story.getByRole("heading", { name: "Share Card + QR" })).toBeVisible();
  const qr = story.getByRole("img", { name: "Sample QR code preview for the professional page" });
  await expect(qr).toBeVisible();

  const squareElements = [
    story,
    introduction,
    story.locator('[data-story-output="introduction"] > article'),
    story.locator('[data-story-output="introduction"] article > div:first-child > b'),
    qr,
  ];
  for (const element of squareElements) {
    expect(await element.evaluate((node) => getComputedStyle(node).borderRadius)).toBe("0px");
  }

  await application.click();
  await expect(application).toHaveAttribute("aria-pressed", "true");
  await expect(story.getByRole("heading", { name: "ATS-ready PDF" })).toBeVisible();
  await expect(story.getByText("Avery-Morgan_Product-Lead.pdf")).toBeVisible();
  await expect(story.getByRole("img", { name: "Avery Morgan source résumé, imported once" }))
    .toBeVisible();

  await referral.click();
  await expect(referral).toHaveAttribute("aria-pressed", "true");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
  const livingOutput = story.locator("[data-story-living-output]");
  await expect(livingOutput).toHaveAttribute("data-theme-id", "atlas");
  await expect(livingOutput.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  await expect(story.getByRole("region", { name: "Sample professional page preview" }))
    .toHaveAttribute("tabindex", "0");
});

test("homepage defines a three-step path, a quick start, and a stopping point", async ({ page }) => {
  await page.goto(productionHomepage);

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
  await expect(shortcut).toContainText("Quick start · only what you need");
  await expect(shortcut.locator("[data-stopping-point]")).toContainText("You can stop here");
  await expect(shortcut.locator("[data-later-guidance]")).toContainText(
    "The recommended style is ready to use",
  );
  await expect(shortcut.locator("[data-later-guidance]")).toContainText(
    "available whenever you need them",
  );
  const shortcutLink = shortcut.getByRole("link", { name: "Add my résumé" });
  await expect(shortcutLink).toHaveAttribute(
    "href",
    "/signup?ref=landing_quick_start&next=/create",
  );
  const shortcutBox = await shortcutLink.boundingBox();
  expect(shortcutBox).not.toBeNull();
  expect(shortcutBox!.height).toBeGreaterThanOrEqual(44);
});

test("homepage explains ATS and AI readability with an always-free promise", async ({ page }) => {
  await page.goto(productionHomepage);

  const searchReadiness = page.locator("[data-search-readiness]");
  await expect(
    searchReadiness.getByRole("heading", { name: "Built to be easier to find—and understand." }),
  ).toBeVisible();
  await expect(searchReadiness).toContainText("ATS tools, recruiter search, search engines");
  await expect(searchReadiness.getByRole("heading", { name: "ATS-ready PDF" })).toBeVisible();
  await expect(
    searchReadiness.getByRole("heading", { name: "Recruiter search + AI readability" }),
  ).toBeVisible();
  await expect(
    searchReadiness.getByRole("heading", { name: "Public professional page" }),
  ).toBeVisible();
  await expect(searchReadiness).toContainText(
    "No tool can guarantee how every system will parse or rank your résumé",
  );

  const freePromise = searchReadiness.locator("[data-free-promise]");
  await expect(
    freePromise.getByRole("heading", { name: "One Living Resume. Completely free. Always." }),
  )
    .toBeVisible();
  await expect(freePromise).toContainText("No card or subscription required");
  await expect(freePromise).toContainText("No trial. No hidden fees.");
});

test("style cards sit under the top demo and update that Living Resume immediately", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  const chooser = story.locator("[data-story-style-chooser]");
  await chooser.scrollIntoViewIfNeeded();
  await expect(page.locator("[data-story-style-chooser]")).toHaveCount(1);
  await expect(page.locator("#resume-styles")).toHaveCount(0);
  await expect(page.locator("[data-style-preview]")).toHaveCount(0);
  await expect(page.getByTestId("gallery-motion-toggle")).toHaveCount(0);
  await expect(chooser).toContainText(
    "The Living Resume above opens with that design; your information stays the same",
  );

  const stageBox = await story.locator("[data-story-stage]").boundingBox();
  const chooserBox = await chooser.boundingBox();
  expect(stageBox).not.toBeNull();
  expect(chooserBox).not.toBeNull();
  expect(chooserBox!.y).toBeGreaterThanOrEqual(stageBox!.y + stageBox!.height - 1);

  const directions = chooser.getByRole("radiogroup", {
    name: "Choose a style for the Living Resume above",
  });
  const calm = directions.getByRole("radio", { name: /Calm and focused/ });
  await expect(directions.getByRole("radio")).toHaveCount(5);
  await expect(calm).toHaveAttribute("aria-controls", "prototype-story-output");
  await calm.click();

  await expect(calm).toHaveAttribute("aria-checked", "true");
  await expect(story.getByRole("button", { name: /Getting referred/ }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
  const livingOutput = story.locator("[data-story-living-output]");
  await expect(livingOutput).toHaveAttribute("data-theme-id", "nocturne");
  await expect(livingOutput.locator('[data-theme-renderer-status="ready"]')).toBeVisible();
  await expect(chooser.locator("[data-style-selection-status]"))
    .toContainText("Calm and focused · Nocturne");
  await expect(chooser.locator("[data-style-selection-status]"))
    .toContainText("Showing above");

  await story.getByRole("button", { name: /Making an introduction/ }).click();
  await expect(
    story.getByRole("img", { name: "Sample QR code preview for the professional page" }),
  ).toBeVisible();
  await story.getByRole("button", { name: /Getting referred/ }).click();
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "nocturne");
});

test("top style cards are equal and support roving keyboard selection", async ({ page }) => {
  await page.goto(productionHomepage);

  const story = page.locator("[data-live-product-story]");
  const chooser = story.locator("[data-story-style-chooser]");
  await chooser.scrollIntoViewIfNeeded();
  const directions = chooser.getByRole("radiogroup", {
    name: "Choose a style for the Living Resume above",
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
  await expect(calm).toHaveAttribute("data-theme-id", "nocturne");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
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

test("tablet layout stacks before narrow columns can overflow", async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto(productionHomepage);

  const copy = page.getByRole("heading", {
    name: "Turn your résumé into a page you can share.",
  });
  const observatory = page.locator("[data-live-product-story]");
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

  await page.setViewportSize({ width: 701, height: 900 });
  const styleRail = observatory.getByRole("radiogroup", {
    name: "Choose a style for the Living Resume above",
  });
  await styleRail.scrollIntoViewIfNeeded();
  expect(
    await styleRail.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("reduced motion and mobile preserve the complete homepage", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(productionHomepage);

  await expect(page.locator('[data-motion-state="reduced"]')).toBeVisible();
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Turn your résumé into a page you can share." }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add. Check. Publish." })).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Built to be easier to find—and understand." }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Choose the look of your Living Resume." }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Your page is useful before you use every tool." }),
  ).toBeAttached();

  const story = page.locator("[data-live-product-story]");
  const storyButtons = story.locator("[data-story-moment]");
  await expect(storyButtons).toHaveCount(3);
  expect(
    await storyButtons.evaluateAll((buttons) =>
      buttons.every((button) => button.getBoundingClientRect().height >= 44),
    ),
  ).toBe(true);
  await expect(
    story.getByRole("img", { name: "Sample QR code preview for the professional page" }),
  ).toBeVisible();

  const chooser = story.locator("[data-story-style-chooser]");
  const styleControls = chooser.getByRole("radio");
  await expect(styleControls).toHaveCount(5);
  expect(
    await styleControls.evaluateAll((controls) =>
      controls.every((control) => control.getBoundingClientRect().height >= 44),
    ),
  ).toBe(true);

  const warmDirection = chooser
    .getByRole("radio", { name: /Practical and grounded/ });
  await warmDirection.click();
  await expect(warmDirection).toHaveAttribute("aria-checked", "true");
  await expect(warmDirection).toHaveAttribute("data-theme-id", "quarry");
  await expect(story.locator("[data-story-output-region]"))
    .toHaveAttribute("data-story-output-region", "referral");
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "quarry");
  await expect(page.locator('[data-homepage-theme-canvas][data-canvas-active="true"]')).toHaveCount(0);

  const styleRail = chooser.getByRole("radiogroup", {
    name: "Choose a style for the Living Resume above",
  });
  expect(
    await styleRail.evaluate((rail) => rail.scrollWidth > rail.clientWidth),
  ).toBe(true);

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});

test("normal actions stay separate from reference, statistics, and advanced tools", async ({ page }) => {
  await page.goto(productionHomepage);

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

test("homepage preview remains a noindex review mirror", async ({ page }) => {
  await page.goto("/homepage-preview");

  await expect(page).toHaveURL(/\/homepage-preview$/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/www\.mylivingpage\.com\/?$/,
  );
  await expect(page.locator("[data-action-first]")).toBeVisible();
  await expect(page.getByText("Action-first copy prototype", { exact: true })).toBeVisible();
});
