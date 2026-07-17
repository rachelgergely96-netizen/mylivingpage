import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]).sort();
}

async function getJsonLdText(page: Page) {
  const chunks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return chunks.join("\n");
}

test("robots.txt and sitemap.xml expose the SEO foundation routes", async ({ request }) => {
  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.ok()).toBeTruthy();
  const robotsText = await robotsResponse.text();
  const hostLine = robotsText.split("\n").find((line) => line.startsWith("Host: "));
  const sitemapLine = robotsText.split("\n").find((line) => line.startsWith("Sitemap: "));

  expect(hostLine).toBeTruthy();
  expect(sitemapLine).toBeTruthy();
  expect(robotsText).toContain("Disallow: /dashboard");
  expect(robotsText).toContain("Disallow: /api");

  const origin = new URL(sitemapLine!.replace("Sitemap: ", "")).origin;

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBeTruthy();
  const sitemapText = await sitemapResponse.text();

  expect(extractLocs(sitemapText)).toEqual([
    `${origin}/`,
    `${origin}/delete-account`,
    `${origin}/examples`,
    `${origin}/guides`,
    `${origin}/guides/living-page-vs-pdf-resume`,
    `${origin}/guides/recruiter-search-keywords`,
    `${origin}/guides/resume-pdf-check`,
    `${origin}/legal`,
    `${origin}/pricing`,
    `${origin}/privacy`,
    `${origin}/security`,
    `${origin}/terms`,
  ]);
  expect(sitemapText).not.toContain("/ray-smith");
});

test("homepage trust policies are public and render their current documents", async ({ page }) => {
  await page.goto("/security");
  await expect(page.getByRole("heading", { name: "Security Overview" })).toBeVisible();

  await page.goto("/delete-account");
  await expect(page.getByRole("heading", { name: "Account Deletion" })).toBeVisible();

  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Free Service and Legacy Billing" })).toBeVisible();
  await expect(page.getByText("We do not offer new paid plans at this time.")).toBeVisible();
  await expect(page.getByText("Certain features require a paid subscription.")).toHaveCount(0);
});

test("public acquisition pages expose unique metadata and canonicals", async ({ page }) => {
  const cases = [
    {
      path: "/",
      title: "MyLivingPage | Make your experience easier to understand and harder to forget",
      description:
        "Build one living professional page. Shape it for the moment. Share it anywhere.",
      pathname: "/",
    },
    {
      path: "/pricing",
      title: "Simple Pricing: Free | MyLivingPage",
      description:
        "Build one living professional page. Shape it for the moment. Share it anywhere.",
      pathname: "/pricing",
    },
    {
      path: "/examples",
      title: "Examples | MyLivingPage",
      description:
        "Browse sample Living Pages that help recruiters understand you faster after they click.",
      pathname: "/examples",
    },
    {
      path: "/guides",
      title: "Resume PDF and Living Page Guides | MyLivingPage",
      description:
        "Answer-first guides on checking your Resume PDF, improving search visibility, and using a Living Page alongside your PDF.",
      pathname: "/guides",
    },
    {
      path: "/guides/resume-pdf-check",
      title: "Resume PDF Check: How to Make Sure Your PDF Reads Cleanly | MyLivingPage",
      description:
        "Run a quick Resume PDF check to confirm your file copies clean text and is ready to share.",
      pathname: "/guides/resume-pdf-check",
    },
  ];

  for (const seoCase of cases) {
    await page.goto(seoCase.path);
    await expect(page).toHaveTitle(seoCase.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", seoCase.description);

    const canonicalHref = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonicalHref).toBeTruthy();
    expect(new URL(canonicalHref!).pathname).toBe(seoCase.pathname);
  }
});

test("homepage, examples, and guide pages emit the expected JSON-LD types", async ({ page }) => {
  await page.goto("/");
  let jsonLd = await getJsonLdText(page);
  expect(jsonLd).toContain('"@type":"Organization"');
  expect(jsonLd).toContain('"@type":"WebSite"');

  await page.goto("/examples");
  jsonLd = await getJsonLdText(page);
  expect(jsonLd).toContain('"@type":"CollectionPage"');

  await page.goto("/guides/resume-pdf-check");
  jsonLd = await getJsonLdText(page);
  expect(jsonLd).toContain('"@type":"Article"');
  expect(jsonLd).toContain('"headline":"Resume PDF Check: How to Make Sure Your PDF Reads Cleanly"');
});

test("guide articles link into the funnel with distinct CTA refs", async ({ page }) => {
  await page.goto("/guides/resume-pdf-check");

  await expect(page.getByText("Short answer")).toBeVisible();
  await expect(page.getByText("Before you send it", { exact: true })).toBeVisible();
  await expect(page.getByText("By MyLivingPage Editorial Team")).toBeVisible();
  await expect(page.locator('time[dateTime="2026-03-20"]')).toHaveText("March 20, 2026");
  await expect(page.getByRole("link", { name: "Start from the resume you already use" })).toHaveAttribute(
    "href",
    "/signup?ref=guide_resume-pdf-check_build&next=/create",
  );
  await expect(page.getByRole("link", { name: "See sample pages recruiters can scan quickly" })).toHaveAttribute(
    "href",
    "/examples?ref=guide_resume-pdf-check_examples",
  );
  await expect(page.getByRole("link", { name: "See PDF export and QR-ready share card options" })).toHaveAttribute(
    "href",
    "/pricing?ref=guide_resume-pdf-check_pricing",
  );
});

test("legacy ATS guide URLs permanently redirect to the new Resume PDF guide", async ({ page }) => {
  await page.goto("/guides/ats-resume-test");
  await expect(page).toHaveURL(/\/guides\/resume-pdf-check$/);
});
