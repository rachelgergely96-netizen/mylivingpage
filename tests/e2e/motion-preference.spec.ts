import { expect, test, type Page } from "@playwright/test";
import {
  MOTION_STORAGE_KEY,
  type MotionPreference,
} from "../../src/lib/motion";

interface MotionPrepaintProbe {
  firstFrameMode: string | null;
  firstFramePreference: string | null;
  paintCountWhenResolved: number | null;
}

async function seedMotionPreference(
  page: Page,
  preference: MotionPreference,
  captureFirstFrame = false,
) {
  await page.addInitScript(
    ({ storageKey, preferenceValue, shouldCaptureFirstFrame }) => {
      const seedMarker = "mylivingpage.motion-preference.e2e-seeded";
      let shouldSeed = true;
      try {
        shouldSeed = window.sessionStorage.getItem(seedMarker) !== "true";
        if (shouldSeed) {
          if (preferenceValue === "system") {
            window.localStorage.removeItem(storageKey);
          } else {
            window.localStorage.setItem(storageKey, preferenceValue);
          }
          window.sessionStorage.setItem(seedMarker, "true");
        }
      } catch {
        // A failed write should surface through the root-attribute assertions.
      }

      if (!shouldCaptureFirstFrame) return;

      const probe: MotionPrepaintProbe = {
        firstFrameMode: null,
        firstFramePreference: null,
        paintCountWhenResolved: null,
      };
      (
        window as typeof window & {
          __mylivingPageMotionPrepaintProbe?: MotionPrepaintProbe;
        }
      ).__mylivingPageMotionPrepaintProbe = probe;

      const captureResolvedAttributes = () => {
        const mode = document.documentElement.dataset.motionMode;
        const resolvedPreference =
          document.documentElement.dataset.motionPreference;
        if (!mode || !resolvedPreference || probe.firstFrameMode !== null) {
          return;
        }
        probe.firstFrameMode = mode;
        probe.firstFramePreference = resolvedPreference;
        probe.paintCountWhenResolved = performance.getEntriesByType("paint").length;
        observer.disconnect();
      };
      const observer = new MutationObserver(captureResolvedAttributes);
      observer.observe(document, {
        attributes: true,
        attributeFilter: ["data-motion-mode", "data-motion-preference"],
        childList: true,
        subtree: true,
      });
      captureResolvedAttributes();
    },
    {
      storageKey: MOTION_STORAGE_KEY,
      preferenceValue: preference,
      shouldCaptureFirstFrame: captureFirstFrame,
    },
  );
}

async function expectRootMotion(
  page: Page,
  preference: MotionPreference,
  mode: "full" | "calm" | "still",
) {
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-motion-preference", preference);
  await expect(root).toHaveAttribute("data-motion-mode", mode);
}

test("a stored Still preference reaches the root before the first paint", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedMotionPreference(page, "still", true);
  await page.goto("/");

  await expectRootMotion(page, "still", "still");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const probe = (
          window as typeof window & {
            __mylivingPageMotionPrepaintProbe?: MotionPrepaintProbe;
          }
        ).__mylivingPageMotionPrepaintProbe;
        return {
          mode: probe?.firstFrameMode ?? null,
          paintCount: probe?.paintCountWhenResolved ?? null,
          preference: probe?.firstFramePreference ?? null,
        };
      }),
    )
    .toEqual({ mode: "still", paintCount: 0, preference: "still" });
});

test("System follows live operating-system reduced-motion changes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedMotionPreference(page, "system");
  await page.goto("/");

  await expectRootMotion(page, "system", "full");

  // Playwright updates the MediaQueryList in-place, exercising the store's
  // live change listener rather than a reload-only path.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectRootMotion(page, "system", "still");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expectRootMotion(page, "system", "full");
});

