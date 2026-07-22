import { describe, expect, it } from "vitest";
import { isKnownCrawlerUserAgent } from "@/lib/analytics/bot-user-agent";

describe("isKnownCrawlerUserAgent", () => {
  it.each(["Googlebot/2.1", "Mozilla/5.0 (compatible; bingbot/2.0)", "Twitterbot/1.0", "LinkedInBot/1.0"])(
    "recognizes %s",
    (userAgent) => expect(isKnownCrawlerUserAgent(userAgent)).toBe(true),
  );

  it("does not reject ordinary browsers or missing headers", () => {
    expect(isKnownCrawlerUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/126 Safari/537.36")).toBe(false);
    expect(isKnownCrawlerUserAgent(null)).toBe(false);
  });
});
