import { expect, test } from "@playwright/test";

test("examples page matches the simpler Living Page and Resume PDF positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(
    page.getByRole("heading", {
      name: "See what someone sees when they open your link.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Use your résumé PDF when an application asks for a file.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /After applying/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /A recruiter is interested/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByRole("heading", { name: "Software engineer re-entering the market" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Open full sample for Avery Sample/ }),
  ).toBeVisible();

  await page.getByRole("tab", { name: /A referral asks/ }).click();
  await expect(
    page.getByRole("heading", { name: "Designer moving into a new in-house role" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Turn your résumé into a page you can send as one link.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Your Page (Free)" }).first()).toHaveAttribute(
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

  const googleButton = page.getByRole("button", { name: "Create Your Page with Google" });
  const emailField = page.getByPlaceholder("Email address");
  const passwordField = page.getByPlaceholder("Create password");
  const submitButton = page.getByRole("button", { name: "Create My Page" });

  await expect(googleButton).toBeInViewport();
  await expect(emailField).toBeInViewport();
  await expect(passwordField).toBeInViewport();
  await expect(submitButton).toBeInViewport();

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?next=%2Fcreate%3Fref%3Dlanding_start_free",
  );
});
