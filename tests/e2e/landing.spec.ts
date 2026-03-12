import { expect, test } from "@playwright/test";

test("landing page highlights ATS visibility and recruiter search reality", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Keep your resume ATS-safe. Send a page people actually remember." }),
  ).toBeVisible();

  const visibilityNavLink = page.getByRole("link", { name: "Visibility", exact: true }).first();
  await expect(visibilityNavLink).toHaveAttribute("href", "#visibility");

  const visibilitySection = page.locator("#visibility");
  await expect(visibilitySection).toBeVisible();
  await expect(visibilitySection.getByRole("heading", { name: "The 30-second readability test" })).toBeVisible();
  await expect(
    visibilitySection.getByText("Open your resume PDF and highlight a few lines with your mouse."),
  ).toBeVisible();
  await expect(visibilitySection.getByRole("heading", { name: "Recruiter search reality" })).toBeVisible();
  await expect(visibilitySection.getByText('"Product Manager" AND "SQL"')).toBeVisible();

  const visibilityCta = visibilitySection.getByRole("link", { name: "Build My Page Free" });
  await expect(visibilityCta).toHaveAttribute("href", "/signup?ref=landing_visibility_primary");
});
