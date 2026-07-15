import { expect, test, type Page } from "@playwright/test";
import type { PageVariant } from "../../src/types/resume";
import {
  canRunAdminFixtureFlows,
  canRunAuthenticatedFlows,
  canRunFailureInjectionFlows,
  canRunGoogleOAuthFlows,
  canRunSignupConfirmation,
  clearPagesForProfile,
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
  seedPageAnalyticsHistory,
  setBillingStateForProfile,
  setPageConfigForPage,
  setPlanForProfile,
  signIn,
  uploadAvatarViaApi,
} from "./support";

const hasTurnstileConfigured = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
const LEGACY_CREATE_DRAFT_KEY = "mlp-draft-create";

function trackParsePosts(page: Page) {
  const parseRequests: string[] = [];

  page.on("request", (request) => {
    if (
      request.url().includes("/api/generate/parse") &&
      request.method() === "POST"
    ) {
      parseRequests.push(request.url());
    }
  });

  return parseRequests;
}

async function completeGuidedResumeEntry(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Let's start with who you are" }),
  ).toBeVisible();
  await page.getByPlaceholder("Jane Smith").fill("Ray");
  await page
    .getByPlaceholder("Senior Software Engineer")
    .fill("Attorney & Technology Entrepreneur");
  await page.getByPlaceholder("San Francisco, CA").fill("New York, NY");
  await page.getByPlaceholder("jane@example.com").fill("ray@email.com");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Where can people find you?" }),
  ).toBeVisible();
  await page
    .getByPlaceholder("linkedin.com/in/janesmith")
    .fill("linkedin.com/in/ray");
  await page.getByPlaceholder("janesmith").fill("ray-dev");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Tell me about your experience" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ Add a role" }).click();
  await page.getByPlaceholder("Job Title").fill("Founder & CEO");
  await page.getByPlaceholder("Company").fill("BarPrepPlay");
  await page
    .getByPlaceholder(/Led migration to microservices/)
    .fill("Built legal education product for bar exam prep.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Education and credentials" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Skills and projects" }),
  ).toBeVisible();
  await page
    .getByPlaceholder("Category (e.g. Languages, Tools)")
    .fill("Core");
  await page
    .getByPlaceholder("TypeScript, React, Node.js")
    .fill("Legal Research, Product Strategy");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "The finishing touches" }),
  ).toBeVisible();
  await page
    .getByPlaceholder(/Full-stack engineer with 8 years/)
    .fill(
      "Licensed attorney in New York building at the intersection of law and technology.",
    );
  await page
    .getByRole("button", { name: "Continue to Theme Selection" })
    .click();

  await expect(
    page.getByRole("heading", {
      name: "This is what someone will see when you send it.",
    }),
  ).toBeVisible({ timeout: 45_000 });
}

