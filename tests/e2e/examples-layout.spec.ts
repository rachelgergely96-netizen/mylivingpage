import { expect, test } from "@playwright/test";

test("examples leads with a Living Page and keeps the switcher simple", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/examples");

  const experience = page.locator("[data-examples-experience]");
  const stage = page.locator("[data-example-stage]");

  await expect(
    page.getByRole("heading", {
      name: "See a Living Page in action.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /After applying/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Recruiter interested/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(stage.locator("canvas[aria-hidden='true']")).toBeVisible();
  await expect(stage).toBeInViewport({ ratio: 0.35 });
  await expect(stage).toHaveCSS("transform", "none");
  await expect(page.getByText("What the link changes")).toHaveCount(0);
  await expect(
    page.getByText("Need the résumé vs. page distinction?"),
  ).toBeVisible();

  const desktopFlow = await page.evaluate(() => {
    const stageElement = document.querySelector<HTMLElement>("[data-example-stage]");
    const switcher = document.querySelector<HTMLElement>("[data-example-switcher]");
    const experienceElement = document.querySelector<HTMLElement>(
      "[data-examples-experience]",
    );
    const stageRect = stageElement?.getBoundingClientRect();
    const switcherRect = switcher?.getBoundingClientRect();
    const experienceRect = experienceElement?.getBoundingClientRect();
    return {
      deadSpace: experienceRect && stageRect
        ? experienceRect.bottom - stageRect.bottom
        : Number.POSITIVE_INFINITY,
      previewLeads:
        Boolean(stageRect && switcherRect) && stageRect!.left < switcherRect!.left,
      previewWider:
        Boolean(stageRect && switcherRect) && stageRect!.width > switcherRect!.width,
    };
  });
  expect(desktopFlow.previewLeads).toBe(true);
  expect(desktopFlow.previewWider).toBe(true);
  expect(desktopFlow.deadSpace).toBeLessThanOrEqual(2);

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

  const stage = page.locator("[data-example-stage]");
  const switcher = page.locator("[data-example-switcher]");
  const mobileOrder = await Promise.all([stage.boundingBox(), switcher.boundingBox()]);
  expect(mobileOrder[0]).not.toBeNull();
  expect(mobileOrder[1]).not.toBeNull();
  expect(mobileOrder[0]!.y).toBeLessThan(mobileOrder[1]!.y);

  await page.getByRole("tab", { name: /Referral asks/ }).click();
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
