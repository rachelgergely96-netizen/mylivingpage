import { afterEach, describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  buildGoogleAuthStartUrl,
  sanitizeAuthRedirectPath,
} from "@/lib/auth/callback-url";

describe("sanitizeAuthRedirectPath", () => {
  it("keeps same-site paths, queries, and hashes", () => {
    expect(sanitizeAuthRedirectPath("/create?ref=landing#details")).toBe(
      "/create?ref=landing#details",
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/\\evil.example/steal",
    "/.//evil.example/steal",
    "/a/..//evil.example/steal",
    "/%2e%2e//evil.example/steal",
    "/a/..\\evil.example/steal",
    "javascript:alert(1)",
    "dashboard",
  ])("rejects unsafe auth destination %s", (value) => {
    expect(sanitizeAuthRedirectPath(value)).toBe("/dashboard");
  });

  it("supports a route-specific fallback", () => {
    expect(sanitizeAuthRedirectPath("//evil.example", "/create")).toBe("/create");
  });
});

describe("buildAuthCallbackUrl", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("uses the canonical app origin for auth callbacks", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.mylivingpage.com";

    expect(
      buildAuthCallbackUrl({
        next: "/dashboard",
      }),
    ).toBe("https://www.mylivingpage.com/callback?next=%2Fdashboard");
  });

  it("preserves legal acceptance metadata for signup callbacks", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.mylivingpage.com";

    expect(
      buildAuthCallbackUrl({
        next: "/create",
        legalAcceptRequested: true,
        legalSource: "signup",
      }),
    ).toBe(
      "https://www.mylivingpage.com/callback?next=%2Fcreate&legal_accept=1&legal_source=signup",
    );
  });

  it("builds Google auth starts on the canonical app origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.mylivingpage.com";

    expect(
      buildGoogleAuthStartUrl({
        next: "/dashboard",
        screen: "login",
      }),
    ).toBe("https://www.mylivingpage.com/api/auth/google?next=%2Fdashboard&screen=login");
  });

  it("preserves signup metadata and referrers in Google auth starts", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.mylivingpage.com";

    expect(
      buildGoogleAuthStartUrl({
        next: "/create",
        screen: "signup",
        legalAcceptRequested: true,
        legalSource: "signup",
        ref: "landing_apply_nav",
      }),
    ).toBe(
      "https://www.mylivingpage.com/api/auth/google?next=%2Fcreate&screen=signup&legal_accept=1&legal_source=signup&ref=landing_apply_nav",
    );
  });
});
