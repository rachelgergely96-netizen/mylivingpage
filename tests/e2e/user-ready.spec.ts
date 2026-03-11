import { expect, test } from "@playwright/test";
import {
  buildCheckoutCompletedEvent,
  buildSubscriptionDeletedEvent,
  canRunAdminFixtureFlows,
  canRunAuthenticatedFlows,
  canRunBillingFlows,
  canRunFailureInjectionFlows,
  canRunGoogleOAuthFlows,
  canRunSignupConfirmation,
  clearPageViewState,
  ensureLivePageForProfile,
  fetchCurrentProfile,
  getGoogleCredentials,
  getPageViewState,
  getProfileFixtureByEmail,
  getSignupEmailDomain,
  removeAvatarViaApi,
  sendStripeWebhook,
  setPlanForProfile,
  signIn,
  uploadAvatarViaApi,
} from "./support";

test("email signup shows a pending-confirmation message", async ({ page }) => {
  test.skip(
    !canRunSignupConfirmation,
    "Set PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN and PLAYWRIGHT_EXPECT_SIGNUP_CONFIRMATION=1 to run signup confirmation coverage.",
  );

  const uniqueEmail = `signup-${Date.now()}@${getSignupEmailDomain()}`;

  await page.goto("/signup");
  await page.getByRole("checkbox").check();
  await page.getByPlaceholder("Email address").fill(uniqueEmail);
  await page.getByPlaceholder("Create password").fill("PlaywrightPass123!");
  await page.getByRole("button", { name: "Create My Page" }).click();

  await expect(page.getByText("Check your email to confirm your account")).toBeVisible();
});

test.describe.serial("authenticated user journeys", () => {
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

  test("billing checkout, webhook unlock, portal access, and downgrade stay healthy", async ({ page }) => {
    test.skip(
      !canRunBillingFlows,
      "Set Playwright Supabase and Stripe env vars to run billing release coverage.",
    );

    await signIn(page);
    let profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "spark");
    await ensureLivePageForProfile(profile);

    await page.goto("/dashboard/settings");
    const checkoutResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/stripe/checkout") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: /Upgrade to Pro/ }).click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.ok()).toBeTruthy();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });

    profile = await getProfileFixtureByEmail();
    expect(profile.stripe_customer_id).toBeTruthy();

    await sendStripeWebhook(page.context().request, await buildCheckoutCompletedEvent(profile));

    await page.goto("/dashboard/settings?upgraded=true");
    await expect(page.getByRole("button", { name: "Manage Subscription" })).toBeVisible();
    await expect(page.getByText("Welcome to Pro! Your premium features are now active.")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /^Analytics$/ })).toBeVisible();

    await page.goto("/dashboard/settings");
    const portalResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/stripe/portal") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Manage Subscription" }).click();
    const portalResponse = await portalResponsePromise;
    expect(portalResponse.ok()).toBeTruthy();
    await page.waitForURL(/billing\.stripe\.com/, { timeout: 30_000 });

    profile = await getProfileFixtureByEmail();
    await sendStripeWebhook(page.context().request, await buildSubscriptionDeletedEvent(profile));
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("button", { name: /Upgrade to Pro/ })).toBeVisible();
  });

  test("avatar replacement failures preserve the current avatar", async ({ page }) => {
    test.skip(
      !canRunFailureInjectionFlows,
      "Set ENABLE_E2E_FAILURE_INJECTION=1 and authenticated Playwright creds to run avatar safety coverage.",
    );

    await signIn(page);

    const firstUpload = await uploadAvatarViaApi(page);
    expect(firstUpload.ok()).toBeTruthy();
    const firstUploadPayload = (await firstUpload.json()) as { url: string };
    const firstAvatarUrl = firstUploadPayload.url;

    const failedReplacement = await uploadAvatarViaApi(page, { injectFailure: true });
    expect(failedReplacement.status()).toBe(500);

    const profile = await fetchCurrentProfile(page);
    expect(profile.avatar_url).toBe(firstAvatarUrl);

    await page.goto("/dashboard/settings");
    await expect(page.getByAltText("Avatar")).toHaveAttribute("src", firstAvatarUrl);

    const cleanupResponse = await removeAvatarViaApi(page);
    expect(cleanupResponse.ok()).toBeTruthy();
  });

  test("public view tracking ignores owner visits and dedupes repeat anonymous views", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run analytics release coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    const livePage = await ensureLivePageForProfile(profile);
    await clearPageViewState(livePage.id);

    await page.goto(`/${profile.username}`);
    await page.waitForResponse((response) => response.url().includes("/api/pages/view"));
    await expect(await getPageViewState(livePage.id)).toEqual({
      pageViews: 0,
      pageViewRows: 0,
    });

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    await viewerPage.goto(`/${profile.username}`);
    await viewerPage.waitForResponse((response) => response.url().includes("/api/pages/view"));
    await expect.poll(() => getPageViewState(livePage.id)).toEqual({
      pageViews: 1,
      pageViewRows: 1,
    });

    await viewerPage.reload();
    await viewerPage.waitForResponse((response) => response.url().includes("/api/pages/view"));
    await expect.poll(() => getPageViewState(livePage.id)).toEqual({
      pageViews: 1,
      pageViewRows: 1,
    });

    await viewerContext.close();
  });
});

test("Google signup/login callback flow", async ({ page }) => {
  test.skip(
    !canRunGoogleOAuthFlows,
    "Set PLAYWRIGHT_GOOGLE_EMAIL and PLAYWRIGHT_GOOGLE_PASSWORD to run Google OAuth coverage.",
  );

  const google = getGoogleCredentials();

  await page.goto("/login");
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await page.waitForURL(/accounts\.google\.com/, { timeout: 30_000 });

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
    await emailInput.fill(google.email);
    await page.getByRole("button", { name: /Next/ }).click();
  }

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill(google.password);
  await page.getByRole("button", { name: /Next/ }).click();

  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
});
