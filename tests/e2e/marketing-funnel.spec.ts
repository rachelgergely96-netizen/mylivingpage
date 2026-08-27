import { expect, test, type Page } from "@playwright/test";

async function installPasswordRecoveryRequestMock(page: Page) {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const testWindow = window as typeof window & {
      __passwordRecoveryRequestUrl?: string;
    };

    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/auth/v1/recover")) {
        testWindow.__passwordRecoveryRequestUrl = url;
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return originalFetch(input, init);
    };
  });
}

async function getPasswordRecoveryRedirect(page: Page) {
  const requestUrl = await page.evaluate(
    () =>
      (window as typeof window & {
        __passwordRecoveryRequestUrl?: string;
      }).__passwordRecoveryRequestUrl ?? null,
  );

  return requestUrl
    ? new URL(requestUrl).searchParams.get("redirect_to")
    : null;
}

test("examples page matches the simpler Living Page and Resume PDF positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(
    page.getByRole("heading", {
      name: "See a Living Page in action.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Free · Private until published · Keep your résumé", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /After applying/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Recruiter interested/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Software engineer re-entering the market" }),
  ).toBeVisible();
  await expect(
    page.locator("[data-example-living-page] [data-resume-density='full']"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Open full sample/ })).toHaveCount(0);

  await page.getByRole("tab", { name: /Referral asks/ }).click();
  await expect(
    page.getByRole("heading", { name: "Designer moving into a new in-house role" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Turn your résumé into one link.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create my free page" }).first()).toHaveAttribute(
    "href",
    "/signup?ref=examples_nav_start&next=/create",
  );
});

test("signup page keeps the form above the fold while preserving create intent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup?ref=landing_start_free&next=/create");

  await expect(
    page.getByRole("heading", { name: "Let's get your page live." }),
  ).toBeVisible();
  await expect(
    page.getByText("You're a few minutes away from having something you can actually send."),
  ).toBeVisible();

  const googleButton = page.getByRole("button", { name: "Continue with Google" });
  const emailField = page.getByLabel("Email address");
  const passwordField = page.getByLabel("Create password");
  const submitButton = page.getByRole("button", { name: "Create my free page" });

  await expect(googleButton).toBeInViewport();
  await expect(emailField).toBeInViewport();
  await expect(passwordField).toBeInViewport();
  await expect(submitButton).toBeInViewport();
  expect(
    await submitButton.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    }),
  ).toBe(true);

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?next=%2Fcreate%3Fref%3Dlanding_start_free",
  );
});

test("password recovery preserves a safe deep link through the reset callback", async ({ page }) => {
  const next = "/dashboard/settings?tab=profile#security";
  const encodedNext = encodeURIComponent(next);

  await installPasswordRecoveryRequestMock(page);
  await page.goto(`/login?next=${encodedNext}`);
  const forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" });
  await expect(forgotPasswordLink).toHaveAttribute(
    "href",
    `/forgot-password?next=${encodedNext}`,
  );

  await forgotPasswordLink.click();
  await page.waitForURL((url) => url.pathname === "/forgot-password");
  const forgotPasswordUrl = new URL(page.url());
  expect(forgotPasswordUrl.pathname).toBe("/forgot-password");
  expect(forgotPasswordUrl.searchParams.get("next")).toBe(next);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    `/login?next=${encodedNext}`,
  );

  await page.getByLabel("Email address").fill("person@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText("Check your email for a password reset link."),
  ).toBeVisible();

  const resetRedirect = await getPasswordRecoveryRedirect(page);
  if (!resetRedirect) {
    throw new Error("The recovery request did not include a reset destination.");
  }
  const resetUrl = new URL(resetRedirect);
  expect(resetUrl.origin).toBe(forgotPasswordUrl.origin);
  expect(resetUrl.pathname).toBe("/reset-password");
  expect(resetUrl.searchParams.get("next")).toBe(next);
});

test("password recovery rejects an unsafe destination at every public handoff", async ({ page }) => {
  const unsafeNext = "//evil.example/steal";
  const encodedNext = encodeURIComponent(unsafeNext);

  await installPasswordRecoveryRequestMock(page);
  await page.goto(`/login?next=${encodedNext}`);
  await expect(
    page.getByRole("link", { name: "Forgot password?" }),
  ).toHaveAttribute("href", "/forgot-password");

  await page.goto(`/forgot-password?next=${encodedNext}`);
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );

  await page.getByLabel("Email address").fill("person@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText("Check your email for a password reset link."),
  ).toBeVisible();

  const resetRedirect = await getPasswordRecoveryRedirect(page);
  if (!resetRedirect) {
    throw new Error("The recovery request did not include a reset destination.");
  }
  const resetUrl = new URL(resetRedirect);
  expect(resetUrl.origin).toBe(new URL(page.url()).origin);
  expect(resetUrl.pathname).toBe("/reset-password");
  expect(resetUrl.search).toBe("");
});
