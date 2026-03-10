import { expect, test, type Page } from "@playwright/test";

const signupEmailDomain = process.env.PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN;
const appAuthEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
const appAuthPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;
const canRunSignupConfirmation = Boolean(signupEmailDomain);
const canRunAuthenticatedFlows = Boolean(appAuthEmail && appAuthPassword);

async function signIn(page: Page) {
  if (!appAuthEmail || !appAuthPassword) {
    throw new Error("Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD.");
  }

  await page.goto("/login");
  await page.getByPlaceholder("Email address").fill(appAuthEmail!);
  await page.getByPlaceholder("Password").fill(appAuthPassword!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("email signup shows a pending-confirmation message", async ({ page }) => {
  test.skip(!canRunSignupConfirmation, "Set PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN to run signup confirmation coverage.");

  const uniqueEmail = `signup-${Date.now()}@${signupEmailDomain}`;

  await page.goto("/signup");
  await page.getByRole("checkbox").check();
  await page.getByPlaceholder("Email address").fill(uniqueEmail);
  await page.getByPlaceholder("Create password").fill("PlaywrightPass123!");
  await page.getByRole("button", { name: "Create My Page" }).click();

  await expect(page.getByText("Check your email to confirm your account")).toBeVisible();
});

test("existing users can create, publish, edit, and change their public URL", async ({ page }) => {
  test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

  await signIn(page);

  await page.goto("/dashboard");
  const deleteButtons = page.getByRole("button", { name: "Delete" });
  while (await deleteButtons.count()) {
    page.once("dialog", (dialog) => dialog.accept());
    await deleteButtons.first().click();
    await page.waitForTimeout(500);
  }

  await page.getByRole("link", { name: "Create Your Page" }).click();
  await page.getByRole("button", { name: "Paste Resume" }).click();
  await page.getByRole("button", { name: "Load Sample" }).click();
  await page.getByRole("button", { name: "Continue to Theme Selection" }).click();
  await page.getByRole("button", { name: /Generate My Living Page|Preview My Living Page/ }).click();
  await expect(page.getByRole("button", { name: "Publish and Go Live" })).toBeVisible({ timeout: 45_000 });
  await page.getByRole("button", { name: "Publish and Go Live" }).click();
  await expect(page).not.toHaveURL(/\/create/);

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Edit" }).click();
  const headlineInput = page.locator('input[type="text"]').nth(1);
  await headlineInput.fill(`Updated headline ${Date.now()}`);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Saved successfully!")).toBeVisible();

  await page.goto("/dashboard/settings");
  const publicUrlInput = page.locator('input[type="text"]').nth(1);
  const nextSlug = `playwright-${Date.now()}`;
  await publicUrlInput.fill(nextSlug);
  await page.getByRole("button", { name: "Save" }).nth(1).click();
  await expect(page.getByText("Username updated")).toBeVisible();
});

test.fixme("Google signup/login callback flow", async () => {
  throw new Error("Requires dedicated OAuth test credentials and interactive provider automation.");
});

test.fixme("Avatar failure preservation and public view dedupe", async () => {
  throw new Error("Requires a seeded test project with storage and analytics fixtures.");
});
