import { expect, test } from "@playwright/test";

test("try keeps source lineage local, reviewable, and explicitly saved", async ({
  page,
}) => {
  const observedRequests: Array<{ url: string; body: string }> = [];
  page.on("request", (request) => {
    observedRequests.push({
      url: request.url(),
      body: request.postData() ?? "",
    });
  });
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/try");

  await expect(
    page.getByRole("link", { name: "Create a free account" }),
  ).toHaveAttribute("href", "/signup?ref=try_upload&next=/create");

  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview product leader sample" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview operations lead sample" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Previewing does not write a persistent device\/browser draft/i),
  ).toBeVisible();

  await page.getByRole("button", { name: "Preview product leader sample" }).click();
  await expect(
    page.getByRole("heading", { name: "Detected facts and their source lines" }),
  ).toBeVisible();
  await expect(page.getByText("Review required · check the detected facts")).toBeVisible();

  const lineageButtons = page.locator("[data-provenance-plate] button");
  await expect(lineageButtons.first()).toBeVisible();
  await lineageButtons.first().click();
  await expect(page.locator("[data-correspondence-target='identity']")).toBeVisible();

  expect(new URL(page.url()).pathname).toBe("/try");
  expect(new URL(page.url()).search).toBe("");
  const lineageTokens = (await page.locator("[data-provenance-plate] q").allTextContents())
    .flatMap((line) => line.split(/\s*[|•]\s*/))
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 8);
  const leakedAttributes = await page.evaluate((tokens) => {
    return Array.from(document.querySelectorAll("*")).flatMap((element) =>
      Array.from(element.attributes)
        .filter(
          (attribute) =>
            (attribute.name.startsWith("data-") || attribute.name === "href") &&
            tokens.some((token) => attribute.value.toLowerCase().includes(token)),
        )
        .map((attribute) => `${attribute.name}=${attribute.value}`),
    );
  }, lineageTokens);
  expect(leakedAttributes).toEqual([]);
  expect(
    await page.evaluate(() => window.localStorage.getItem("mlp-draft-create-anonymous")),
  ).toBeNull();

  const textarea = page.getByLabel("Paste your résumé");
  const pastedRequestSentinel = `pasted-resume-${Date.now()}-request-sentinel`;
  await textarea.fill(
    `${await textarea.inputValue()}\nAdditional reviewed detail: ${pastedRequestSentinel}.`,
  );
  await expect(page.getByText("Text changed · preview needs a refresh")).toBeVisible();
  await page.getByRole("button", { name: "Refresh my page" }).click();
  await page.getByRole("button", { name: "Mark these facts reviewed" }).click();
  await expect(page.getByText("Reviewed · ready to keep")).toBeVisible();
  await expect(
    page.getByText(/temporary device\/browser draft for the unauthenticated handoff/i),
  ).toBeVisible();

  const encodedSentinel = encodeURIComponent(pastedRequestSentinel);
  expect(
    observedRequests.filter(
      (request) =>
        request.url.includes(pastedRequestSentinel) ||
        request.url.includes(encodedSentinel) ||
        request.body.includes(pastedRequestSentinel) ||
        request.body.includes(encodedSentinel),
    ),
  ).toEqual([]);

  const keepLink = page
    .locator("section.site-callout")
    .getByRole("link", { name: "Create my free page" });
  await expect(keepLink).toHaveAttribute(
    "href",
    "/signup?ref=try_keep&next=/create",
  );
  await keepLink.evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await keepLink.click();
  await expect(page.getByText(/Temporary device\/browser draft saved/i)).toBeVisible();
  expect(
    await page.evaluate(() => window.localStorage.getItem("mlp-draft-create-anonymous")),
  ).not.toBeNull();
});

