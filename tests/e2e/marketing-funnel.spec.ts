import { expect, test } from "@playwright/test";

test("examples page matches the simpler Living Page and Resume PDF positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(
    page.getByRole("heading", {
      name: "See a Living Page in action.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Keep your résumé for file uploads.", {
      exact: false,
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
    page.getByRole("button", { name: /Open full sample for Avery Sample/ }),
  ).toBeVisible();

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
  const emailField = page.getByPlaceholder("Email address");
  const passwordField = page.getByPlaceholder("Create password");
  const submitButton = page.getByRole("button", { name: "Create my free page" });

  await expect(googleButton).toBeInViewport();
  await expect(emailField).toBeInViewport();
  await expect(passwordField).toBeInViewport();
  await expect(submitButton).toBeInViewport();

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?next=%2Fcreate%3Fref%3Dlanding_start_free",
  );
});
