import { expect, test, type Page } from "@playwright/test";

const previewProfile = {
  id: "settings-preview-user",
  username: "avery-sample",
  full_name: "Avery Sample",
  email: "avery@example.com",
  avatar_url: null,
  plan: "pro",
  billing_cohort: "legacy_freemium",
  hosting_trial_started_at: null,
  stripe_subscription_status: "active",
  stripe_trial_ends_at: null,
  latestPage: {
    id: "settings-preview-page",
    status: "live",
    visibility: "public",
    published_at: "2026-07-22T12:00:00.000Z",
  },
  created_at: "2026-07-18T12:00:00.000Z",
  hasPassword: true,
};

async function mockSettingsRequests(page: Page) {
  let username = previewProfile.username;
  let fullName = previewProfile.full_name;

  await page.route("**/api/profile", async (route) => {
    if (route.request().method() === "PATCH") {
      const payload = route.request().postDataJSON() as { full_name?: string };
      fullName = payload.full_name ?? fullName;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...previewProfile, username, full_name: fullName }),
    });
  });

  await page.route("**/api/username*", async (route) => {
    if (route.request().method() === "PATCH") {
      const payload = route.request().postDataJSON() as { slug: string };
      username = payload.slug;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ username }),
      });
      return;
    }

    const requestedSlug = new URL(route.request().url()).searchParams.get("slug") ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ available: true, reason: null, slug: requestedSlug }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockSettingsRequests(page);
});

test("settings leads with the public address and keeps account actions in a clear hierarchy", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/settings-preview");

  await expect(page.getByRole("heading", {
    name: "Keep your public identity and account in order",
    level: 1,
  })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Account settings sections" })).toBeVisible();
  await expect(page.locator("[data-settings-identity]")).toBeVisible();
  await expect(page.locator("[data-settings-access]")).toBeVisible();
  await expect(page.getByRole("button", { name: "Manage subscription" })).toBeVisible();
  await expect(page.locator("[data-settings-security]")).toBeVisible();
  await expect(page.locator("[data-settings-delete]")).toBeVisible();

  const usernameInput = page.getByLabel("Public address username");
  await expect(usernameInput).toHaveValue("avery-sample");
  await expect(page.locator("[data-settings-dirty-state]")).toHaveText(/Identity saved/);

  await usernameInput.fill("avery-control");
  await expect(page.getByText("Address available. Save when you are ready.")).toBeVisible();
  await expect(page.locator("[data-settings-dirty-state]")).toHaveText(/Unsaved identity changes/);

  const saveAddress = page.getByRole("button", { name: "Save public address" });
  await expect(saveAddress).toBeEnabled();
  await saveAddress.click();
  await expect(page.locator("[data-settings-dirty-state]")).toHaveText(/Identity saved/);
  await expect(page.getByText("mylivingpage.com/avery-control", { exact: true })).toBeVisible();

  const security = page.locator("[data-settings-security]");
  await security.getByText("Change password", { exact: true }).click();
  await expect(security.getByLabel("Current password")).toBeVisible();
  await expect(security.locator("form label")).toHaveText([
    "Current password",
    "New password",
    "Confirm new password",
  ]);
});

test("settings remains usable at 320px and preserves the safe delete dialog path", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/dev/settings-preview");

  await expect(page.getByLabel("Public address username")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save public address" })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const deleteTrigger = page.getByRole("button", { name: "Start account deletion" });
  await deleteTrigger.scrollIntoViewIfNeeded();
  await deleteTrigger.click();

  const dialog = page.getByRole("alertdialog", { name: "Delete account" });
  const confirmation = page.getByLabel("Type avery-sample to confirm account deletion");
  await expect(dialog).toBeVisible();
  await expect(confirmation).toBeFocused();
  await expect(page.getByRole("button", { name: "Delete Forever" })).toBeDisabled();

  await confirmation.fill("avery-sample");
  await dialog.getByLabel("Current password").fill("correct-horse-battery-staple");
  await expect(page.getByRole("button", { name: "Delete Forever" })).toBeEnabled();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(deleteTrigger).toBeFocused();

  await deleteTrigger.click();
  await expect(dialog.getByLabel("Current password")).toHaveValue("");
});

test("provider accounts explain sign-in and require only the username confirmation to enable deletion", async ({
  page,
}) => {
  await page.unroute("**/api/profile");
  await page.route("**/api/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...previewProfile, plan: "spark", hasPassword: false }),
    });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/settings-preview");

  await expect(page.locator("[data-settings-provider-access]")).toContainText(
    "Provider sign-in is active",
  );
  await expect(page.locator("[data-settings-security]").getByText("Change password", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Start account deletion" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete account" });
  await dialog.getByLabel("Type avery-sample to confirm account deletion").fill("avery-sample");
  await expect(dialog.getByRole("button", { name: "Delete Forever" })).toBeEnabled();
  await expect(dialog.getByLabel("Current password")).toHaveCount(0);
});
