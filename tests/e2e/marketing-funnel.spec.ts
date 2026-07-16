import { expect, test } from "@playwright/test";

test("examples page matches the simpler Living Page and Resume PDF positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(page.getByRole("heading", { name: "See how a living resume can look when it becomes more than a file." })).toBeVisible();
  await expect(
    page.getByText("once someone opens your link and wants faster context."),
  ).toBeVisible();
  await expect(page.getByText("After you apply", { exact: true })).toBeVisible();
  await expect(page.getByText("Why this helps a human", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Use the PDF", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Open large preview" }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ready to create one page you can actually send?" }),
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
    page.getByRole("heading", { name: "Create your living resume." }),
  ).toBeVisible();
  await expect(
    page.getByText("Next, you will add your details in a private guided builder."),
  ).toBeVisible();

  const googleButton = page.getByRole("button", { name: "Continue with Google" });
  const emailField = page.getByLabel("Email address");
  const passwordField = page.getByLabel("Create password");
  const submitButton = page.getByRole("button", { name: "Create My Free Resume" });
  const formAlert = page.locator('[role="alert"]:not(#__next-route-announcer__)');

  await expect(googleButton).toBeInViewport();
  await expect(emailField).toBeInViewport();
  await expect(passwordField).toBeInViewport();
  await expect(submitButton).toBeInViewport();

  await expect(formAlert).toHaveCount(0);
  await googleButton.click();
  await expect(formAlert).toContainText("accept the Terms of Service");
  await page.getByRole("checkbox").check();
  await expect(formAlert).toHaveCount(0);

  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login?next=%2Fcreate%3Fref%3Dlanding_start_free",
  );
});