test("an explicit Full choice overrides a reduced-motion OS setting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedMotionPreference(page, "full");
  await page.goto("/");

  await expectRootMotion(page, "full", "full");

  const heroCanvas = page.locator(
    "[data-story-living-output] [data-theme-renderer-status]",
  );
  await expect(heroCanvas).toHaveAttribute("data-motion-mode", "full");
  await expect(heroCanvas).toHaveAttribute("data-theme-renderer-status", "ready");
  await expect(heroCanvas).toHaveAttribute("data-motion-running", "true");

  const sourceMotion = await page.locator("[data-truth-source]").evaluate((element) => {
    const style = window.getComputedStyle(element);
    const duration = style.animationDuration
      .split(",")
      .map((value) => {
        const token = value.trim();
        const amount = Number.parseFloat(token) || 0;
        return token.endsWith("ms") ? amount : amount * 1000;
      })
      .reduce((maximum, value) => Math.max(maximum, value), 0);
    return { duration, name: style.animationName };
  });
  expect(sourceMotion.name).not.toBe("none");
  expect(sourceMotion.duration).toBeGreaterThan(0);

  const proof = page.locator("[data-living-proof]");
  await proof
    .locator("[data-proof-achievement-input]")
    .fill("Made release decisions easier to audit and explain.");
  await proof.getByRole("button", { name: "Apply to all views" }).click();
  const proofMotion = await proof.locator("[data-proof-sync-signal]").evaluate(
    (element) => {
      const style = window.getComputedStyle(element);
      const duration = style.animationDuration
        .split(",")
        .map((value) => {
          const token = value.trim();
          const amount = Number.parseFloat(token) || 0;
          return token.endsWith("ms") ? amount : amount * 1_000;
        })
        .reduce((maximum, value) => Math.max(maximum, value), 0);
      return { duration, name: style.animationName };
    },
  );
  expect(proofMotion.name).toContain("proofSignalFull");
  expect(proofMotion.duration).toBeGreaterThan(0);
  expect(proofMotion.duration).toBeLessThanOrEqual(380);
});

test("Calm confirms a homepage style change with opacity only", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedMotionPreference(page, "calm");
  await page.goto("/");

  await expectRootMotion(page, "calm", "calm");
  const story = page.locator("[data-live-product-story]");
  const calmStyle = story.getByRole("radio", { name: /Calm and focused/ });
  const canvas = story.locator("[data-theme-renderer-status]");

  await expect(canvas).toHaveAttribute("data-motion-mode", "calm");
  await expect(canvas).toHaveAttribute("data-motion-running", "false");
  await expect(story.locator("[data-homepage-motion-cue]")).toBeHidden();
  await calmStyle.click();

  await expect(calmStyle).toBeFocused();
  await expect(story.locator("[data-story-living-output]"))
    .toHaveAttribute("data-theme-id", "nocturne");
  const cueMotion = await story.locator("[data-homepage-style-signal]").evaluate(
    (element) => {
      const style = window.getComputedStyle(element);
      const durations = style.animationDuration.split(",").map((value) => {
        const token = value.trim();
        const amount = Number.parseFloat(token) || 0;
        return token.endsWith("ms") ? amount : amount * 1000;
      });
      return {
        maxDuration: Math.max(...durations),
        names: style.animationName,
        transform: style.transform,
      };
    },
  );
  expect(cueMotion.names).toContain("homepageSignalFadeIn");
  expect(cueMotion.maxDuration).toBeLessThanOrEqual(120);
  expect(cueMotion.transform).toBe("none");

  const proof = page.locator("[data-living-proof]");
  await proof
    .locator("[data-proof-achievement-input]")
    .fill("Made release decisions easier to audit and explain.");
  await proof.getByRole("button", { name: "Apply to all views" }).click();
  const proofMotion = await proof.locator("[data-proof-sync-signal]").evaluate(
    (element) => {
      const style = window.getComputedStyle(element);
      const durations = style.animationDuration.split(",").map((value) => {
        const token = value.trim();
        const amount = Number.parseFloat(token) || 0;
        return token.endsWith("ms") ? amount : amount * 1_000;
      });
      return {
        maxDuration: Math.max(...durations),
        names: style.animationName,
        transform: style.transform,
      };
    },
  );
  expect(proofMotion.names).toContain("proofSignalCalm");
  expect(proofMotion.maxDuration).toBeLessThanOrEqual(120);
  expect(proofMotion.transform).toBe("none");
});

