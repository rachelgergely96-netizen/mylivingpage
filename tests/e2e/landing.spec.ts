import { expect, test } from "@playwright/test";

test("landing page leads with the recruiter click moment and includes demo, trust, and FAQ sections", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "When a recruiter clicks your name, make the next 10 seconds count." }),
  ).toBeVisible();

  await expect(
    page.getByText("Your resume gets you found. MyLivingPage gives them a page worth remembering."),
  ).toBeVisible();

  const demoLink = page.getByRole("link", { name: "See What Your Page Could Look Like" }).first();
  await expect(demoLink).toHaveAttribute("href", "#demo-section");
  await expect(page.locator("#hero-section").getByRole("link", { name: "Start Free" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );

  const demoSection = page.locator("#demo-section");
  const workflowSection = page.locator("#visibility");
  await expect(demoSection.getByRole("heading", { name: "This is the kind of page a recruiter opens after your name gets surfaced." })).toBeVisible();
  await expect(workflowSection.getByRole("heading", { name: "How hiring usually works for active applicants." })).toBeVisible();

  const demoBox = await demoSection.boundingBox();
  const workflowBox = await workflowSection.boundingBox();
  expect(demoBox?.y ?? 0).toBeLessThan(workflowBox?.y ?? 0);

  await expect(page.getByRole("heading", { name: "Answer the high-stakes questions before you sign up." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your resume stays intact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A few questions people ask before they trust a new career tool." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Will this replace my resume?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Is it actually free?" })).toBeVisible();
});

test("landing samples open in a larger preview and the fallback updates form submits", async ({ page }) => {
  await page.route("**/api/waitlist", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "stubbed" }),
    });
  });

  await page.goto("/");

  await page.locator("#examples").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Open large preview" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to samples" })).toBeVisible();
  await page.getByRole("button", { name: "Close large preview" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await page.getByPlaceholder("Email for updates").fill("person@example.com");
  await page.getByRole("button", { name: "Get Updates" }).click();
  await expect(page.getByText("You are in. We will email product updates and new examples.")).toBeVisible();
});

test("mobile menu works and sticky CTA appears after the hero then hides near the final CTA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.click();
  const mobileMenu = page.locator("#landing-mobile-nav");
  await expect(mobileMenu.getByRole("link", { name: "Demo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(mobileMenu).toBeHidden();

  const sticky = page.getByTestId("mobile-sticky-cta");
  await expect(sticky).toHaveAttribute("aria-hidden", "true");

  await page.locator("#visibility").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "false");

  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
});

test("mobile sticky CTA can be dismissed for the current browser session", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const sticky = page.getByTestId("mobile-sticky-cta");
  await page.locator("#visibility").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "false");

  await page.getByRole("button", { name: "Dismiss sticky call to action" }).click();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");

  await page.reload();
  await page.locator("#visibility").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
});
