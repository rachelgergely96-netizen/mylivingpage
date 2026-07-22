import { expect, test, type Page } from "@playwright/test";
import { DEMO_PAGES } from "../../src/lib/demo-data";
import type { PageRecord } from "../../src/types/resume";

const demo = DEMO_PAGES[0];
const editorPage: PageRecord = {
  id: "editor-layout-preview",
  slug: "avery-sample",
  status: "live",
  visibility: "public",
  title: "Avery Sample",
  theme_id: demo.themeId,
  resume_data: {
    ...demo.data,
    proofs: [],
    testimonials: [],
  },
  raw_resume: null,
  portfolio_url: null,
  page_config: null,
  views: 42,
  published_at: "2026-07-19T12:00:00.000Z",
  created_at: "2026-07-18T12:00:00.000Z",
  updated_at: "2026-07-19T12:00:00.000Z",
};

async function mockEditorRequests(page: Page) {
  await page.route("**/api/pages/editor-layout-preview", async (route) => {
    if (route.request().method() === "PATCH") {
      const payload = route.request().postDataJSON() as Partial<PageRecord>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...editorPage, ...payload }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(editorPage),
    });
  });

  await page.route("**/api/profile", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        plan: "spark",
        username: editorPage.slug,
        billing_cohort: "publish_cc_trial_v1",
      }),
    });
  });

  await page.route("**/api/events", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await mockEditorRequests(page);
});

test("editor keeps content, commands, and live preview in one desktop workspace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/editor-preview");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], {
    origin: new URL(page.url()).origin,
  });

  const commandBar = page.locator("[data-editor-command-bar]");
  const workspace = page.locator("[data-editor-workspace]");
  const preview = page.locator("[data-editor-preview]");
  const headline = page.getByLabel("Headline");

  await expect(page.getByRole("heading", { name: "Avery Sample", level: 1 })).toBeVisible();
  await expect(commandBar).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Editor sections" })).toBeVisible();
  await expect(page.locator("[data-editor-readiness]")).toBeVisible();
  await expect(page.locator("[data-editor-ready-count]")).toContainText("6/6");
  await expect(preview).toBeVisible();
  await expect(commandBar).toHaveCSS("position", "sticky");
  await expect(preview).toHaveCSS("position", "sticky");

  const workspaceBox = await workspace.boundingBox();
  const contentBox = await page.getByRole("heading", { name: "Shape the signal, section by section" }).boundingBox();
  const previewBox = await preview.boundingBox();
  expect(workspaceBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(previewBox!.x).toBeGreaterThan(contentBox!.x + contentBox!.width);

  await headline.fill("Principal Platform Engineer");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeDisabled();
  await expect(page.locator("[data-editor-preview-status]")).toHaveText("Unsaved view");
  await expect(preview.getByText("Principal Platform Engineer", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Saved successfully!", { exact: true })).toBeVisible();
  await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
  await expect(page.locator("[data-editor-preview-status]")).toHaveText("Live signal");

  const copyLinkButton = page.getByRole("button", { name: "Copy link" });
  await expect(copyLinkButton).toBeEnabled();
  await copyLinkButton.click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();

  const experienceStop = page.locator('[data-editor-nav-id="editor-section-experience"]');
  await experienceStop.click();
  await expect(experienceStop).toHaveAttribute("aria-current", "step");
  await expect(page).toHaveURL(/#editor-section-experience$/);
  await expect
    .poll(async () => {
      const commandBox = await commandBar.boundingBox();
      const stickyPreviewBox = await preview.boundingBox();
      if (!commandBox || !stickyPreviewBox) return -1;
      return Math.round(stickyPreviewBox.y - (commandBox.y + commandBox.height));
    })
    .toBeGreaterThanOrEqual(0);

  await page.route("**/api/pages/editor-layout-preview", async (route) => {
    if (route.request().method() === "PATCH") {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await route.fallback();
  });
  await headline.fill("Staff Platform Engineer");
  await page.getByRole("button", { name: "Save Changes" }).click();
  await expect(page.getByText("Saving changes", { exact: true })).toBeVisible();
  await headline.fill("Distinguished Platform Engineer");
  await expect(
    page.getByText("Saved. Newer edits are still unsaved.", { exact: true }),
  ).toBeVisible();
  await expect(headline).toHaveValue("Distinguished Platform Engineer");
  await expect(page.getByText("Unsaved changes", { exact: true })).toBeVisible();
});

test("mobile editor switches cleanly between editing and preview", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/editor-preview");

  const editButton = page.getByRole("button", { name: "Edit content" });
  const previewButton = page.getByRole("button", { name: "Live preview" });
  const preview = page.locator("[data-editor-preview]");

  await expect(editButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Shape the signal, section by section" })).toBeVisible();
  await expect(page.locator("[data-editor-mobile-dock]")).toBeVisible();
  await expect(page.locator("[data-editor-mobile-peek]")).toBeVisible();
  await expect(preview).toBeHidden();

  const editOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(editOverflow).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Preview your page" }).click();
  await expect(previewButton).toHaveAttribute("aria-pressed", "true");
  await expect(preview).toBeVisible();
  await expect(page.getByRole("heading", { name: "Shape the signal, section by section" })).toBeHidden();
  await expect(page.locator("[data-editor-mobile-peek]")).toBeHidden();

  const previewOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(previewOverflow).toBeLessThanOrEqual(0);
});