test("Calm waits to confirm the page-to-card handoff until it enters view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedMotionPreference(page, "calm");
  await page.goto("/");

  const cardChapter = page.locator("[data-share-card-chapter]");
  const signal = cardChapter.locator("[data-homepage-share-signal]");

  await expect(cardChapter).not.toHaveAttribute("data-visible", "true");
  await expect(signal).toHaveCSS("animation-name", "none");

  await cardChapter.scrollIntoViewIfNeeded();
  await expect(cardChapter).toHaveAttribute("data-visible", "true");

  const handoffMotion = await signal.evaluate((element) => {
    const style = window.getComputedStyle(element);
    const durations = style.animationDuration.split(",").map((value) => {
      const token = value.trim();
      const amount = Number.parseFloat(token) || 0;
      return token.endsWith("ms") ? amount : amount * 1000;
    });
    return {
      maxDuration: Math.max(...durations),
      names: style.animationName,
      transform: style.transform,
    };
  });

  expect(handoffMotion.names).toContain("homepageSignalFadeIn");
  expect(handoffMotion.maxDuration).toBeLessThanOrEqual(120);
  expect(handoffMotion.transform).toBe("none");
});

test("the compact control is keyboard-operable, persistent, and mobile-safe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedMotionPreference(page, "system");
  await page.goto("/");

  const footer = page.locator("footer");
  const control = footer.locator("[data-motion-control]");
  const select = control.getByRole("combobox", {
    name: "Site motion preference",
  });
  await footer.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  await expect(select).toHaveValue("system");
  await expect(select.locator("option")).toHaveText([
    "Device",
    "Full",
    "Calm",
    "Still",
  ]);

  const [controlBox, selectBox] = await Promise.all([
    control.boundingBox(),
    select.boundingBox(),
  ]);
  expect(controlBox).not.toBeNull();
  expect(selectBox).not.toBeNull();
  expect(controlBox!.height).toBeGreaterThanOrEqual(44);
  expect(selectBox!.height).toBeGreaterThanOrEqual(44);

  await select.focus();
  await expect(select).toBeFocused();
  await page.keyboard.press("f");
  await expect(select).toHaveValue("full");
  await expectRootMotion(page, "full", "full");

  await page.waitForTimeout(1_000);
  await page.keyboard.press("c");
  await expect(select).toHaveValue("calm");
  await expectRootMotion(page, "calm", "calm");

  await page.waitForTimeout(1_000);
  await page.keyboard.press("s");
  await expect(select).toHaveValue("still");
  await expectRootMotion(page, "still", "still");
  await expect
    .poll(() =>
      page.evaluate((storageKey) => window.localStorage.getItem(storageKey), MOTION_STORAGE_KEY),
    )
    .toBe("still");

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);

  await page.reload();
  await expectRootMotion(page, "still", "still");
  await expect(
    page.locator("footer").getByRole("combobox", {
      name: "Site motion preference",
    }),
  ).toHaveValue("still");
});

