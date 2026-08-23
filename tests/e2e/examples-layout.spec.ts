import { expect, test } from "@playwright/test";
import { ANALYTICS_CONSENT_STORAGE_KEY } from "../../src/lib/privacy/analytics-consent";

test("examples leads with a Living Page and keeps the switcher simple", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/examples");

  const experience = page.locator("[data-examples-experience]");
  const stage = page.locator("[data-example-stage]");

  await expect(
    page.getByRole("heading", {
      name: "See a Living Page in action.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /After applying/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Recruiter interested/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(stage.locator("canvas[aria-hidden='true']")).toBeVisible();
  await expect(stage.locator("[data-example-preview-provenance]")).toContainText(
    "Fictional sample",
  );
  await expect(stage).toBeInViewport({ ratio: 0.35 });
  await expect(stage).toHaveCSS("transform", "none");
  await expect(page.getByText("What the link changes")).toHaveCount(0);
  await expect(
    page.getByText("Need the résumé vs. page distinction?"),
  ).toBeVisible();

  const desktopFlow = await page.evaluate(() => {
    const stageElement = document.querySelector<HTMLElement>("[data-example-stage]");
    const switcher = document.querySelector<HTMLElement>("[data-example-switcher]");
    const experienceElement = document.querySelector<HTMLElement>(
      "[data-examples-experience]",
    );
    const stageRect = stageElement?.getBoundingClientRect();
    const switcherRect = switcher?.getBoundingClientRect();
    const experienceRect = experienceElement?.getBoundingClientRect();
    return {
      deadSpace: experienceRect && stageRect
        ? experienceRect.bottom - stageRect.bottom
        : Number.POSITIVE_INFINITY,
      previewLeads:
        Boolean(stageRect && switcherRect) && stageRect!.left < switcherRect!.left,
      previewWider:
        Boolean(stageRect && switcherRect) && stageRect!.width > switcherRect!.width,
    };
  });
  expect(desktopFlow.previewLeads).toBe(true);
  expect(desktopFlow.previewWider).toBe(true);
  expect(desktopFlow.deadSpace).toBeLessThanOrEqual(2);

  await stage.evaluate((element) => {
    element.setAttribute("data-mounted-probe", "preserved");
  });
  const afterApplyingTab = page.getByRole("tab", { name: /After applying/ });
  await afterApplyingTab.focus();
  await afterApplyingTab.click();
  await expect(afterApplyingTab).toBeFocused();
  await expect(stage).toHaveAttribute("data-mounted-probe", "preserved");
  await expect(stage.locator("[data-example-preview-provenance]")).toContainText(
    "Fictional sample",
  );
  await expect(
    page.getByRole("heading", { name: "Early-career litigation attorney" }),
  ).toBeVisible();
  await expect(page.locator("#early-career-attorney")).toBeVisible();

  const momentButtons = experience.getByRole("tab");
  for (const button of await momentButtons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("examples keeps the complete Living Page inside its compact mobile preview", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(storageKey, "essential");
  }, ANALYTICS_CONSENT_STORAGE_KEY);
  await page.goto("/examples");

  const stage = page.locator("[data-example-stage]");
  const switcher = page.locator("[data-example-switcher]");
  const mobileOrder = await Promise.all([stage.boundingBox(), switcher.boundingBox()]);
  expect(mobileOrder[0]).not.toBeNull();
  expect(mobileOrder[1]).not.toBeNull();
  expect(mobileOrder[1]!.y).toBeLessThan(mobileOrder[0]!.y);

  await page.getByRole("tab", { name: /Referral asks/ }).click();
  await expect(
    page.getByRole("heading", { name: "Designer moving into a new in-house role" }),
  ).toBeVisible();

  const animationDuration = await stage.evaluate(
    (element) => window.getComputedStyle(element).animationDuration,
  );
  expect(Number.parseFloat(animationDuration || "0")).toBeLessThanOrEqual(0.00001);

  const preview = stage.locator("[data-example-living-page]");
  const scrollRoot = preview.getByRole("region", {
    name: "Morgan Sample sample Living Page",
  });
  await expect(preview.locator("[data-resume-density='full']")).toBeVisible();
  expect((await preview.boundingBox())?.height).toBeLessThanOrEqual(353);
  await expect(
    stage.getByRole("button", { name: /Open full sample/ }),
  ).toHaveCount(0);
  await expect(page.locator("[data-example-preview-overlay]")).toHaveCount(0);
  expect(
    await scrollRoot.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);

  await preview.getByRole("button", { name: "Next chapter: Impact" }).click();
  await expect
    .poll(() => scrollRoot.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);

  await page.getByRole("tab", { name: /Recruiter interested/ }).click();
  const nextScrollRoot = page.getByRole("region", {
    name: "Avery Sample sample Living Page",
  });
  await expect(nextScrollRoot).toBeVisible();
  expect(await nextScrollRoot.evaluate((element) => element.scrollTop)).toBe(0);

  await stage.evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "auto" });
  });
  await expect(page.getByTestId("mobile-sticky-cta")).toHaveAttribute(
    "aria-hidden",
    "false",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("deep-linked examples restore context without replaying a selection event", async ({
  page,
}) => {
  await page.goto("/examples#early-career-attorney");

  await expect(
    page.getByRole("heading", { name: "Early-career litigation attorney" }),
  ).toBeVisible();
  const correspondence = page.locator("[data-selection-correspondence]");
  await expect(correspondence).toBeVisible();
  await expect(correspondence).not.toHaveAttribute(
    "data-motion-event",
    "example.context.changed",
  );
  await expect(correspondence).not.toHaveAttribute("data-motion-sequence", /.+/);
  await expect(page.locator("[role='status'][aria-live='polite']")).toHaveCount(1);
});
