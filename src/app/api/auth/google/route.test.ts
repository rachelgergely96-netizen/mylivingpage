import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabaseClient: vi.fn((_: NextRequest, response: Response) => ({
    auth: {
      signInWithOAuth: async (...args: Parameters<typeof mocks.signInWithOAuth>) => {
        if ("cookies" in response) {
          (response as Response & { cookies: { set: (name: string, value: string, options?: { path?: string }) => void } }).cookies.set(
            "sb-pkce-code-verifier",
            "test-verifier",
            { path: "/" },
          );
        }
        return mocks.signInWithOAuth(...args);
      },
    },
  })),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { GET } from "@/app/api/auth/google/route";

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithOAuth.mockResolvedValue({
      data: {
        url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
      },
      error: null,
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("starts Google OAuth with a callback on the current origin", async () => {
    const response = await GET(
      new NextRequest("https://www.mylivingpage.com/api/auth/google?next=%2Fdashboard&screen=login"),
    );

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://www.mylivingpage.com/callback?next=%2Fdashboard",
      },
    });
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
    );
    expect(response.headers.get("set-cookie")).toContain("sb-pkce-code-verifier=test-verifier");
  });

  it("canonicalizes apex-host OAuth starts onto the www callback origin", async () => {
    const response = await GET(
      new NextRequest("https://mylivingpage.com/api/auth/google?next=%2Fdashboard&screen=login"),
    );

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://www.mylivingpage.com/callback?next=%2Fdashboard",
      },
    });
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
    );
  });

  it("preserves signup callback metadata for legal acceptance", async () => {
    await GET(
      new NextRequest(
        "https://www.mylivingpage.com/api/auth/google?next=%2Fcreate&screen=signup&legal_accept=1&legal_source=signup",
      ),
    );

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://www.mylivingpage.com/callback?next=%2Fcreate&legal_accept=1&legal_source=signup",
      },
    });
  });

  it("returns to the auth screen with a stable error when OAuth cannot start", async () => {
    mocks.signInWithOAuth.mockResolvedValue({
      data: {
        url: null,
      },
      error: new Error("OAuth start failed"),
    });

    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/api/auth/google?next=%2Fdashboard&screen=login",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/login?next=%2Fdashboard&error=google_signin_failed",
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "auth.google.start.failed",
      expect.objectContaining({
        next: "/dashboard",
        screen: "login",
      }),
    );
  });
});
