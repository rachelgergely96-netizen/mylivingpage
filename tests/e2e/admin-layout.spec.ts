import { expect, test } from "@playwright/test";

test("admin signal desk starts with actionable work instead of generic metrics", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dev/admin-preview");

  const desk = page.locator("[data-admin-signal-desk]");
  await expect(
    page.getByRole("heading", { name: "Start with what needs attention." }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: /01 Overview/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(desk.getByText("Feedback", { exact: true }).first()).toBeVisible();
  await expect(desk.getByText("Failed actions", { exact: true })).toBeVisible();
  await expect(desk.getByText("Accounts to review", { exact: true })).toBeVisible();
  await expect(page.getByText("What users said most recently")).toBeVisible();
  await expect(page.getByText("Feedback received", { exact: true })).toBeVisible();
  await expect(page.getByText("Current snapshot", { exact: true })).toBeVisible();
  const statusPulseDuration = await page.locator("[data-admin-status]").evaluate(
    (element) => window.getComputedStyle(element, "::before").animationDuration,
  );
  expect(statusPulseDuration).toBe("1.8s");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("admin feedback behaves like a searchable inbox on desktop and mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/admin-preview?view=feedback");

  await expect(
    page.getByRole("heading", { name: "What users are telling you" }),
  ).toBeVisible();
  await expect(page.locator("[data-admin-feedback-inbox]")).toBeVisible();

  await page.getByRole("button", { name: "Open admin navigation" }).click();
  const mobileNav = page.locator("#admin-mobile-navigation");
  await expect(mobileNav.getByRole("link", { name: /02 Feedback/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.getByRole("button", { name: "Close admin navigation" }).click();

  const selectedOptions = page.locator('[role="option"][tabindex="0"]');
  await expect(selectedOptions).toHaveCount(1);
  await selectedOptions.press("ArrowDown");
  await expect(page.getByRole("option", { name: /Morgan Sample/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("option", { name: /Morgan Sample/ }).click();
  await expect(
    page.getByText("duplicate my page before changing it", { exact: false }).last(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Email this user" })).toHaveAttribute(
    "href",
    /^mailto:morgan@example\.com/,
  );

  await page.getByRole("button", { name: /Bugs/ }).click();
  await expect(page.getByRole("option", { name: /Morgan Sample/ })).toHaveCount(0);
  await page.getByLabel("Find feedback").fill("no matching feedback");
  await expect(page.getByText("No feedback matches this view.")).toBeVisible();

  const reducedMotionDuration = await page.locator("[data-admin-status]").evaluate(
    (element) => window.getComputedStyle(element, "::before").animationDuration,
  );
  expect(Number.parseFloat(reducedMotionDuration || "0")).toBeLessThanOrEqual(0.00001);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
