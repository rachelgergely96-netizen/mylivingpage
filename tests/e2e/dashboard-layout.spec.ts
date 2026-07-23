import { expect, test } from "@playwright/test";

test("dashboard prioritizes one next move and keeps recent activity beside it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dev/dashboard-preview");

  const signalCard = page.locator("[data-dashboard-signal-card]");
  const nextSignal = page.locator("[data-dashboard-primary-action]");
  const readout = page.locator("[data-dashboard-signal-readout]");

  await expect(page.getByRole("heading", { name: /Welcome back, Avery/i })).toBeVisible();
  await expect(page.getByText("Check if your page is live", { exact: false })).toBeVisible();
  await expect(signalCard).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await expect(nextSignal.getByRole("link", { name: "View activity" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ATS check" })).toBeVisible();
  await expect(readout).toContainText("Views");
  await expect(readout).toContainText("Share actions");
  await expect(readout).toContainText("Avg. time");
  await expect(page.locator("main")).not.toContainText("Signal Desk");
  await expect(page.locator("main")).not.toContainText("Proof landed");
  await expect(page.locator("main")).not.toContainText("Visual world");

  const nextSignalBox = await nextSignal.boundingBox();
  const readoutBox = await readout.boundingBox();
  expect(nextSignalBox).not.toBeNull();
  expect(readoutBox).not.toBeNull();
  expect(readoutBox!.x).toBeGreaterThan(nextSignalBox!.x + nextSignalBox!.width);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("dashboard stacks cleanly on mobile and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/dashboard-preview");

  const signalCard = page.locator("[data-dashboard-signal-card]");
  const readout = page.locator("[data-dashboard-signal-readout]");

  await expect(signalCard).toBeVisible();
  await expect(readout).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View activity" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit page" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();

  const signalCardBox = await signalCard.boundingBox();
  const readoutBox = await readout.boundingBox();
  expect(signalCardBox).not.toBeNull();
  expect(readoutBox).not.toBeNull();
  expect(readoutBox!.width).toBeLessThanOrEqual(signalCardBox!.width);

  const animationDuration = await signalCard.evaluate(
    (element) => window.getComputedStyle(element).animationDuration,
  );
  expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(0.00001);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
