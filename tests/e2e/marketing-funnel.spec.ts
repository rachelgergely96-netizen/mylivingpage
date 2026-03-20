import { expect, test } from "@playwright/test";

test("examples page matches the simpler Living Page and Resume PDF positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(page.getByRole("heading", { name: "See what the human click can look like after the application is already in." })).toBeVisible();
  await expect(
    page.getByText("once someone opens your link and wants faster context."),
  ).toBeVisible();
  await expect(page.getByText("After you apply", { exact: true })).toBeVisible();
  await expect(page.getByText("Why this helps a human", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Use the PDF", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Open large preview" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ready to publish one page and keep the PDF aligned?" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Your Free Month" }).first()).toHaveAttribute(
    "href",
    "/signup?ref=examples_nav_start&next=/create",
  );
});

test("signup page keeps the form above the fold while preserving create intent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/signup?ref=landing_start_free&next=/create");

  await expect(
    page.getByRole("heading", { name: "Start from the resume you already use." }),
  ).toBeVisible();
  await expect(
    page.getByText("Keep your resume intact for applications, then publish one live page with one month of free hosting when you are ready."),
  ).toBeVisible();

  const googleButton = page.getByRole("button", { name: "Start Your Free Month with Google" });
  const emailField = page.getByPlaceholder("Email address");
  const passwordField = page.getByPlaceholder("Create password");
  const submitButton = page.getByRole("button", { name: "Start My Free Month" });

  await expect(googleButton).toBeInViewport();
  await expect(emailField).toBeInViewport();
  await expect(passwordField).toBeInViewport();
  await expect(submitButton).toBeInViewport();

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?next=%2Fcreate%3Fref%3Dlanding_start_free",
  );
});
