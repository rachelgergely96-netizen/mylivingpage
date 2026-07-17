import { expect, test } from "@playwright/test";

test("landing page leads with the brand story and keeps the full funnel intact", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");
  await expect(
    page.getByRole("heading", { name: "Make your experience easier to understand and harder to forget." }),
  ).toBeVisible();
  await expect(
    page.getByText("Build one living professional page. Shape it for the moment. Share it anywhere.").first(),
  ).toBeVisible();
  await expect(page.getByText("One source of truth", { exact: true })).toBeVisible();

  const hero = page.locator("#hero-section");
  await expect(hero.getByRole("link", { name: "See How It Adapts" })).toHaveAttribute("href", "#demo-section");
  await expect(hero.getByRole("link", { name: "Create Your Page — Free" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  await expect(header.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=/dashboard");

  await expect(page.locator("#demo-section")).toBeVisible();
  await expect(page.locator("#how")).toBeVisible();
  await expect(page.locator("#pricing")).toBeVisible();
  await expect(page.locator("#final-cta")).toBeVisible();

  await expect(page.getByPlaceholder("Email for updates")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Answer the high-stakes questions before you sign up." })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "A few questions people ask before they trust a new career tool." })).toHaveCount(0);
});

test("scroll story keeps the page and matching share card connected across every chapter", async ({ page }) => {
  await page.goto("/");

  const story = page.getByTestId("homepage-story");

  await expect(page.getByRole("heading", { name: "Watch one professional story adapt as you scroll." })).toBeVisible();
  await expect(story).toHaveAttribute("data-active-stage", "shape");

  const emberTab = page.getByRole("tab", { name: "Ember" });
  const auroraTab = page.getByRole("tab", { name: "Aurora" });
  const matrixTab = page.getByRole("tab", { name: "Matrix" });
  const pagePreview = page.getByTestId("story-page-preview");
  const shareCard = page.getByTestId("story-share-card");

  await expect(emberTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("landing-living-page-preview")).toBeVisible();
  await expect(page.getByTestId("landing-share-card-preview")).toBeVisible();
  await expect(pagePreview).toHaveAttribute("data-theme-id", "ember");
  await expect(shareCard).toHaveAttribute("data-theme-id", "ember");

  await auroraTab.click();
  await expect(auroraTab).toHaveAttribute("aria-selected", "true");
  await expect(pagePreview).toHaveAttribute("data-theme-id", "aurora");
  await expect(shareCard).toHaveAttribute("data-theme-id", "aurora");

  await matrixTab.click();
  await expect(matrixTab).toHaveAttribute("aria-selected", "true");
  await expect(pagePreview).toHaveAttribute("data-theme-id", "matrix");

  await story.getByRole("button", { name: /Clear to people\. Readable by software\./ }).click();
  await expect(story).toHaveAttribute("data-active-stage", "systems");
  await expect(page.getByTestId("story-system-preview")).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByText("What software can read")).toBeVisible();
  await expect(page.getByText("Example AI-assisted search")).toBeVisible();
  await expect(
    page.getByText("AI searchability means your experience is specific enough to recognize—not that you are gaming a ranking."),
  ).toBeVisible();

  await story.getByRole("button", { name: /Your page becomes a card people can actually share\./ }).click();
  await expect(story).toHaveAttribute("data-active-stage", "share");
  await expect(page.getByText("Download PNG")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code preview for/i })).toBeVisible();

  await story.getByRole("button", { name: /One link stays current after it leaves your hands\./ }).click();
  await expect(story).toHaveAttribute("data-active-stage", "signal");
  await expect(page.getByTestId("story-signal-preview")).toHaveAttribute("aria-hidden", "false");
  await expect(page.getByText("Someone opened Avery’s page")).toBeVisible();

  await expect(story.getByRole("link", { name: "Browse sample pages" })).toHaveAttribute("href", "/examples");
  await expect(story.getByRole("link", { name: "Create Your Page — Free" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_story_primary&next=/create",
  );
});

test("reduced-motion visitors keep the complete story without ambient animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const story = page.getByTestId("homepage-story");
  await expect(story).toHaveAttribute("data-motion", "reduced");
  await expect(page.getByTestId("cosmic-background")).toHaveAttribute("data-ambient", "static");
  await expect(page.getByText("Same experience. Sharper emphasis.")).toBeVisible();
  await expect(page.getByText("Clear to people. Readable by software.")).toBeVisible();
  await expect(page.getByText("Your page becomes a card people can actually share.")).toBeVisible();
  await expect(page.getByText("One link stays current after it leaves your hands.")).toBeVisible();

  await story.getByRole("button", { name: /Clear to people\. Readable by software\./ }).click();
  await expect(story).toHaveAttribute("data-active-stage", "systems");
  await expect(page.getByText("Example AI-assisted search")).toBeVisible();
});

test("mobile menu works and sticky CTA appears after the hero then hides near the final CTA", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const menuButton = page.getByRole("button", { name: "Open menu" });
  await menuButton.click();
  const mobileMenu = page.locator("#landing-mobile-nav");
  await expect(mobileMenu.getByRole("link", { name: "Story" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "How It Works" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Examples" })).toBeVisible();
  await expect(mobileMenu.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/login?next=/dashboard");
  await expect(mobileMenu.getByRole("link", { name: "Create Your Page — Free" })).toHaveAttribute(
    "href",
    "/signup?ref=landing_apply_nav_mobile&next=/create",
  );
  await expect(page.getByRole("button", { name: "Close menu" })).toBeVisible();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(mobileMenu).toBeHidden();

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);

  const sticky = page.getByTestId("mobile-sticky-cta");
  const stickyLink = sticky.locator("a");
  const stickyDismissButton = sticky.locator("button");
  await expect(sticky).toHaveAttribute("aria-hidden", "true");
  await expect(stickyLink).toHaveAttribute("tabindex", "-1");
  await expect(stickyDismissButton).toHaveAttribute("tabindex", "-1");

  const story = page.getByTestId("homepage-story");
  await story.getByRole("button", { name: "Show chapter: Stay understandable" }).click();
  await expect(story).toHaveAttribute("data-active-stage", "systems");
  const systemCard = page.getByTestId("story-system-card");
  await expect(systemCard).toBeVisible();
  await expect(systemCard).toHaveCSS("overflow-y", "auto");
  await systemCard.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(systemCard.getByText(/Searchability means giving systems clear information/)).toBeInViewport();

  await page.locator("#how").scrollIntoViewIfNeeded();
  await expect(sticky).toHaveAttribute("aria-hidden", "false");
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
