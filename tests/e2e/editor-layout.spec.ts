import { expect, test, type Page } from "@playwright/test";
import type { AtsReadinessResult } from "../../src/lib/ats-readiness";
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

const jobComparisonReadiness: AtsReadinessResult = {
  status: "needs_attention",
  score: 84,
  categoryScores: {
    essentials: 100,
    content: 92,
    searchability: 62,
    pdf: 100,
  },
  checks: {
    essentials: [
      {
        id: "contact-values-valid",
        category: "essentials",
        title: "Contact details are readable",
        detail: "The contact details use readable text.",
        severity: "pass",
        passed: true,
        pointsDeducted: 0,
      },
    ],
    content: [],
    searchability: [
      {
        id: "target-title-present",
        category: "searchability",
        title: "The target title appears in the resume",
        detail: '"Principal Product Manager" does not appear as an exact phrase in the resume.',
        severity: "warning",
        passed: false,
        pointsDeducted: 20,
        suggestedFix: "Use the title only if it accurately describes your work.",
      },
      {
        id: "job-keyword-coverage",
        category: "searchability",
        title: "Relevant job-description terms are represented",
        detail: "50% of the selected job-description terms appear in the resume.",
        severity: "warning",
        passed: false,
        pointsDeducted: 25,
        suggestedFix: "Review the missing terms below.",
      },
    ],
    pdf: [
      {
        id: "pdf-renderable",
        category: "pdf",
        title: "The PDF renders",
        detail: "The PDF rendered successfully.",
        severity: "pass",
        passed: true,
        pointsDeducted: 0,
      },
    ],
  },
  criticalFixes: [],
  improvements: [
    {
      id: "target-title-present",
      category: "searchability",
      title: "The target title appears in the resume",
      detail: '"Principal Product Manager" does not appear as an exact phrase in the resume.',
      severity: "warning",
      passed: false,
      pointsDeducted: 20,
      suggestedFix: "Use the title only if it accurately describes your work.",
    },
    {
      id: "job-keyword-coverage",
      category: "searchability",
      title: "Relevant job-description terms are represented",
      detail: "50% of the selected job-description terms appear in the resume.",
      severity: "warning",
      passed: false,
      pointsDeducted: 25,
      suggestedFix: "Review the missing terms below.",
    },
  ],
  passedChecks: [
    {
      id: "contact-values-valid",
      category: "essentials",
      title: "Contact details are readable",
      detail: "The contact details use readable text.",
      severity: "pass",
      passed: true,
      pointsDeducted: 0,
    },
    {
      id: "pdf-renderable",
      category: "pdf",
      title: "The PDF renders",
      detail: "The PDF rendered successfully.",
      severity: "pass",
      passed: true,
      pointsDeducted: 0,
    },
  ],
  pdf: {
    renderable: true,
    pageCount: 1,
    fitsOnOnePage: true,
    renderFailureReason: null,
    overflowReasons: [],
    recommendedFixes: [],
  },
  keywordCoverage: {
    keywords: ["analytics", "roadmaps", "python", "sql"],
    matchedKeywords: ["analytics", "roadmaps"],
    missingKeywords: ["python", "sql"],
    coveragePercent: 50,
  },
  fingerprint: "preview-fingerprint",
  evaluatedAt: "2026-07-22T20:00:00.000Z",
  disclaimer:
    "This check reviews common ATS practices and cannot predict employer decisions.",
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
  // Autosave paused: this spec asserts the transient unsaved/saving/saved
  // sequence, which a debounce firing mid-assertion would race.
  await page.goto("/dev/editor-preview?autosave=off");
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
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
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

test("the editor saves on its own after edits stop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/editor-preview");

  const headline = page.getByLabel("Headline");
  await expect(headline).toBeVisible();

  await headline.fill("Autosaved Platform Engineer");
  await expect(page.getByText("Saving shortly…", { exact: true })).toBeVisible();

  // No save is clicked. The debounce alone must carry the edit to the server
  // and settle the status back to clean.
  await expect(page.getByText("Saved automatically.", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
  await expect(page.locator("[data-editor-preview-status]")).toHaveText("Live signal");
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

test("job-specific ATS check makes found and missing words easy to scan", async ({
  page,
}) => {
  await page.route("**/api/resume/readiness", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ readiness: jobComparisonReadiness }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dev/editor-preview");

  const atsCard = page.locator("#ats-readiness");
  const titleInput = page.getByLabel(/Target job title/);
  const descriptionInput = page.getByLabel(/Job description/);

  await atsCard.scrollIntoViewIfNeeded();
  await expect(titleInput).toBeVisible();
  await expect(descriptionInput).toBeVisible();
  await expect(page.getByRole("button", { name: "Run general ATS check" })).toBeVisible();
  await expect(page.locator("[data-ats-check-mode]")).toHaveText("General ATS check");

  await titleInput.fill("Principal Product Manager");
  await descriptionInput.fill(
    "Lead product roadmaps using analytics, Python, and SQL across a B2B platform.",
  );
  await expect(page.locator("[data-ats-check-mode]")).toHaveText("Job-specific check");

  await page.getByRole("button", { name: "Check against this job" }).click();

  const results = page.locator("[data-ats-readiness-results]");
  const jobMatch = page.locator("[data-ats-job-match]");
  await expect(results).toBeVisible();
  await expect(results).toBeFocused();
  await expect(jobMatch.getByRole("heading", {
    name: "2 of 4 important terms appear in your résumé",
  })).toBeVisible();
  await expect(jobMatch.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  await expect(jobMatch.getByRole("list", {
    name: "Job terms found in your résumé",
  })).toContainText("analytics");
  await expect(jobMatch.getByRole("list", {
    name: "Job terms found in your résumé",
  })).toContainText("roadmaps");
  await expect(jobMatch.getByRole("list", {
    name: "Job terms not found in your résumé",
  })).toContainText("python");
  await expect(jobMatch.getByRole("list", {
    name: "Job terms not found in your résumé",
  })).toContainText("sql");
  await expect(jobMatch).toContainText("Only add a missing term when it truthfully describes work you have done.");

  // Editing the job context after a check keeps the results visible in a stale
  // state instead of unmounting them, and re-running clears the stale marker.
  await descriptionInput.fill(
    "Lead product roadmaps using analytics, Python, and SQL across a B2B platform. Now with Go.",
  );
  await expect(results).toHaveAttribute("data-stale", "true");
  await expect(page.locator("#ats-stale-notice")).toBeVisible();
  await expect(jobMatch.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");

  await page.getByRole("button", { name: "Check against this job" }).click();
  await expect(results).toBeVisible();
  await expect(results).not.toHaveAttribute("data-stale", "true");
  await expect(page.locator("#ats-stale-notice")).toHaveCount(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
