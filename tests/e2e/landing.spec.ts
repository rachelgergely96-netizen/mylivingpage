import { expect, test } from "@playwright/test";

test("landing page communicates the Living Page outcome and one honest start action", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");

  await expect(
    page.getByRole("heading", { name: "Your résumé, alive on the web." }),
  ).toBeVisible();
  await expect(
    page.getByText("Turn the résumé you already have into a professional page", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("Completely free · No trial", { exact: true })).toBeVisible();
  await expect(page.getByText("Homepage conversion prototype", { exact: true })).toHaveCount(0);

  await expect(page.getByTestId("homepage-primary-cta")).toHaveAttribute(
    "href",
    "/signup?ref=landing_start_free&next=/create",
  );
  await expect(header.getByRole("link", { name: "How it works" })).toHaveAttribute(
    "href",
    "#how-it-works",
  );
  await expect(header.getByRole("link", { name: "For applications" })).toHaveAttribute(
    "href",
    "#search-ready",
  );
  await expect(header.getByRole("link", { name: "Examples" })).toHaveAttribute(
    "href",
    "/examples",
  );
  await expect(header.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    "/login",
  );

  for (const id of [
    "prototype-hero",
    "live-product-story",
    "how-it-works",
    "quick-start",
    "search-ready",
  ]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.locator("#use-later")).toHaveCount(0);

  const footer = page.locator("footer");
  await expect(footer).toContainText("Interactive demo uses sample data");
  await expect(footer.getByRole("link", { name: "Legal" })).toHaveAttribute("href", "/legal");
  await expect(footer.getByRole("button", { name: "Cookie settings" })).toBeVisible();
});

test("interactive homepage story keeps the Living Page primary while offering three outputs", async ({ page }) => {
  await page.goto("/");

  const story = page.locator("[data-live-product-story]");
  const livingPage = story.getByRole("button", { name: /Web page/ });
  const application = story.getByRole("button", { name: /Résumé PDF/ });
  const introduction = story.getByRole("button", { name: /Card \+ QR code/ });

  await expect(livingPage).toHaveAttribute("aria-pressed", "true");
  await expect(story.getByRole("heading", { name: "Your Living Page" })).toBeVisible();
  await expect(story.locator("[data-story-living-output]")).toHaveAttribute("data-theme-id", "atlas");
  await expect(story.locator('[data-theme-renderer-status="ready"]')).toBeVisible();

  await application.click();
  await expect(story.getByRole("heading", { name: "PDF for applications" })).toBeVisible();
  await introduction.click();
  await expect(story.getByRole("heading", { name: "Card + QR code" })).toBeVisible();
});

test("reduced-motion visitors retain the complete content and static transformation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator('[data-motion-state="reduced"]')).toBeVisible();
  await expect(page.locator("[data-transform-motion] b").first()).toBeHidden();
  await expect(page.locator("[data-truth-source]")).toBeVisible();
  await expect(page.locator("[data-truth-destination]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Start with the résumé you already have." })).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "The design can change. Your details stay easy to read." }),
  ).toBeAttached();
});

test("mobile homepage keeps primary actions usable without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const headerCta = page.locator("header").getByRole("link", { name: "Start free" });
  const primaryCta = page.getByTestId("homepage-primary-cta");
  await expect(page.locator("header").getByRole("link", { name: "Sign in" })).toBeVisible();
  await expect(headerCta).toHaveAttribute(
    "href",
    "/signup?ref=landing_apply_nav&next=/create",
  );
  await expect(primaryCta).toBeVisible();

  const boxes = await Promise.all([headerCta.boundingBox(), primaryCta.boundingBox()]);
  expect(boxes.every((box) => box && box.height >= 44)).toBe(true);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);

  await page.setViewportSize({ width: 320, height: 720 });
  await page.reload();
  await expect(page.locator("header").getByRole("link", { name: "Start free" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
});
