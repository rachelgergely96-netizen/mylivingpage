import { expect, test, type Page } from "@playwright/test";
import type { AtsReadinessResult } from "../../src/lib/ats-readiness";
import { DEMO_PAGES } from "../../src/lib/demo-data";
import { MOTION_STORAGE_KEY } from "../../src/lib/motion";
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

  const previewCanvas = preview.locator("canvas");
  await expect(previewCanvas).toHaveCount(1);
  await previewCanvas.evaluate((canvas) => {
    canvas.dataset.editorRenderProbe = "preserved";
  });
  await expect(previewCanvas).toHaveCSS("cursor", "default");

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
  await expect(previewCanvas).toHaveAttribute("data-editor-render-probe", "preserved");

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

test("the editor renders the real PDF and exposes a browser-safe open action", async ({
  page,
}) => {
  await page.route("**/api/resume/preview", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await route.fallback();
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/editor-preview");

  const panel = page.locator("[data-resume-pdf-preview]");
  await panel.scrollIntoViewIfNeeded();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/resume/preview") &&
      response.request().method() === "POST",
  );
  await panel.getByRole("button", { name: "Show the PDF" }).click();
  await expect(panel).toHaveAttribute("aria-busy", "true");

  expect((await responsePromise).status()).toBe(200);
  await expect(panel.getByRole("link", { name: "Open PDF in a new tab" })).toHaveAttribute(
    "href",
    /^blob:/,
  );
  await expect(panel.locator('object[type="application/pdf"]')).toHaveAttribute(
    "data",
    /^blob:/,
  );
  const readyStatus = panel.locator("[data-resume-pdf-ready-status]");
  await expect(readyStatus).toContainText("Résumé PDF preview ready.");
  await expect(readyStatus).toHaveAttribute(
    "data-motion-event",
    "resume.pdf.preview.ready",
  );
  await expect(readyStatus).toHaveAttribute("data-motion-signal", "edit-to-proof");
  await expect(readyStatus).toHaveAttribute("data-motion-state", "ready");
  await expect(readyStatus).toHaveAttribute("data-motion-target", "resume-pdf");
  await expect(panel.locator('object[type="application/pdf"]')).not.toHaveAttribute(
    "data-motion-event",
    /.+/,
  );

  await page.route("**/api/resume/preview", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Preview unavailable." }),
    });
  });
  await panel.getByRole("button", { name: "Render again" }).click();
  await expect(panel.getByRole("alert")).toContainText("Preview unavailable.");
  await expect(panel.locator("[data-resume-pdf-ready-status]")).toHaveCount(0);
  await expect(panel.locator("[data-motion-event='resume.pdf.preview.ready']")).toHaveCount(0);
});

