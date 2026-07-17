import { expect, test } from "@playwright/test";

test("landing page tells the product story and keeps the full funnel intact", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");
  const hero = page.locator("#hero-section");

  await expect(
    page.getByRole("heading", {
      name: "Make your experience easier to understand and harder to forget.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Build one living professional page. Shape it for the moment. Share it anywhere.",
    ).first(),
  ).toBeVisible();
  await expect(page.getByText("One source. Three useful formats.")).toBeVisible();

  await expect(hero.getByRole("link", { name: "Try the live sample" })).toHaveAttribute(
    "href",
    "#demo-section",
  );
  await expect(hero.getByRole("link", { name: "Build from my résumé — free" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  await expect(header.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/login?next=/dashboard",
  );
  await expect(header.getByRole("link", { name: "Examples" })).toHaveAttribute(
    "href",
    "/examples",
  );

  for (const id of ["hero-section", "demo-section", "how", "ats", "pricing", "final-cta"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }

  await expect(page.getByText("Free to build, publish, host, download, and keep current.")).toBeVisible();
  await expect(page.getByText("No card or hidden charges")).toBeAttached();
  await expect(page.getByText("SIGNAL FRAME · HOMEPAGE CONCEPT")).toHaveCount(0);
  await expect(page.getByText("Preview action only")).toHaveCount(0);
});

test("interactive sample keeps each professional output and visual direction aligned", async ({ page }) => {
  await page.goto("/");

  const demo = page.locator("#demo-section");
  const applying = demo.getByRole("button", { name: /Applying for a role/ });
  const referred = demo.getByRole("button", { name: /Getting referred/ });
  const introduction = demo.getByRole("button", { name: /Making an introduction/ });

  await expect(applying).toHaveAttribute("aria-pressed", "true");
  await expect(demo.getByText("ATS-ready PDF", { exact: true })).toBeVisible();
  await expect(demo.getByText("Avery-Morgan_Product-Lead.pdf")).toBeVisible();
  await expect(demo.getByRole("link", { name: "Build + download yours" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_story_primary&next=/create",
  );

  await referred.click();
  await expect(referred).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-living-output][data-theme-id="matrix"]')).toBeVisible();
  await expect(demo.getByRole("heading", { name: "Avery Morgan" })).toBeVisible();

  const warmTheme = page.getByRole("button", { name: /Warm \+ approachable/ });
  await warmTheme.click();
  await expect(warmTheme).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-living-output][data-theme-id="aurora"]')).toBeVisible();

  await introduction.click();
  await expect(introduction).toHaveAttribute("aria-pressed", "true");
  const shareCard = page.getByTestId("story-share-card");
  await expect(shareCard).toHaveAttribute("data-theme-id", "aurora");
  await expect(page.getByRole("img", { name: /QR code preview for .*\/examples/i })).toBeVisible();

  const boldTheme = page.getByRole("button", { name: /Bold \+ creative/ });
  await boldTheme.click();
  await expect(boldTheme).toHaveAttribute("aria-pressed", "true");
  await expect(shareCard).toHaveAttribute("data-theme-id", "ember");

  await page.getByRole("button", { name: "Paste résumé text" }).click();
  await expect(page.getByRole("button", { name: "Paste résumé text" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Sample pasted résumé text")).toHaveValue(
    "Led a TypeScript and SQL platform serving 2M+ requests daily.",
  );

  await expect(page.getByText("5 matching details to review")).toBeVisible();
  for (const match of [
    "Senior Product Lead",
    "TypeScript",
    "SQL",
    "Large-scale platform architecture",
    "2M+ requests per day",
  ]) {
    await expect(page.getByText(match, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText("MyLivingPage never invents experience or promises a ranking.")).toBeVisible();
});

test("reduced-motion visitors keep the complete story without ambient animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.getByTestId("cosmic-background")).toHaveAttribute("data-ambient", "static");
  await expect(page.getByText("Already have a résumé? Good. Start there.")).toBeVisible();
  await expect(page.getByText("One story. Two readers.")).toBeAttached();
  await expect(page.getByText("Same experience. Sharper emphasis.")).toBeAttached();
  await expect(page.getByText("Easy to pass along. Easy to follow up.")).toBeAttached();

  const revealState = await page.locator("[data-reveal]").evaluateAll((sections) =>
    sections.every((section) => (section as HTMLElement).dataset.visible === "true"),
  );
  expect(revealState).toBe(true);

  await page.getByRole("button", { name: /Getting referred/ }).first().click();
  await expect(page.locator("[data-living-output]")).toBeVisible();
});

test("mobile menu works and sticky CTA appears after the hero then hides near the final CTA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open navigation" });
  await menuButton.click();
  const mobileMenu = page.locator("#homepage-mobile-menu");
  await expect(mobileMenu.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how");
  await expect(mobileMenu.getByRole("link", { name: "ATS + PDF" })).toHaveAttribute("href", "#ats");
  await expect(mobileMenu.getByRole("link", { name: "Examples" })).toHaveAttribute("href", "/examples");
  await expect(mobileMenu.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/login?next=/dashboard",
  );
  await expect(page.getByRole("button", { name: "Close navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();
  await expect(mobileMenu).toHaveCount(0);

  await expect(page.locator("header").getByRole("link", { name: "Build free" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_apply_nav&next=/create",
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);

  const sticky = page.getByTestId("mobile-sticky-cta");
  const stickyLink = sticky.locator("a");
  const stickyDismissButton = sticky.locator("button");
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
  await expect(stickyLink).toHaveAttribute("tabindex", "-1");
  await expect(stickyDismissButton).toHaveAttribute("tabindex", "-1");

  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "false");
  await expect(stickyLink).toHaveAttribute(
    "href",
    "/signup?ref=landing_mobile_start&next=/create",
  );
  await expect(stickyLink).not.toHaveAttribute("tabindex", "-1");
  await expect(stickyDismissButton).not.toHaveAttribute("tabindex", "-1");

  await page.locator("#final-cta").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
  await expect(stickyLink).toHaveAttribute("tabindex", "-1");
  await expect(stickyDismissButton).toHaveAttribute("tabindex", "-1");
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
