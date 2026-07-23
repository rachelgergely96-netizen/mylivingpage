import { expect, test } from "@playwright/test";

test("examples puts a live sample and clear sharing moments in the first screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/examples");

  const experience = page.locator("[data-examples-experience]");
  const stage = page.locator("[data-example-stage]");

  await expect(
    page.getByRole("heading", {
      name: "See what someone sees when they open your link.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /After applying/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /A recruiter is interested/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(stage.locator("canvas[aria-hidden='true']")).toBeVisible();
  await expect(stage).toBeInViewport({ ratio: 0.35 });
  await expect(stage).toHaveCSS("transform", "none");

  await page.getByRole("tab", { name: /After applying/ }).click();
  await expect(
    page.getByRole("heading", { name: "Early-career litigation attorney" }),
  ).toBeVisible();
  await expect(page.locator("#early-career-attorney")).toBeVisible();

  const momentButtons = experience.getByRole("tab");
  for (const button of await momentButtons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("examples stays compact on mobile and keeps modal controls fixed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/examples");

  await page.getByRole("tab", { name: /A referral asks/ }).click();
  const stage = page.locator("[data-example-stage]");
  await expect(
    page.getByRole("heading", { name: "Designer moving into a new in-house role" }),
  ).toBeVisible();

  const animationDuration = await stage.evaluate(
    (element) => window.getComputedStyle(element).animationDuration,
  );
  expect(Number.parseFloat(animationDuration || "0")).toBeLessThanOrEqual(0.00001);

  await stage
    .getByRole("button", { name: /Open full sample for Morgan Sample/ })
    .click();
  const dialog = page.getByRole("dialog", { name: /Morgan Sample/ });
  const closeButton = dialog.getByRole("button", { name: "Close large preview" });
  await expect(closeButton).toBeInViewport();
  const overlayZIndex = await page.locator("[data-example-preview-overlay]").evaluate(
    (element) => Number.parseInt(window.getComputedStyle(element).zIndex, 10),
  );
  const stickyZIndex = await page.getByTestId("mobile-sticky-cta").evaluate(
    (element) => Number.parseInt(window.getComputedStyle(element).zIndex, 10),
  );
  expect(overlayZIndex).toBeGreaterThan(stickyZIndex);

  await dialog.getByRole("button", { name: "Next chapter: Impact" }).click();
  await expect(closeButton).toBeInViewport();
  await closeButton.click();

  await page.locator("#choose-a-moment").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("mobile-sticky-cta")).toHaveAttribute(
    "aria-hidden",
    "false",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