test("email signup shows a pending-confirmation message", async ({ page }) => {
  test.skip(
    !canRunSignupConfirmation,
    "Set PLAYWRIGHT_SIGNUP_EMAIL_DOMAIN and PLAYWRIGHT_EXPECT_SIGNUP_CONFIRMATION=1 to run signup confirmation coverage.",
  );
  test.skip(
    hasTurnstileConfigured,
    "Turnstile-protected signup requires a dedicated test key or explicit CAPTCHA bypass flow.",
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
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright auth and Supabase service-role env vars to run deterministic create coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await clearPagesForProfile(profile.id);
    await setPlanForProfile(profile.id, "spark");
    const parseRequests = trackParsePosts(page);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Create Your Page" }).click();
    await completeGuidedResumeEntry(page);
    await expect(page.getByText("Resume PDF")).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish Page" })).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "Publish Page" }).click();
    await expect(page.getByRole("heading", { name: "Your page is live." })).toBeVisible({ timeout: 45_000 });
    expect(parseRequests).toEqual([]);

    await page.goto("/dashboard");
    await page.getByRole("link", { name: "Edit Page" }).click();
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

  test("free users can publish without checkout or a payment method", async ({ page }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright auth and Supabase service-role env vars to run free publish coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await clearPagesForProfile(profile.id);
    await setBillingStateForProfile(profile.id, {
      plan: "spark",
      billingCohort: "publish_cc_trial_v1",
      stripeSubscriptionStatus: null,
      stripeTrialEndsAt: null,
    });

    const parseRequests = trackParsePosts(page);
    const checkoutRequests: string[] = [];
    page.on("request", (request) => {
      if (
        request.url().includes("/api/stripe/checkout") &&
        request.method() === "POST"
      ) {
        checkoutRequests.push(request.url());
      }
    });

    await page.goto("/create");
    await completeGuidedResumeEntry(page);

    const publishButton = page.getByRole("button", { name: "Publish Page" });
    await expect(publishButton).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "Choose Plan to Publish" })).toHaveCount(0);
    await publishButton.click();
    await expect(
      page.getByRole("heading", { name: "Your page is live." }),
    ).toBeVisible({ timeout: 45_000 });

    await page.goto("/dashboard/settings");
    await expect(page.getByText("No card or subscription required")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start (Starter|Pro) Trial/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);
    expect(parseRequests).toEqual([]);
    expect(checkoutRequests).toEqual([]);
  });

  test("signup intent can carry a create ref into the flow for existing users", async ({ page }) => {
    test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

    await page.goto("/signup?ref=landing_self_test&next=/create");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcreate%3Fref%3Dlanding_self_test/);

    await page.getByPlaceholder("Email address").fill(process.env.PLAYWRIGHT_TEST_EMAIL ?? "");
    await page.getByPlaceholder("Password").fill(process.env.PLAYWRIGHT_TEST_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/create\?ref=landing_self_test/);
    await expect(page.getByRole("heading", { name: "Add your info" })).toBeVisible();
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
          resumeText: "",
          guidedData: {
            name: "Legacy User",
            headline: "Legacy Headline",
          },
          parsedData: null,
          selectedTheme: "cosmic",
          step: "input",
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
          resumeText: "",
          guidedData: {
            name: "Scoped User",
            headline: "Scoped Headline",
          },
          parsedData: null,
          selectedTheme: "cosmic",
          step: "input",
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
    await page.getByPlaceholder("Jane Smith").fill("Fresh Scoped User");
    await page
      .getByPlaceholder("Senior Software Engineer")
      .fill("Product Counsel");
    await page.waitForTimeout(1200);

    await page.reload();
    await expect(page.getByText("You have an unsaved draft")).toBeVisible();
  });

  test("guided entry reaches review without calling the retired parsing provider", async ({ page }) => {
    test.skip(!canRunAuthenticatedFlows, "Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD to run authenticated browser flows.");

    await signIn(page);
    const parseRequests = trackParsePosts(page);

    await page.goto("/create");
    await expect(page.getByPlaceholder("Paste your info here...")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Load Sample" })).toHaveCount(0);
    await completeGuidedResumeEntry(page);
    expect(parseRequests).toEqual([]);
  });

  test("public Resume PDF download appears on live pages for owners and viewers", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run public download coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "spark");
    await ensureLivePageForProfile(profile);

    await page.goto(`/${profile.username}`);
    await expect(page.getByRole("button", { name: "Download Resume PDF" })).toBeVisible();
    const ownerDownloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Resume PDF" }).click();
    const ownerDownload = await ownerDownloadPromise;
    expect(ownerDownload.suggestedFilename()).toContain("resume.pdf");

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`/${profile.username}`);
    await expect(viewerPage.getByRole("button", { name: "Download Resume PDF" })).toBeVisible();
    const viewerDownloadPromise = viewerPage.waitForEvent("download");
    await viewerPage.getByRole("button", { name: "Download Resume PDF" }).click();
    const viewerDownload = await viewerDownloadPromise;
    expect(viewerDownload.suggestedFilename()).toContain("resume.pdf");
    await viewerContext.close();
  });

  test("public recruiter skim only appears for qualifying targeted versions and stays collapsed until expanded", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run public recruiter skim coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "pro");
    const livePage = await ensureLivePageForProfile(profile);
    const recruiterVariant: PageVariant = {
      id: "playwright-recruiter-variant",
      slug: "playwright-recruiter-variant",
      label: "Recruiter reply version",
      roleTitle: "Staff Product Leader",
      headline: "Staff Product Manager",
      summary:
        "Staff product leader helping teams simplify complex launches and scale internal platforms.",
      featuredStatLabels: ["Builds Shipped"],
      featuredProjectNames: ["Pipeline Pulse"],
      sectionOrder: [
        "summary",
        "stats",
        "experience",
        "projects",
        "skills",
        "education",
        "certifications",
      ],
      ctaEmphasis: "Open to staff product leadership roles",
    };
    await setPageConfigForPage(livePage.id, {
      variants: [recruiterVariant],
    });

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();

    await viewerPage.goto(`/${profile.username}`);
    await expect(viewerPage.getByTestId("recruiter-skim-panel")).toHaveCount(0);

    const assertRecruiterSkimDisclosure = async (viewport: { width: number; height: number }) => {
      await viewerPage.setViewportSize(viewport);
      await viewerPage.goto(`/${profile.username}?v=${recruiterVariant.id}`);

      const panel = viewerPage.getByTestId("recruiter-skim-panel");
      const expandButton = panel.getByRole("button", { name: "Expand recruiter skim" });

      await expect(panel).toBeVisible();
      await expect(panel.getByText("Recruiter reply version")).toBeVisible();
      await expect(panel.getByText("Staff Product Leader")).toBeVisible();
      await expect(panel.getByText("12 Builds Shipped")).toBeVisible();
      await expect(panel.getByText("Featured work: Pipeline Pulse")).toBeVisible();
      await expect(expandButton).toBeVisible();
      await expect(expandButton).toHaveAttribute("aria-expanded", "false");
      await expect(panel.getByTestId("recruiter-skim-content")).toHaveCount(0);
      await expect(panel.getByRole("button", { name: "Download Resume PDF" })).toHaveCount(0);
      await expect(panel.getByRole("link", { name: "Email" })).toHaveCount(0);
      await expect(panel.getByRole("link", { name: "Open current page" })).toHaveCount(0);

      await expandButton.click();

      await expect(panel.getByRole("button", { name: "Collapse recruiter skim" })).toBeVisible();
      await expect(panel.getByRole("button", { name: "Collapse recruiter skim" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      await expect(panel.getByTestId("recruiter-skim-content")).toBeVisible();
      await expect(panel.getByRole("button", { name: "Download Resume PDF" })).toBeVisible();
      await expect(panel.getByRole("link", { name: "Email" })).toBeVisible();
      await expect(panel.getByRole("link", { name: "LinkedIn" })).toHaveCount(0);
      await expect(panel.getByRole("link", { name: "Open current page" })).toBeVisible();
      await expect(panel.getByText("Target role")).toBeVisible();
      await expect(panel.getByText("Staff Product Leader")).toBeVisible();
      await expect(
        panel.getByText("Staff product leader helping teams simplify complex launches and scale internal platforms."),
      ).toBeVisible();
      await expect(panel.getByText("Open to staff product leadership roles")).toBeVisible();
      await expect(panel.getByText("Pipeline Pulse")).toBeVisible();
      await expect(panel.getByText("Featured work sample")).toBeVisible();
      await expect(panel.getByText("Full-stack engineer with 8 years of experience")).toHaveCount(0);
      await expect(panel.getByText("Senior Full-Stack Engineer")).toHaveCount(0);
      await expect(panel.getByText("Top proof")).toHaveCount(0);
    };

    await assertRecruiterSkimDisclosure({ width: 390, height: 844 });
    await assertRecruiterSkimDisclosure({ width: 1280, height: 900 });

    await viewerContext.close();
  });

  test("public page keeps Resume PDF and share actions stacked without overlap for owners", async ({ page }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run public mobile action-dock coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "spark");
    await ensureLivePageForProfile(profile);

    const assertStackedDock = async () => {
      const downloadButton = page.getByRole("button", { name: "Download Resume PDF" });
      const shareButton = page.getByRole("button", { name: /Share / });

      await expect(downloadButton).toBeVisible();
      await expect(shareButton).toBeVisible();

      const [downloadBox, shareBox] = await Promise.all([
        downloadButton.boundingBox(),
        shareButton.boundingBox(),
      ]);

      expect(downloadBox).toBeTruthy();
      expect(shareBox).toBeTruthy();

      const overlaps =
        (downloadBox?.x ?? 0) < (shareBox?.x ?? 0) + (shareBox?.width ?? 0) &&
        (shareBox?.x ?? 0) < (downloadBox?.x ?? 0) + (downloadBox?.width ?? 0) &&
        (downloadBox?.y ?? 0) < (shareBox?.y ?? 0) + (shareBox?.height ?? 0) &&
        (shareBox?.y ?? 0) < (downloadBox?.y ?? 0) + (downloadBox?.height ?? 0);

      expect(overlaps).toBe(false);
      expect((shareBox?.y ?? 0) >= (downloadBox?.y ?? 0) + (downloadBox?.height ?? 0)).toBe(true);
    };

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${profile.username}`);
    await assertStackedDock();

    await page.setViewportSize({ width: 1280, height: 900 });
    await assertStackedDock();
  });

  test("logged-out visitors see the subtle signup prompt on public pages", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run public prompt coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await ensureLivePageForProfile(profile);

    await page.goto(`/${profile.username}`);
    await expect(page.getByTestId("public-page-signup-prompt")).toHaveCount(0);

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`/${profile.username}`);

    const prompt = viewerPage.getByTestId("public-page-signup-prompt");
    await expect(prompt).toBeVisible();
    await expect(
      prompt.getByRole("link", { name: /Make your own Living Page/i }),
    ).toHaveAttribute("href", "/signup?ref=public_page_prompt&next=/create");

    await viewerContext.close();
  });

  test("public action dock shows the Resume PDF error above the stacked controls", async ({ page }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright Supabase service-role env vars to run public mobile action-dock coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setPlanForProfile(profile.id, "spark");
    await ensureLivePageForProfile(profile);

    await page.route("**/api/resume/export", async (route) => {
      await route.fulfill({
        status: 422,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Unable to export the Resume PDF right now. Please try again.",
        }),
      });
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${profile.username}`);

    const downloadButton = page.getByRole("button", { name: "Download Resume PDF" });
    const shareButton = page.getByRole("button", { name: /Share / });

    await expect(downloadButton).toBeVisible();
    await expect(shareButton).toBeVisible();

    await downloadButton.click();

    const errorCallout = page.getByTestId("public-action-dock-error");
    await expect(errorCallout).toBeVisible();

    const [errorBox, shareBox] = await Promise.all([
      errorCallout.boundingBox(),
      shareButton.boundingBox(),
    ]);

    expect(errorBox).toBeTruthy();
    expect(shareBox).toBeTruthy();
    expect((errorBox?.y ?? 0) + (errorBox?.height ?? 0) <= (shareBox?.y ?? 0)).toBe(true);
  });

  test("free access remains available across historical subscription states", async ({ page, browser }) => {
    test.skip(
      !canRunAdminFixtureFlows,
      "Set Playwright auth and Supabase service-role env vars to run subscription transition coverage.",
    );

    await signIn(page);
    const profile = await getProfileFixtureByEmail();
    await setBillingStateForProfile(profile.id, {
      plan: "spark",
      billingCohort: "publish_cc_trial_v1",
      stripeSubscriptionStatus: null,
      stripeTrialEndsAt: null,
    });
    await ensureLivePageForProfile(profile);

    await page.goto("/dashboard/settings");
    await expect(page.getByText("Free access")).toBeVisible();
    await expect(page.getByText("No card or subscription required")).toBeVisible();
    await expect(page.getByRole("button", { name: /Start (Starter|Pro) Trial/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Manage Subscription" })).toHaveCount(0);

    await setBillingStateForProfile(profile.id, {
      plan: "starter",
      billingCohort: "publish_cc_trial_v1",
      stripeSubscriptionStatus: "active",
      stripeTrialEndsAt: null,
    });
    await page.goto("/dashboard/settings");
    await expect(page.getByText("Existing Starter subscription detected")).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage Subscription" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Upgrade to Pro" })).toHaveCount(0);

    await setBillingStateForProfile(profile.id, {
      plan: "spark",
      billingCohort: "publish_cc_trial_v1",
      stripeSubscriptionStatus: "canceled",
      stripeTrialEndsAt: null,
    });

    const viewerContext = await browser.newContext();
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`/${profile.username}`);
    await expect(viewerPage.getByText("Page unavailable")).toHaveCount(0);
    await expect(viewerPage.getByRole("button", { name: "Download Resume PDF" })).toBeVisible();
    await viewerContext.close();

    await page.goto("/dashboard/settings");
    await expect(page.getByText("Free access")).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage Subscription" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Start (Starter|Pro) Trial/ })).toHaveCount(0);
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
      "2 people looked in this range.",
    );
    await expect(page.getByTestId("analytics-stat-views")).toContainText("2");

    await page.getByRole("link", { name: "7 days" }).click();
    await page.waitForURL(new RegExp(`/dashboard/analytics/${livePage.id}\\?range=7d`));
    await expect(page.getByTestId("analytics-trend-total")).toHaveText(
      "1 person looked in this range.",
    );
    await expect(page.getByTestId("analytics-stat-views")).toContainText("1");

    await page.getByRole("link", { name: "90 days" }).click();
    await page.waitForURL(new RegExp(`/dashboard/analytics/${livePage.id}\\?range=90d`));
    await expect(page.getByTestId("analytics-trend-total")).toHaveText(
      "3 people looked in this range.",
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
