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
  expectAvatarToResolveTo,
  fetchCurrentProfile,
  getGoogleCredentials,
  getLatestPageEngagementState,
  getPageViewState,
  getProfileFixtureByEmail,
  getSignupEmailDomain,
  removeAvatarViaApi,
  sendStripeWebhook,
  seedPageAnalyticsHistory,
  setPublicAtsDownloadState,
  setPlanForProfile,
  signIn,
  uploadAvatarViaApi,
} from "./support";

const LEGACY_CREATE_DRAFT_KEY = "mlp-draft-create";

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
  await page.getByRole("button", { name: "Start From My Resume" }).click();

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
    await page.getByRole("button", { name: "Run ATS Review" }).click();
    await expect(page.getByTestId("ats-review-panel")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("Review the ATS version before you continue")).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Use This ATS Version" }).click();
    await page.getByRole("button", { name: "Preview My Living Page" }).click();
    await expect(page.getByRole("button", { name: "Publish and Go Live" })).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Publish and Go Live" }).click();
    await expect(page).not.toHaveURL(/\/create/);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Edit" }).click();
    const headlineInput = page.locator('input[type="text"]').nth(1);
    await headlineInput.fill(`Updated headline ${Date.now()}`);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByRole("button", { name: "Save With This ATS Version" })).toBeVisible();
    await page.getByRole("button", { name: "Save With This ATS Version" }).click();
    await expect(page.getByText("Saved successfully!")).toBeVisible();

    await page.goto("/dashboard/settings");
    const publicUrlInput = page.locator('input[type="text"]').nth(1);
    const nextSlug = `playwright-${Date.now()}`;
    await publicUrlInput.fill(nextSlug);
    await page.getByRole("button", { name: "Save" }).nth(1).click();
    await expect(page.getByText("Username updated")).toBeVisible();
  });

  test("signup intent can carry an ATS-focused ref into the create flow for existing users", async ({ page }) => {
    test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

    await page.goto("/signup?ref=landing_self_test&next=/create");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcreate%3Fref%3Dlanding_self_test/);

    await page.getByPlaceholder("Email address").fill(process.env.PLAYWRIGHT_TEST_EMAIL ?? "");
    await page.getByPlaceholder("Password").fill(process.env.PLAYWRIGHT_TEST_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/create\?ref=landing_self_test/);
    await expect(page.getByRole("heading", { name: "Start from the ATS-safe resume you already use." })).toBeVisible();
    await expect(page.getByText("Recommended")).toBeVisible();
  });

  test("legacy global create drafts are ignored for the signed-in user", async ({ page }) => {
    test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

    await signIn(page);
    await page.goto("/dashboard");

    await page.evaluate(([legacyKey, payload]) => {
      window.localStorage.setItem(legacyKey, payload);
    }, [
      LEGACY_CREATE_DRAFT_KEY,
      JSON.stringify({
        data: {
          resumeText: "Legacy draft text",
          guidedData: { name: "Legacy User" },
          parsedData: null,
          selectedTheme: "cosmic",
          inputMode: "paste",
          step: "input",
          atsTargeting: {
            primaryTitle: "",
            titleVariants: [],
            jobDescription: "",
            lastExtractedKeywords: [],
          },
          atsReview: null,
        },
        savedAt: Date.now(),
      }),
    ]);

    await page.goto("/create");
    await expect(page.getByText("You have an unsaved draft")).toHaveCount(0);
  });

  test("scoped create drafts are shown only for the matching signed-in user", async ({ page }) => {
    test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

    await signIn(page);
    const profile = await fetchCurrentProfile(page);
    await page.goto("/dashboard");

    await page.evaluate(([scopedKey, payload]) => {
      window.localStorage.setItem(scopedKey, payload);
    }, [
      `mlp-draft-create-${profile.id}`,
      JSON.stringify({
        data: {
          resumeText: "Scoped draft text",
          guidedData: { name: "Scoped User" },
          parsedData: null,
          selectedTheme: "cosmic",
          inputMode: "paste",
          step: "input",
          atsTargeting: {
            primaryTitle: "",
            titleVariants: [],
            jobDescription: "",
            lastExtractedKeywords: [],
          },
          atsReview: null,
        },
        savedAt: Date.now(),
      }),
    ]);

    await page.goto("/create");
    await expect(page.getByText("You have an unsaved draft")).toBeVisible();
  });

  test("create drafts persist only for the same signed-in user after they start typing", async ({ page }) => {
    test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

    await signIn(page);
    await page.goto("/create");
    await page.getByRole("button", { name: "Paste Resume" }).click();
    await page.getByPlaceholder("Paste your resume text here...").fill("Fresh scoped draft");
    await page.waitForTimeout(1200);

    await page.reload();
    await expect(page.getByText("You have an unsaved draft")).toBeVisible();
  });

  test("public ATS download only appears when an approved ATS resume exists", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run ATS public download coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "pro");
    const livePage = await ensureLivePageForProfile(profile);

    await setPublicAtsDownloadState(livePage.id, "needs_review");
    await page.goto(`/${profile.username}`);
    await expect(page.getByText("ATS PDF not ready")).toBeVisible();
    await expect(page.getByRole("button", { name: "Download ATS PDF" })).toHaveCount(0);

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`/${profile.username}`);
    await expect(viewerPage.getByText("ATS PDF not ready")).toHaveCount(0);
    await expect(viewerPage.getByRole("button", { name: "Download ATS PDF" })).toHaveCount(0);
    await viewerContext.close();

    await setPublicAtsDownloadState(livePage.id, "ready");
    await page.reload();
    await expect(page.getByRole("button", { name: "Download ATS PDF" })).toBeVisible();
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
    await expectAvatarToResolveTo(page, firstAvatarUrl);

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

    const ownerTrackingResponsePromise = page.waitForResponse((response) =>
      response.url().includes("/api/pages/view"),
    );
    await page.goto(`/${profile.username}`);
    const ownerTrackingResponse = await ownerTrackingResponsePromise;
    const ownerTrackingPayload = (await ownerTrackingResponse.json()) as {
      ignored?: boolean;
      pageViewId?: string;
    };
    expect(ownerTrackingPayload.ignored).toBe(true);
    expect(ownerTrackingPayload.pageViewId).toBeUndefined();
    await expect(await getPageViewState(livePage.id)).toEqual({
      pageViews: 0,
      pageViewRows: 0,
    });

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    const firstViewerTrackingResponsePromise = viewerPage.waitForResponse((response) =>
      response.url().includes("/api/pages/view"),
    );
    await viewerPage.goto(`/${profile.username}`);
    const firstViewerTrackingResponse = await firstViewerTrackingResponsePromise;
    const firstViewerTrackingPayload = (await firstViewerTrackingResponse.json()) as {
      deduped?: boolean;
      pageViewId?: string;
    };
    expect(firstViewerTrackingPayload.deduped).toBeUndefined();
    expect(firstViewerTrackingPayload.pageViewId).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
    await expect.poll(() => getPageViewState(livePage.id)).toEqual({
      pageViews: 1,
      pageViewRows: 1,
    });

    const secondViewerTrackingResponsePromise = viewerPage.waitForResponse((response) =>
      response.url().includes("/api/pages/view"),
    );
    await viewerPage.reload();
    const secondViewerTrackingResponse = await secondViewerTrackingResponsePromise;
    const secondViewerTrackingPayload = (await secondViewerTrackingResponse.json()) as {
      deduped?: boolean;
      pageViewId?: string;
    };
    expect(secondViewerTrackingPayload.deduped).toBe(true);
    expect(secondViewerTrackingPayload.pageViewId).toBe(
      firstViewerTrackingPayload.pageViewId,
    );
    await expect.poll(() => getPageViewState(livePage.id)).toEqual({
      pageViews: 1,
      pageViewRows: 1,
    });

    await viewerContext.close();
  });

  test("public engagement tracking records clicks and content signals", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run analytics release coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    const livePage = await ensureLivePageForProfile(profile);
    await clearPageViewState(livePage.id);

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    await viewerPage.goto(`/${profile.username}`);
    await viewerPage.waitForResponse((response) => response.url().includes("/api/pages/view"));

    await viewerPage.locator("[data-analytics-section='projects']").scrollIntoViewIfNeeded();
    await viewerPage.waitForTimeout(750);
    await viewerPage
      .locator("a[href^='mailto:']")
      .evaluate((element) => (element as HTMLAnchorElement).click());
    await viewerPage.waitForTimeout(500);
    await viewerPage.goto("about:blank");

    await expect
      .poll(() => getLatestPageEngagementState(livePage.id))
      .toMatchObject({
        hadOutboundClick: true,
      });

    const engagementState = await getLatestPageEngagementState(livePage.id);
    expect(engagementState.pageViewId).toBeTruthy();
    expect(engagementState.engagedSeconds).toBeGreaterThan(0);
    expect(engagementState.maxScrollDepthPct).toBeGreaterThan(25);
    expect(engagementState.primarySection).toBeTruthy();
    expect(engagementState.interactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target_key: "email",
        }),
      ]),
    );

    await viewerContext.close();
  });

  test("analytics dashboard range filters swap the selected window", async ({ page }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run analytics release coverage.",
    );

    const daysAgo = (days: number) =>
      new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "pro");
    const livePage = await ensureLivePageForProfile(profile);
    await clearPageViewState(livePage.id);
    await seedPageAnalyticsHistory(livePage.id, [
      {
        viewedAt: daysAgo(2),
        viewerIp: "seed-range-1",
        referrer: "https://www.linkedin.com/feed/",
        userAgent: "Mozilla/5.0",
        country: "US",
        engagedSeconds: 95,
        maxScrollDepthPct: 88,
        primarySection: "projects",
        hadOutboundClick: true,
        clicks: [{ targetKey: "project", targetLabel: "TraceBoard", clickCount: 1 }],
      },
      {
        viewedAt: daysAgo(20),
        viewerIp: "seed-range-2",
        referrer: null,
        userAgent: "Mozilla/5.0 (iPhone)",
        country: "CA",
        engagedSeconds: 45,
        maxScrollDepthPct: 62,
        primarySection: "experience",
      },
      {
        viewedAt: daysAgo(60),
        viewerIp: "seed-range-3",
        referrer: "https://example.com/ref",
        userAgent: "Mozilla/5.0 (iPad)",
        country: "GB",
      },
    ]);

    await page.goto(`/dashboard/analytics/${livePage.id}`);
    await expect(page.getByTestId("analytics-trend-total")).toHaveText(
      "2 views in this range.",
    );
    await expect(page.getByTestId("analytics-stat-views")).toContainText("2");

    await page.getByRole("link", { name: "7 days" }).click();
    await page.waitForURL(new RegExp(`/dashboard/analytics/${livePage.id}\\?range=7d`));
    await expect(page.getByTestId("analytics-trend-total")).toHaveText(
      "1 views in this range.",
    );
    await expect(page.getByTestId("analytics-stat-views")).toContainText("1");

    await page.getByRole("link", { name: "90 days" }).click();
    await page.waitForURL(new RegExp(`/dashboard/analytics/${livePage.id}\\?range=90d`));
    await expect(page.getByTestId("analytics-trend-total")).toHaveText(
      "3 views in this range.",
    );
    await expect(page.getByTestId("analytics-stat-views")).toContainText("3");
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
