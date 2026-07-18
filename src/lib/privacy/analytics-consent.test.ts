import { describe, expect, it } from "vitest";
import {
  isAnalyticsEligiblePath,
  isMyLivingPageAnalyticsHost,
  parseAnalyticsConsent,
} from "@/lib/privacy/analytics-consent";

describe("analytics consent", () => {
  it.each(["/", "/pricing", "/guides", "/guides/resume-pdf-check", "/privacy", "/cookies"])(
    "allows analytics on a brand-owned page: %s",
    (pathname) => expect(isAnalyticsEligiblePath(pathname)).toBe(true),
  );

  it.each(["/rachel", "/create", "/dashboard", "/admin", "/login", "/api/profile"])(
    "never enables analytics on identity-bearing or product routes: %s",
    (pathname) => expect(isAnalyticsEligiblePath(pathname)).toBe(false),
  );

  it("accepts only known stored choices", () => {
    expect(parseAnalyticsConsent("analytics")).toBe("analytics");
    expect(parseAnalyticsConsent("essential")).toBe("essential");
    expect(parseAnalyticsConsent("yes")).toBeNull();
    expect(parseAnalyticsConsent(null)).toBeNull();
  });

  it("limits analytics to MyLivingPage hosts", () => {
    expect(isMyLivingPageAnalyticsHost("www.mylivingpage.com")).toBe(true);
    expect(isMyLivingPageAnalyticsHost("mylivingpage.com")).toBe(true);
    expect(isMyLivingPageAnalyticsHost("localhost")).toBe(false);
    expect(isMyLivingPageAnalyticsHost("127.0.0.1")).toBe(false);
    expect(isMyLivingPageAnalyticsHost("profiles.example.com")).toBe(false);
    expect(isMyLivingPageAnalyticsHost("mylivingpage-preview.vercel.app")).toBe(false);
  });
});
