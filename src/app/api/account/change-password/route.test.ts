import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  enforceRateLimit: vi.fn(),
  reauthenticate: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: mocks.getUser, updateUser: mocks.updateUser },
  }),
}));
vi.mock("@/lib/security/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/auth/reauthentication", () => ({ requireRecentReauthentication: mocks.reauthenticate }));
vi.mock("@/lib/track-event", () => ({ trackEvent: mocks.trackEvent }));

import { POST } from "@/app/api/account/change-password/route";

const request = (body: string) => new Request("http://localhost/api/account/change-password", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body,
});

describe("POST /api/account/change-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "person@example.com" } } });
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.reauthenticate.mockResolvedValue({ ok: true });
    mocks.updateUser.mockResolvedValue({ error: null });
  });

  it("requires authentication", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await POST(request("{}"))).status).toBe(401);
  });

  it("rejects malformed and short passwords", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request(JSON.stringify({ password: "short" })))).status).toBe(400);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("requires recent reauthentication", async () => {
    mocks.reauthenticate.mockResolvedValue({ ok: false, error: "Reauthentication required.", code: "reauth_required", status: 403 });
    const response = await POST(request(JSON.stringify({ password: "new-password", currentPassword: "old-password" })));
    expect(response.status).toBe(403);
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and records the event", async () => {
    const response = await POST(request(JSON.stringify({ password: "new-password", currentPassword: "old-password" })));
    expect(response.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(mocks.trackEvent).toHaveBeenCalledWith("user-1", "account.password_change");
  });

  it("fails closed when rate limiting is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new Error("database unavailable"));
    expect((await POST(request(JSON.stringify({ password: "new-password" })))).status).toBe(503);
  });
});
