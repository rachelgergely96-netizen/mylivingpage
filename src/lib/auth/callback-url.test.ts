import { afterEach, describe, expect, it } from "vitest";
import { buildAuthCallbackUrl, buildGoogleAuthStartUrl } from "@/lib/auth/callback-url";

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
