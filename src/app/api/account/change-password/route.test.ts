import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  authUpdateUser: vi.fn(),
  enforceRateLimit: vi.fn(),
  requireRecentReauthentication: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.authGetUser,
      updateUser: mocks.authUpdateUser,
    },
  })),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mocks.enforceRateLimit(...args),
}));

vi.mock("@/lib/auth/reauthentication", () => ({
  requireRecentReauthentication: (...args: unknown[]) =>
    mocks.requireRecentReauthentication(...args),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/account/change-password/route";

function requestWithRawBody(body: string) {
  return new Request("http://localhost/api/account/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/account/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
    });
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.requireRecentReauthentication.mockResolvedValue({ ok: true });
    mocks.authUpdateUser.mockResolvedValue({ error: null });
  });

  it.each(["{", "null", "[]", '"password"']) (
    "rejects an invalid request body: %s",
    async (body) => {
      const response = await POST(requestWithRawBody(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid request." });
      expect(mocks.requireRecentReauthentication).not.toHaveBeenCalled();
      expect(mocks.authUpdateUser).not.toHaveBeenCalled();
    },
  );

  it("rejects a headerless oversized request before reauthentication", async () => {
    const request = requestWithRawBody(
      JSON.stringify({ password: "new-password", padding: "x".repeat(17 * 1024) }),
    );
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Request payload is too large.",
    });
    expect(mocks.requireRecentReauthentication).not.toHaveBeenCalled();
    expect(mocks.authUpdateUser).not.toHaveBeenCalled();
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it("rejects a non-string password", async () => {
    const response = await POST(
      requestWithRawBody(JSON.stringify({ password: 12345678 })),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Password must be at least 8 characters.",
    });
    expect(mocks.authUpdateUser).not.toHaveBeenCalled();
  });

  it("reauthenticates before updating the password", async () => {
    const response = await POST(
      requestWithRawBody(
        JSON.stringify({
          password: "new-password",
          currentPassword: "old-password",
        }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.requireRecentReauthentication).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "user-1" }),
      "old-password",
    );
    expect(mocks.authUpdateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(mocks.trackEvent).toHaveBeenCalledWith("user-1", "account.password_change");
  });
});
