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
    `${origin}/examples`,
    `${origin}/guides`,
    `${origin}/guides/ats-resume-test`,
    `${origin}/guides/living-page-vs-pdf-resume`,
    `${origin}/guides/recruiter-search-keywords`,
    `${origin}/legal`,
    `${origin}/pricing`,
    `${origin}/privacy`,
    `${origin}/terms`,
  ]);
  expect(sitemapText).not.toContain("/ray-smith");
});

test("public acquisition pages expose unique metadata and canonicals", async ({ page }) => {
  const cases = [
    {
      path: "/",
      title: "MyLivingPage | Visible to ATS, Memorable to People",
      description:
        "Keep an ATS-safe resume for the machines and one living page recruiters actually remember once they click.",
      pathname: "/",
    },
    {
      path: "/pricing",
      title: "Pricing | MyLivingPage",
      description:
        "Compare MyLivingPage pricing for the living page you send after your ATS-safe resume gets you seen.",
      pathname: "/pricing",
    },
    {
      path: "/examples",
      title: "Examples | MyLivingPage",
      description:
        "Browse sample living pages that help recruiters understand you faster once your ATS-safe resume gets you seen.",
      pathname: "/examples",
    },
    {
      path: "/guides",
      title: "ATS Resume and Recruiter Search Guides | MyLivingPage",
      description:
        "Answer-first guides on ATS readability, recruiter keyword search behavior, and when to use a living page alongside your PDF resume.",
      pathname: "/guides",
    },
    {
      path: "/guides/ats-resume-test",
      title: "ATS Resume Test: How to Check If Your Resume Is Readable | MyLivingPage",
      description:
        "Run a 30-second ATS resume test to see whether your PDF extracts clean text and what to fix before you apply.",
      pathname: "/guides/ats-resume-test",
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

  await page.goto("/guides/ats-resume-test");
  jsonLd = await getJsonLdText(page);
  expect(jsonLd).toContain('"@type":"Article"');
  expect(jsonLd).toContain('"headline":"ATS Resume Test: How to Check If Your Resume Is Readable"');
});

test("guide articles link into the funnel with distinct CTA refs", async ({ page }) => {
  await page.goto("/guides/ats-resume-test");

  await expect(page.getByText("Short answer")).toBeVisible();
  await expect(page.getByText("By MyLivingPage Editorial Team")).toBeVisible();
  await expect(page.locator('time[dateTime="2026-03-12"]')).toHaveText("March 12, 2026");
  await expect(page.getByRole("link", { name: "Build a page from the resume you already use" })).toHaveAttribute(
    "href",
    "/signup?ref=guide_ats-resume-test_signup",
  );
  await expect(page.getByRole("link", { name: "See sample pages recruiters can scan quickly" })).toHaveAttribute(
    "href",
    "/examples?ref=guide_ats-resume-test_examples",
  );
  await expect(page.getByRole("link", { name: "See PDF export and QR-ready share card options" })).toHaveAttribute(
    "href",
    "/pricing?ref=guide_ats-resume-test_pricing",
  );
});