test("theme selection keeps the focused card and preview DOM stable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/editor-preview?autosave=off");

  const picker = page.locator("[data-theme-picker]");
  await picker.scrollIntoViewIfNeeded();
  const nextThemeCandidate = picker
    .locator(
      '[role="radio"]:not([aria-disabled="true"]):not([aria-checked="true"])',
    )
    .first();
  const nextThemeId = await nextThemeCandidate
    .locator("[data-theme-preview]")
    .getAttribute("data-theme-preview");
  expect(nextThemeId).not.toBeNull();
  const nextTheme = picker.locator(
    `[role="radio"]:has([data-theme-preview="${nextThemeId}"])`,
  );
  await expect(nextTheme).toBeVisible();

  const preview = nextTheme.locator("[data-theme-preview]");
  await preview.evaluate((element) => {
    element.setAttribute("data-stability-probe", "retained");
  });
  await nextTheme.focus();
  await nextTheme.press("Space");

  await expect(nextTheme).toBeFocused();
  await expect(nextTheme).toHaveAttribute("aria-checked", "true");
  await expect(preview).toHaveAttribute("data-stability-probe", "retained");
  await expect(picker).toHaveAttribute(
    "data-motion-event",
    "theme.selection.changed",
  );
  await expect(picker).toHaveAttribute("data-motion-signal", "style-dialect");
  await expect(picker).toHaveAttribute("data-motion-state", "selected");
  await expect(picker).toHaveAttribute("data-motion-target", "theme");
  await expect(picker.locator("[data-theme-selection-status]")).toContainText(
    "theme selected.",
  );

  const fullIndicator = nextTheme.locator("[data-theme-selection-indicator]");
  const fullMotion = await fullIndicator.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const duration = style.animationDuration.endsWith("ms")
      ? Number.parseFloat(style.animationDuration)
      : Number.parseFloat(style.animationDuration) * 1_000;
    return { duration, name: style.animationName };
  });
  expect(fullMotion.name).toContain("motion-semantic-enter");
  expect(fullMotion.duration).toBeLessThanOrEqual(220);

  await page.evaluate(
    ([storageKey, mode]) => window.localStorage.setItem(storageKey, mode),
    [MOTION_STORAGE_KEY, "calm"],
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion-mode", "calm");
  const calmPicker = page.locator("[data-theme-picker]");
  const calmThemeCandidate = calmPicker
    .locator(
      '[role="radio"]:not([aria-disabled="true"]):not([aria-checked="true"])',
    )
    .first();
  const calmThemeId = await calmThemeCandidate
    .locator("[data-theme-preview]")
    .getAttribute("data-theme-preview");
  expect(calmThemeId).not.toBeNull();
  const calmTheme = calmPicker.locator(
    `[role="radio"]:has([data-theme-preview="${calmThemeId}"])`,
  );
  await calmTheme.focus();
  await calmTheme.press("Space");
  const calmMotion = await calmTheme
    .locator("[data-theme-selection-indicator]")
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      const duration = style.animationDuration.endsWith("ms")
        ? Number.parseFloat(style.animationDuration)
        : Number.parseFloat(style.animationDuration) * 1_000;
      return {
        duration,
        name: style.animationName,
        transform: style.transform,
      };
    });
  expect(calmMotion.name).toContain("motion-semantic-confirm");
  expect(calmMotion.duration).toBeLessThanOrEqual(120);
  expect(calmMotion.transform).toBe("none");
  const calmTransitionDuration = await calmTheme.evaluate((element) => {
    const durations = window
      .getComputedStyle(element)
      .transitionDuration.split(",")
      .map((value) =>
        value.trim().endsWith("ms")
          ? Number.parseFloat(value)
          : Number.parseFloat(value) * 1_000,
      );
    return Math.max(...durations);
  });
  expect(calmTransitionDuration).toBeLessThanOrEqual(120);

  await page.evaluate(
    ([storageKey, mode]) => window.localStorage.setItem(storageKey, mode),
    [MOTION_STORAGE_KEY, "still"],
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion-mode", "still");
  const stillThemeCandidate = page
    .locator("[data-theme-picker]")
    .locator(
      '[role="radio"]:not([aria-disabled="true"]):not([aria-checked="true"])',
    )
    .first();
  const stillThemeId = await stillThemeCandidate
    .locator("[data-theme-preview]")
    .getAttribute("data-theme-preview");
  expect(stillThemeId).not.toBeNull();
  const stillTheme = page.locator(
    `[data-theme-picker] [role="radio"]:has([data-theme-preview="${stillThemeId}"])`,
  );
  await stillTheme.focus();
  await stillTheme.press("Space");
  await expect(stillTheme.locator("[data-theme-selection-indicator]")).toHaveCSS(
    "animation-name",
    "none",
  );
  const stillTransitionDuration = await stillTheme.evaluate((element) =>
    Math.max(
      ...window
        .getComputedStyle(element)
        .transitionDuration.split(",")
        .map((value) =>
          value.trim().endsWith("ms")
            ? Number.parseFloat(value)
            : Number.parseFloat(value) * 1_000,
        ),
    ),
  );
  expect(stillTransitionDuration).toBe(0);
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
      body: JSON.stringify({
        readiness: jobComparisonReadiness,
        proposals: [
          {
            id: "summary-rewrite",
            group: "content",
            title: "Clarify the opening summary",
            reason: "Lead with the role-relevant work already in the résumé.",
            beforeText: demo.data.summary,
            afterText:
              "Product leader building measurable B2B platform outcomes.",
            applyData: {
              summary:
                "Product leader building measurable B2B platform outcomes.",
            },
          },
        ],
      }),
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

  const acceptProposal = page.getByRole("button", {
    name: "Accept this change",
  });
  await acceptProposal.focus();
  await acceptProposal.press("Enter");

  const correspondence = page.locator("[data-editor-signal-status]");
  await expect(correspondence).toHaveAttribute(
    "data-motion-event",
    "editor.field.changed",
  );
  await expect(correspondence).toHaveAttribute("data-motion-target", "summary");
  const proposalStatus = page.locator("[data-ats-proposal-status]");
  await expect(proposalStatus).toBeVisible();
  await expect(proposalStatus).toBeFocused();
  await expect(proposalStatus).toContainText("Preview section: Summary");
  await expect(proposalStatus).toContainText("This change is not saved yet");
  await expect(page.getByLabel("Professional summary")).toHaveValue(
    "Product leader building measurable B2B platform outcomes.",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
