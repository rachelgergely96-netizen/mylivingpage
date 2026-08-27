import { expect, test } from "@playwright/test";

test("embedded Living Page previews expose sharp keyboard-operable chapter navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/examples");

  await page.getByRole("tab", { name: /Referral asks/ }).click();
  const sample = page.locator("#career-switching-designer");
  const rail = sample.getByRole("navigation", { name: "Living Page chapters" });
  const sectionToggle = rail.getByRole("button", { name: "Sections" });
  const sectionMenu = rail.locator("[data-living-section-menu]");
  const menuButtons = sectionMenu.getByRole("button");
  const impactButton = rail.locator('[data-living-section-item="stats"]');
  const projectsButton = rail.locator(
    '[data-living-section-item="projects"]',
  );
  const experienceButton = rail.locator(
    '[data-living-section-item="experience"]',
  );
  const projectsDestination = sample.locator(
    '[data-analytics-section="projects"] [data-section-heading]',
  );
  const experienceDestination = sample.locator(
    '[data-analytics-section="experience"] [data-section-heading]',
  );
  const impactDestination = sample.locator('[data-motion-section="stats"]');

  await expect(rail).toBeVisible();
  await expect(sample.locator("canvas[aria-hidden='true']")).toBeVisible();

  await sectionToggle.focus();
  await page.keyboard.press("ArrowDown");
  await expect(sectionToggle).toHaveAttribute("aria-expanded", "true");
  await expect(sectionMenu).toBeVisible();
  await expect(menuButtons.first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(menuButtons.last()).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menuButtons.first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(menuButtons.nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sectionMenu).toBeHidden();
  await expect(sectionToggle).toBeFocused();

  await sectionToggle.click();
  await expect(menuButtons.first()).toBeFocused();
  await impactButton.focus();
  await page.keyboard.press("Enter");
  await expect(impactDestination).toBeFocused();
  await expect(impactDestination).toHaveAttribute("aria-label", "Impact");

  await sectionToggle.click();
  await expect(impactButton).toBeFocused();
  await projectsButton.focus();
  await page.keyboard.press("Enter");

  await expect(projectsButton).toHaveAttribute("aria-current", "step");
  await expect(sectionMenu).toBeHidden();
  await expect(sectionToggle).toHaveAttribute("aria-expanded", "false");
  await expect(projectsDestination).toBeFocused();
  await expect(rail).toHaveAttribute(
    "data-motion-event",
    "page.chapter.entered",
  );
  await expect(rail).toHaveAttribute("data-motion-signal", "career-chapters");
  await expect(rail).toHaveAttribute("data-motion-state", "entered");
  await expect(rail).toHaveAttribute("data-motion-target", "projects");
  await expect(rail).toHaveAttribute("data-motion-sequence", /[1-9]\d*/);
  await expect
    .poll(() =>
      sample
        .locator("[data-analytics-scroll-root='true']")
        .evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
  await expect(
    sample.locator("[data-analytics-section='projects']"),
  ).toHaveAttribute("data-motion-active", "true");

  const projectsSequence = Number(
    await rail.getAttribute("data-motion-sequence"),
  );
  await sectionToggle.click();
  await expect(projectsButton).toBeFocused();
  await experienceButton.focus();
  await page.keyboard.press("Enter");
  await expect(experienceDestination).toBeFocused();
  await expect(rail).toHaveAttribute("data-motion-target", "experience");
  await expect
    .poll(async () => Number(await rail.getAttribute("data-motion-sequence")))
    .toBeGreaterThan(projectsSequence);
});

test("mobile chapter navigation stays compact and honors reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/examples");

  await page.getByRole("tab", { name: /Referral asks/ }).click();
  const sample = page.locator("#career-switching-designer");
  const rail = sample.getByRole("navigation", { name: "Living Page chapters" });
  const nextButton = rail.getByRole("button", { name: "Next chapter: Impact" });

  await expect(rail).toBeVisible();
  await nextButton.click();
  await expect(rail.locator("[data-living-section-current]")).toHaveAttribute(
    "data-living-section-current",
    "stats",
  );
  await expect(rail.locator("[data-living-section-current]")).toContainText(
    "Impact",
  );
  await expect(rail).toHaveAttribute(
    "data-motion-event",
    "page.chapter.entered",
  );
  await expect(rail).toHaveAttribute("data-motion-target", "stats");
  await expect(rail).toHaveAttribute("data-motion-sequence", /[1-9]\d*/);
  await expect
    .poll(() =>
      sample
        .locator("[data-analytics-scroll-root='true']")
        .evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
});