test("Still leaves ThemeCanvas static and removes authored CSS timelines", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedMotionPreference(page, "still");
  await page.goto("/");

  await expectRootMotion(page, "still", "still");
  const themeCanvases = page.locator("[data-theme-renderer-status]");
  await expect(themeCanvases.first()).toHaveAttribute(
    "data-theme-renderer-status",
    "ready",
  );
  await expect
    .poll(() =>
      themeCanvases.evaluateAll(
        (elements) =>
          elements.length > 0 &&
          elements.every(
            (element) =>
              element.getAttribute("data-motion-mode") === "still" &&
              element.getAttribute("data-motion-running") === "false",
          ),
      ),
    )
    .toBe(true);

  const proof = page.locator("[data-living-proof]");
  const stillAchievement = "Made release decisions easier to audit and explain.";
  await proof.locator("[data-proof-achievement-input]").fill(stillAchievement);
  await proof.getByRole("button", { name: "Apply to all views" }).click();
  await expect(proof.locator("[data-proof-sync-signal]")).toBeHidden();
  await expect(proof.locator("[data-proof-sync-status]")).toContainText(
    "Updated in three places",
  );
  await expect(proof.locator("[data-proof-fact='achievement']")).toHaveText([
    stillAchievement,
    stillAchievement,
    stillAchievement,
  ]);

  const timelineViolations = await page
    .locator("[data-homepage-prototype]")
    .evaluate((prototype) => {
      const timeListToMaximumMs = (value: string) =>
        value
          .split(",")
          .map((entry) => {
            const token = entry.trim();
            const amount = Number.parseFloat(token) || 0;
            return token.endsWith("ms") ? amount : amount * 1000;
          })
          .reduce((maximum, duration) => Math.max(maximum, duration), 0);
      const elements = [prototype, ...prototype.querySelectorAll("*")];
      const violations: string[] = [];

      for (const element of elements) {
        for (const pseudo of [null, "::before", "::after"] as const) {
          const style = window.getComputedStyle(element, pseudo);
          const animationMs = timeListToMaximumMs(style.animationDuration);
          const transitionMs = timeListToMaximumMs(style.transitionDuration);
          if (animationMs <= 0.01 && transitionMs <= 0.01) continue;

          const identity = [
            element.tagName.toLowerCase(),
            element.getAttribute("data-motion-event"),
            element.getAttribute("data-motion-signal"),
            element.getAttribute("class")?.split(/\s+/)[0],
            pseudo,
          ]
            .filter(Boolean)
            .join(" ");
          violations.push(
            `${identity}: animation=${animationMs}ms transition=${transitionMs}ms`,
          );
          if (violations.length >= 10) return violations;
        }
      }

      return violations;
    });
  expect(timelineViolations).toEqual([]);
});

test("chapter events preserve focus and foreground geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await seedMotionPreference(page, "still");
  await page.goto("/examples");
  await page.getByRole("tab", { name: /Referral asks/ }).click();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const sample = page.locator("#career-switching-designer");
  const rail = sample.getByRole("navigation", { name: "Living Page chapters" });
  const foreground = sample.locator(".resume-theme-content");
  const preview = sample.locator("[data-example-living-page]");
  const sectionToggle = rail.getByRole("button", { name: "Sections" });
  const sectionMenu = rail.locator("[data-living-section-menu]");
  const projectsButton = rail.locator(
    '[data-living-section-item="projects"]',
  );
  const experienceButton = rail.locator(
    '[data-living-section-item="experience"]',
  );
  const projectsDestination = sample.locator(
    '[data-analytics-section="projects"] [data-section-heading]',
  );
  const experienceDestination = sample.locator(
    '[data-analytics-section="experience"] [data-section-heading]',
  );
  const geometry = async () => ({
    foreground: await foreground.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
    preview: await preview.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  });

  await expect(rail).toBeVisible();
  const before = await geometry();
  await sectionToggle.click();
  await expect(sectionMenu).toBeVisible();
  await expect(sectionMenu).toHaveCSS("animation-duration", "0s");
  await expect(sectionMenu).toHaveCSS("transform", "none");
  await projectsButton.focus();
  await page.keyboard.press("Enter");

  await expect(projectsDestination).toBeFocused();
  await expect(rail).toHaveAttribute("data-motion-event", "page.chapter.entered");
  await expect(rail).toHaveAttribute("data-motion-target", "projects");
  await expect(rail).toHaveAttribute("data-motion-sequence", /[1-9]\d*/);
  const projectsSequence = Number(await rail.getAttribute("data-motion-sequence"));
  const afterProjects = await geometry();
  expect(afterProjects).toEqual(before);
  await expect(foreground).toHaveCSS("transform", "none");

  await sectionToggle.click();
  await expect(projectsButton).toBeFocused();
  await experienceButton.focus();
  await page.keyboard.press("Enter");
  await expect(experienceDestination).toBeFocused();
  await expect(rail).toHaveAttribute("data-motion-target", "experience");
  await expect
    .poll(async () => Number(await rail.getAttribute("data-motion-sequence")))
    .toBeGreaterThan(projectsSequence);
  expect(await geometry()).toEqual(before);
});
