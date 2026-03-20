import { expect, test } from "@playwright/test";

test("landing page is simplified around hero, showcase, how-it-works, pricing, and final CTA", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");
  await expect(
    page.getByRole("heading", { name: "Upload your info once. Publish a page people can scan fast." }),
  ).toBeVisible();
  await expect(page.getByText("Start with the information you already have")).toBeVisible();
  await expect(page.getByText("keep the same link current anywhere a recruiter or hiring manager can click")).toBeVisible();

  const hero = page.locator("#hero-section");
  await expect(hero.getByRole("link", { name: "See the Demo" })).toHaveAttribute("href", "#demo-section");
  await expect(hero.getByRole("link", { name: "Start Your Free Month" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  await expect(hero.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=/dashboard");
  await expect(header.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=/dashboard");

  await expect(page.locator("#demo-section")).toBeVisible();
  await expect(page.locator("#how")).toBeVisible();
  await expect(page.locator("#pricing")).toBeVisible();
  await expect(page.locator("#final-cta")).toBeVisible();

  await expect(page.getByPlaceholder("Email for updates")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Answer the high-stakes questions before you sign up." })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A few questions people ask before they trust a new career tool." })).toHaveCount(0);
});

test("landing showcase switches themes and previews share card plus QR without extra pricing tags", async ({ page }) => {
  await page.goto("/");

  const demoSection = page.locator("#demo-section");

  await expect(page.getByRole("heading", { name: "Switch the theme. Preview the page and the share card in one place." })).toBeVisible();

  const emberTab = page.getByRole("tab", { name: "Ember" });
  const auroraTab = page.getByRole("tab", { name: "Aurora" });
  const matrixTab = page.getByRole("tab", { name: "Matrix" });
  const livingPageTab = page.getByRole("tab", { name: "Living Page" });
  const shareCardTab = page.getByRole("tab", { name: "Share Card + QR" });

  await expect(emberTab).toHaveAttribute("aria-selected", "true");
  await expect(livingPageTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("landing-living-page-preview")).toBeVisible();

  await auroraTab.click();
  await expect(auroraTab).toHaveAttribute("aria-selected", "true");

  await matrixTab.click();
  await expect(matrixTab).toHaveAttribute("aria-selected", "true");
  await expect(demoSection.getByText("Pro", { exact: true })).toHaveCount(0);

  await shareCardTab.click();
  await expect(shareCardTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("landing-share-card-preview")).toBeVisible();
  await expect(page.getByText("PNG Share Card Preview")).toBeVisible();
  await expect(page.getByText("Download PNG")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code preview for/i })).toBeVisible();

  await expect(demoSection.getByRole("link", { name: "Browse sample pages" })).toHaveAttribute("href", "/examples");
  await expect(demoSection.getByRole("link", { name: "Start Your Free Month" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_demo_primary&next=/create",
  );
});

test("mobile menu works and sticky CTA appears after the hero then hides near the final CTA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.click();
  const mobileMenu = page.locator("#landing-mobile-nav");
  await expect(mobileMenu.getByRole("link", { name: "Demo" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "How It Works" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Examples" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=/dashboard");
  await expect(mobileMenu.getByRole("link", { name: "Start Your Free Month" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_apply_nav_mobile&next=/create",
  );
  await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(mobileMenu).toBeHidden();

  const sticky = page.getByTestId("mobile-sticky-cta");
  await expect(sticky).toHaveAttribute("aria-hidden", "true");

  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "false");

  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
});

test("mobile sticky CTA can be dismissed for the current browser session", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const sticky = page.getByTestId("mobile-sticky-cta");
  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "false");

  await page.getByRole("button", { name: "Dismiss sticky call to action" }).click();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");

  await page.reload();
  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
});
