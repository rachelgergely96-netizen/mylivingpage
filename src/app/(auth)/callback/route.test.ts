import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureUserProfile: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  incrementSignInCount: vi.fn(),
  lookupExistingPage: vi.fn(),
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
    mocks.lookupExistingPage.mockResolvedValue({
      data: null,
      error: null,
    });
    mocks.trackEvent.mockResolvedValue(undefined);
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          or: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: mocks.lookupExistingPage,
            })),
          })),
        })),
      })),
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

  it("routes an expired email-confirmation link to the login form with a plain-language code", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&next=%2Fcreate",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/login?error=confirm_link_expired&next=%2Fcreate",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "auth.callback.failed",
      expect.objectContaining({
        error_code: "confirm_link_expired",
        provider_error: "access_denied",
        provider_error_code: "otp_expired",
        next: "/create",
      }),
    );
  });

  it("routes a cancelled provider consent screen to the login form", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?error=access_denied&next=%2Fdashboard&screen=login&ref=pricing_nav",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/login?error=signin_cancelled&next=%2Fdashboard&ref=pricing_nav",
    );
  });

  it("returns a cancelled signup provider flow to signup with safe context intact", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?error=access_denied&next=%2Fcreate&screen=signup&ref=landing_apply_nav",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/signup?error=signin_cancelled&next=%2Fcreate&ref=landing_apply_nav",
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "auth.callback.failed",
      expect.objectContaining({
        next: "/create",
        screen: "signup",
        ref: "landing_apply_nav",
      }),
    );
  });

  it("sanitizes signup callback context before constructing an error redirect", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?error=access_denied&next=%2F%2Fevil.example%2Fsteal&screen=signup&ref=https%3A%2F%2Fevil.example%2Fsteal",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/signup?error=signin_cancelled&next=%2Fdashboard",
    );
  });

  it("never echoes unrecognized provider error params into the redirect", async () => {
    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?error=server_error&error_description=Totally+unexpected&next=%2Fdashboard",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/login?error=signin_failed&next=%2Fdashboard",
    );
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

  it("does not send an existing page owner back through create onboarding", async () => {
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
    mocks.lookupExistingPage.mockResolvedValue({
      data: { id: "page-123" },
      error: null,
    });

    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?code=test-code&next=%2Fcreate",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/dashboard?welcome=1",
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-123",
      "auth.callback.succeeded",
      expect.objectContaining({
        has_living_page: true,
        next: "/dashboard?welcome=1",
        requested_next: "/create",
      }),
    );
  });

  it("resumes onboarding for an authenticated account without a page", async () => {
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
        "https://www.mylivingpage.com/callback?code=test-code&next=%2Fdashboard%3Fwelcome%3D1",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/create",
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
      "https://www.mylivingpage.com/login?error=signin_expired&next=%2Fdashboard",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "auth.callback.failed",
      expect.objectContaining({
        error_code: "signin_expired",
        request_host: "mylivingpage.com",
        auth_origin: "https://www.mylivingpage.com",
        redirect_to: "https://www.mylivingpage.com/dashboard",
      }),
    );
  });

  it("returns a failed signup code exchange to signup with next and ref", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({
      error: new Error("PKCE code verifier not found in storage."),
    });

    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?code=test-code&next=%2Fcreate&screen=signup&ref=landing_apply_nav",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/signup?error=signin_expired&next=%2Fcreate&ref=landing_apply_nav",
    );
  });

  it("gracefully returns profile provisioning failures to signup with bounded telemetry", async () => {
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
    mocks.ensureUserProfile.mockRejectedValue(
      new Error(`Profile lookup failed ${"x".repeat(400)}`),
    );

    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?code=test-code&next=%2Fcreate&screen=signup&ref=landing_apply_nav",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/signup?error=signin_failed&next=%2Fcreate&ref=landing_apply_nav",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-123",
      "auth.callback.failed",
      expect.objectContaining({
        error_code: "profile_provision_failed",
        next: "/create",
        screen: "signup",
        ref: "landing_apply_nav",
        redirect_to:
          "https://www.mylivingpage.com/signup?error=signin_failed&next=%2Fcreate&ref=landing_apply_nav",
      }),
    );
    const failureMetadata = mocks.trackEvent.mock.calls[0]?.[2];
    expect(failureMetadata?.error).toHaveLength(240);
    expect(mocks.lookupExistingPage).not.toHaveBeenCalled();
    expect(mocks.incrementSignInCount).not.toHaveBeenCalled();
  });

  it("sanitizes callback context when profile provisioning fails", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          app_metadata: {},
          user_metadata: {},
        },
      },
    });
    mocks.ensureUserProfile.mockRejectedValue({
      message: "Profile conflict lookup unavailable",
    });

    const response = await GET(
      new NextRequest(
        "https://www.mylivingpage.com/callback?code=test-code&next=%2F%2Fevil.example%2Fsteal&screen=admin&ref=https%3A%2F%2Fevil.example%2Fsteal",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://www.mylivingpage.com/login?error=signin_failed&next=%2Fdashboard",
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-123",
      "auth.callback.failed",
      expect.objectContaining({
        error: "Profile conflict lookup unavailable",
        error_code: "profile_provision_failed",
        next: "/dashboard",
        screen: "login",
        ref: null,
      }),
    );
    expect(mocks.trackEvent).not.toHaveBeenCalledWith(
      "user-123",
      "auth.callback.succeeded",
      expect.anything(),
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
        requested_next: "/create",
        has_living_page: false,
        request_host: "www.mylivingpage.com",
        legal_accept_requested: true,
        legal_source: "signup",
      }),
    );
  });
});
