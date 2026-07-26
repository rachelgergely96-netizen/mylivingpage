import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureUserProfile: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  incrementSignInCount: vi.fn(),
  recordLegalAcceptance: vi.fn(),
  serviceRoleFactory: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/auth/ensureUserProfile", () => ({
  ensureUserProfile: mocks.ensureUserProfile,
}));

vi.mock("@/lib/legal/acceptance", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  recordLegalAcceptance: mocks.recordLegalAcceptance,
}));

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteHandlerSupabaseClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => mocks.serviceRoleFactory()),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { GET } from "@/app/(auth)/callback/route";

describe("GET /callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.ensureUserProfile.mockResolvedValue(undefined);
    mocks.recordLegalAcceptance.mockResolvedValue(undefined);
    mocks.incrementSignInCount.mockResolvedValue(undefined);
    mocks.trackEvent.mockResolvedValue(undefined);
    mocks.serviceRoleFactory.mockReturnValue({
      rpc: mocks.incrementSignInCount,
    });
  });

  it("redirects missing-code callbacks to the canonical app origin", async () => {
    const response = await GET(
      new NextRequest("https://mylivingpage.com/callback?next=%2Fdashboard", {
        headers: {
          host: "mylivingpage.com",
        },
      }),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/dashboard",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("preserves a returning-user welcome intent through the OAuth callback", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?code=test-code&next=%2Fdashboard%3Fwelcome%3D1",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/dashboard?welcome=1",
    );
  });

  it.each([
    "%2F%2Fevil.example%2Fsteal",
    "%2F%5Cevil.example%2Fsteal",
    "%252F%252Fevil.example%2Fsteal",
  ])("rejects an unsafe callback destination: %s", async (next) => {
    const response = await GET(
      new NextRequest(`https://www.mylivingpage.com/callback?next=${next}`),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/dashboard",
    );
  });

  it("tracks callback failures with both request host and canonical auth origin", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: new Error("PKCE code verifier not found in storage."),
    });

    const response = await GET(
      new NextRequest(
        "https://mylivingpage.com/callback?code=test-code&next=%2Fdashboard",
        {
          headers: {
            host: "mylivingpage.com",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/login?error=google_signin_expired&next=%2Fdashboard",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "auth.callback.failed",
      expect.objectContaining({
        error_code: "google_signin_expired",
        request_host: "mylivingpage.com",
        auth_origin: "https://www.mylivingpage.com",
        redirect_to: "https://www.mylivingpage.com/dashboard",
      }),
    );
  });

  it("tracks successful callbacks with provider and redirect metadata", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          app_metadata: {
            provider: "google",
          },
          user_metadata: {},
        },
      },
    });

    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?code=test-code&next=%2Fcreate&legal_accept=1&legal_source=signup",
        {
          headers: {
            host: "www.mylivingpage.com",
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/create",
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-123",
      "auth.callback.succeeded",
      expect.objectContaining({
        auth_provider: "google",
        next: "/create",
        request_host: "www.mylivingpage.com",
        legal_accept_requested: true,
        legal_source: "signup",
      }),
    );
  });
});
