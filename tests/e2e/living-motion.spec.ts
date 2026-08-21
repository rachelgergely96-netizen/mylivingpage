import { expect, test } from "@playwright/test";

test("embedded Living Page previews expose sharp keyboard-operable chapter navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/examples");

  await page.getByRole("tab", { name: /Referral asks/ }).click();
  const sample = page.locator("#career-switching-designer");
  const rail = sample.getByRole("navigation", { name: "Living Page chapters" });
  const projectsButton = rail.getByRole("button", { name: /Projects$/ });
  const experienceButton = rail.getByRole("button", { name: /Experience$/ });

  await expect(rail).toBeVisible();
  await expect(sample.locator("canvas[aria-hidden='true']")).toBeVisible();

  await projectsButton.focus();
  await page.keyboard.press("Enter");

  await expect(projectsButton).toHaveAttribute("aria-current", "step");
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
  await experienceButton.focus();
  await page.keyboard.press("Enter");
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
  await expect(rail.locator("span[aria-current='step']")).toHaveText("Impact");
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