test("try keeps the preview recoverable when browser draft storage is blocked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    window.addEventListener(
      "mlp-test-enable-draft-storage",
      () => {
        Storage.prototype.setItem = originalSetItem;
      },
      { once: true },
    );
    Storage.prototype.setItem = function setItem(key: string, value: string) {
      if (key === "mlp-draft-create-anonymous") {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      }
      return originalSetItem.call(this, key, value);
    };
  });
  await page.goto("/try");

  await page.getByRole("button", { name: "Preview product leader sample" }).click();
  await page.getByRole("button", { name: "Mark these facts reviewed" }).click();
  const handoff = page.locator("section.site-callout");
  await handoff.getByRole("link", { name: "Create my free page" }).click();

  await expect(page).toHaveURL(/\/try$/);
  const saveError = handoff.locator("[data-try-draft-save-error]");
  await expect(saveError).toHaveRole("alert");
  await expect(saveError).toContainText(
    "We couldn't save a temporary browser draft",
  );
  await expect(
    page.getByRole("heading", { name: "Detected facts and their source lines" }),
  ).toBeVisible();
  await expect(page.getByText(/Temporary device\/browser draft saved/i)).toHaveCount(0);
  expect(
    await page.evaluate(() => window.localStorage.getItem("mlp-draft-create-anonymous")),
  ).toBeNull();

  const loginLink = handoff.getByRole("link", { name: "I already have an account" });
  await loginLink.click();
  await expect(page).toHaveURL(/\/try$/);
  await expect(saveError).toContainText(
    "We couldn't save a temporary browser draft",
  );

  await page.evaluate(() => {
    window.dispatchEvent(new Event("mlp-test-enable-draft-storage"));
  });
  await loginLink.evaluate((element) => {
    element.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await loginLink.click();
  await expect(saveError).toHaveCount(0);
  await expect(page.getByText(/Temporary device\/browser draft saved/i)).toBeVisible();
  expect(
    await page.evaluate(() => window.localStorage.getItem("mlp-draft-create-anonymous")),
  ).not.toBeNull();
});

test("guide chapter markers resolve to stable article landmarks", async ({ page }) => {
  await page.goto("/guides/resume-pdf-check#why-clean-pdf-text-matters");

  const rail = page.locator("[data-semantic-chapter-rail]");
  await expect(rail).toBeVisible();
  const destinationsExist = await rail.locator("a").evaluateAll((links) =>
    links.every((link) => {
      const id = link.getAttribute("href")?.slice(1) ?? "";
      return Boolean(id && document.getElementById(id));
    }),
  );
  expect(destinationsExist).toBe(true);

  const secondChapter = rail.locator("a").nth(1);
  const secondHref = await secondChapter.getAttribute("href");
  await expect(secondChapter).toHaveAttribute("aria-current", "step");
  await expect(rail).not.toHaveAttribute("data-motion-event");
  await expect(rail).not.toHaveAttribute("data-motion-sequence");
  await expect(page.locator(secondHref ?? "#missing-guide-section")).toBeVisible();

  const thirdChapter = rail.locator("a").nth(2);
  const thirdHref = await thirdChapter.getAttribute("href");
  await thirdChapter.click();
  await expect.poll(() => new URL(page.url()).hash).toBe(thirdHref);
  await expect(rail).toHaveAttribute("data-motion-event", "page.chapter.entered");
  await expect(rail).toHaveAttribute("data-motion-target", "after-the-pdf-check");
  await expect(rail).toHaveAttribute("data-motion-sequence", "1");
  await page.waitForTimeout(250);
  await expect(rail).toHaveAttribute("data-motion-sequence", "1");

  await page.evaluate(() => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
    document.getElementById("why-clean-pdf-text-matters")?.scrollIntoView({
      block: "start",
      behavior: "auto",
    });
  });
  await expect(secondChapter).toHaveAttribute("aria-current", "step");

  await page.reload();
  await expect(secondChapter).toHaveAttribute("aria-current", "step");
  await expect(rail).not.toHaveAttribute("data-motion-event");
  await expect(rail).not.toHaveAttribute("data-motion-sequence");

  await page.locator("#after-the-pdf-check").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "auto" });
  });
  await expect(rail).toHaveAttribute("data-motion-target", "after-the-pdf-check");
  await expect(rail).toHaveAttribute("data-motion-sequence", "1");

  await page.evaluate(() => {
    window.location.hash = "what-a-pdf-check-catches";
  });
  await expect(rail).toHaveAttribute("data-motion-target", "what-a-pdf-check-catches");
  await expect(rail).toHaveAttribute("data-motion-sequence", "2");
  await page.waitForTimeout(250);
  await expect(rail).toHaveAttribute("data-motion-sequence", "2");
});

test("pricing describes one reviewed source without a live-sync promise", async ({
  page,
}) => {
  await page.goto("/pricing");

  const map = page.locator("[data-pricing-correspondence]");
  await expect(map.getByText("Reviewed professional information")).toBeVisible();
  await expect(map.getByText("Living Page", { exact: true })).toBeVisible();
  await expect(map.getByText("Résumé PDF", { exact: true })).toBeVisible();
  await expect(map.getByText("Share card + QR", { exact: true })).toBeVisible();
  await expect(map.getByText(/not a real-time synchronization guarantee/i)).toBeVisible();
  await expect(map).not.toHaveAttribute("data-motion-event");
});
