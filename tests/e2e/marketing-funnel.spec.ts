import { expect, test } from "@playwright/test";

test("examples page matches ATS-safe resume positioning", async ({ page }) => {
  await page.goto("/examples");

  await expect(page.getByRole("heading", { name: "See what the human click can look like." })).toBeVisible();
  await expect(
    page.getByText("once your ATS-safe resume has done the machine work of getting you seen."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ready to keep your ATS-safe resume and send a better page?" }),
  ).toBeVisible();
});

test("signup page keeps ATS-safe resume plus living-page framing", async ({ page }) => {
  await page.goto("/signup?ref=landing_visibility_primary");

  await expect(
    page.getByRole("heading", { name: "Keep your ATS-safe resume. Build the page people read." }),
  ).toBeVisible();
  await expect(
    page.getByText("Keep the ATS-safe resume you already use for applications"),
  ).toBeVisible();
  await expect(page.getByText("Keep ATS-safe resume")).toBeVisible();
});
