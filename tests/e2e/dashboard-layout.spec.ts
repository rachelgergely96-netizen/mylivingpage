import { expect, test } from "@playwright/test";

test("dashboard prioritizes one next move and keeps recent activity beside it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dev/dashboard-preview");

  const signalCard = page.locator("[data-dashboard-signal-card]");
  const nextSignal = page.locator("[data-dashboard-primary-action]");
  const readout = page.locator("[data-dashboard-signal-readout]");

  await expect(
    page.getByRole("heading", { name: /Welcome back, Avery/i }),
  ).toBeVisible();
  await expect(page.locator("[data-dashboard-welcome]")).toHaveCount(0);
  await expect(
    page.getByText("Check if your page is live", { exact: false }),
  ).toBeVisible();
  await expect(signalCard).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible();
  await expect(
    nextSignal.getByRole("link", { name: "View activity" }),
  ).toBeVisible();
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
  expect(readoutBox!.x).toBeGreaterThan(
    nextSignalBox!.x + nextSignalBox!.width,
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("returning users enter through their real Living Page signal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dev/dashboard-preview?welcome=1");

  const welcome = page.locator("[data-dashboard-welcome]");
  const continueButton = welcome.getByRole("button", {
    name: "Open dashboard now",
  });

  await expect(welcome).toBeVisible();
  await expect(
    welcome.getByRole("heading", { name: "Avery, your page kept living." }),
  ).toBeVisible();
  await expect(
    welcome.getByText("Welcome back · page reconnected"),
  ).toBeVisible();
  await expect(
    welcome.getByText("Someone viewed it after your last share."),
  ).toBeVisible();
  await expect(welcome.getByText("/avery-sample")).toBeVisible();
  await expect(
    welcome.locator("[data-dashboard-welcome-preview]"),
  ).toBeVisible();
  await expect(
    welcome.getByRole("progressbar", { name: "Opening your dashboard" }),
  ).toBeVisible();
  await expect(page).toHaveURL("/dev/dashboard-preview");
  await expect(continueButton).toBeFocused();
  await expect(welcome).toHaveAttribute("data-state", "holding", {
    timeout: 2_000,
  });
  await expect(welcome).toContainText(
    "Page ready. Dashboard opens automatically",
  );
  await page.waitForTimeout(2_500);
  await expect(welcome).toBeVisible();
  await expect(welcome).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: /Welcome back, Avery/i }),
  ).toBeVisible();
});

test("welcome handoff can be paused, resumed, or skipped from the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/dev/dashboard-preview?welcome=1");

  const welcome = page.locator("[data-dashboard-welcome]");
  const continueButton = welcome.getByRole("button", {
    name: "Open dashboard now",
  });
  await expect(continueButton).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    welcome.getByRole("button", { name: "Pause intro" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(welcome).toHaveAttribute("data-paused", "true");
  await expect(
    welcome.getByRole("button", { name: "Resume intro" }),
  ).toBeFocused();
  await page.waitForTimeout(3_600);
  await expect(welcome).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(welcome).toHaveAttribute("data-paused", "false");
  await expect(welcome).toHaveCount(0, { timeout: 7_000 });

  await page.goto("/dev/dashboard-preview?welcome=1");
  await expect(
    page.getByRole("button", { name: "Open dashboard now" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-dashboard-welcome]")).toHaveCount(0);
});

test("welcome-back reveal is static and contained on reduced-motion mobile", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/dashboard-preview?welcome=1");

  const welcome = page.locator("[data-dashboard-welcome]");
  await expect(welcome).toBeVisible();
  await expect(
    welcome.getByRole("button", { name: "Open dashboard now" }),
  ).toBeVisible();
  await expect(
    welcome.getByRole("button", { name: "Skip intro" }),
  ).toBeVisible();

  const animationDuration = await welcome.evaluate(
    (element) => window.getComputedStyle(element).animationDuration,
  );
  expect(Number.parseFloat(animationDuration)).toBeLessThanOrEqual(0.00001);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.waitForTimeout(2_500);
  await expect(welcome).toBeVisible();
  await expect(welcome).toHaveCount(0, { timeout: 3_500 });
  await expect(page.locator("#main-content")).toBeFocused();
});

test("welcome intent is consumed without a reveal when the account has no page", async ({
  page,
}) => {
  await page.goto("/dev/dashboard-preview?welcome=1&empty=1");

  await expect(page.locator("[data-dashboard-welcome]")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "You don’t have a Living Page yet." }),
  ).toBeVisible();
  await expect(page).toHaveURL("/dev/dashboard-preview?empty=1");
});

test("dashboard stacks cleanly on mobile and honors reduced motion", async ({
  page,
}) => {
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
