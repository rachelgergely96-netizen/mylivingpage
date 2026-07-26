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

  await expect(rail).toBeVisible();
  await expect(sample.locator("canvas[aria-hidden='true']")).toBeVisible();

  await projectsButton.focus();
  await page.keyboard.press("Enter");

  await expect(projectsButton).toHaveAttribute("aria-current", "step");
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
  await expect
    .poll(() =>
      sample
        .locator("[data-analytics-scroll-root='true']")
        .evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0);
});
