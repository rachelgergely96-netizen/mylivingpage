import { expect, test } from "@playwright/test";

test("landing page communicates the Living Page outcome and one honest start action", async ({ page }) => {
  await page.goto("/");

  const header = page.locator("header");

  await expect(
    page.getByRole("heading", { name: "Your résumé, alive on the web." }),
  ).toBeVisible();
  await expect(
    page.getByText("Turn the résumé you already have into one link", { exact: false }),
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

test("the homepage hero shows the Living Page itself, with the other outputs included", async ({ page }) => {
  await page.goto("/");

  const story = page.locator("[data-live-product-story]");

  // The hero is the page, not a picker: there is no output-switching UI.
  await expect(story.locator("[data-story-moment]")).toHaveCount(0);
  await expect(story.getByRole("heading", { name: "Your Living Page" })).toBeVisible();
  await expect(story.locator("[data-story-living-output]")).toHaveAttribute("data-theme-id", "silk");
  await expect(story.locator('[data-theme-renderer-status="ready"]')).toBeVisible();

  // The PDF and the share card are stated as included rather than as
  // alternatives competing with the page for the stage.
  const alsoIncluded = story.locator("[data-also-included]");
  await expect(alsoIncluded).toContainText("Also included free");
  await expect(alsoIncluded).toContainText("A clean résumé PDF");
  await expect(alsoIncluded).toContainText("A share card with a QR code");
  await expect(alsoIncluded.getByRole("link", { name: "See the card" })).toHaveAttribute(
    "href",
    "#share-card",
  );
});

test("reduced-motion visitors retain the complete content and static transformation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(
    page.locator('[data-homepage-prototype][data-motion-state="still"]'),
  ).toBeVisible();
  await expect(page.locator("[data-transform-motion] b").first()).toBeHidden();
  await expect(page.locator("[data-truth-source]")).toBeVisible();
  await expect(page.locator("[data-truth-destination]")).toBeVisible();
  await expect(page.getByRole("heading", { name: "From résumé to published page." })).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "Your style can change. Your details stay clear." }),
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
