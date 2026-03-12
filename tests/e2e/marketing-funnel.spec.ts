import { expect, test } from "@playwright/test";

test("examples page matches ATS-safe resume positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(page.getByRole("heading", { name: "See what the human click can look like after the application is already in." })).toBeVisible();
  await expect(
    page.getByText("once your ATS-safe resume has already handled extraction and search visibility."),
  ).toBeVisible();
  await expect(page.getByText("After you apply", { exact: true })).toBeVisible();
  await expect(page.getByText("Why this helps a human", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Keep the resume for", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Open large preview" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ready to keep your ATS-safe resume and send a better page?" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Free" }).first()).toHaveAttribute(
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
    page.getByText("Keep your resume intact for applications, then publish one page when you are ready."),
  ).toBeVisible();

  const googleButton = page.getByRole("button", { name: "Start with Google" });
  const emailField = page.getByPlaceholder("Email address");
  const passwordField = page.getByPlaceholder("Create password");
  const submitButton = page.getByRole("button", { name: "Start From My Resume" });

  await expect(googleButton).toBeInViewport();
  await expect(emailField).toBeInViewport();
  await expect(passwordField).toBeInViewport();
  await expect(submitButton).toBeInViewport();

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?next=%2Fcreate%3Fref%3Dlanding_start_free",
  );
});
