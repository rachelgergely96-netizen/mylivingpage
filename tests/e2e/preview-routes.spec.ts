import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`dashboard preview keeps its public-page link inside the credential-free harness on ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/dev/dashboard-preview");

    await expect(page.getByRole("link", { name: "View live" })).toHaveAttribute(
      "href",
      "/preview-living-page",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
  });
}

test("editor preview profile seam stays credential-free without 401 noise", async ({
  page,
}) => {
  const profileStatuses: number[] = [];
  const consoleErrors: string[] = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname === "/api/profile") {
      profileStatuses.push(response.status());
    }
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/dev/editor-preview?autosave=off", {
    waitUntil: "networkidle",
  });

  await expect(
    page.getByRole("heading", { name: "Avery Sample", level: 1 }),
  ).toBeVisible();
  expect(profileStatuses).toEqual([200]);
  expect(consoleErrors).toEqual([]);
});
