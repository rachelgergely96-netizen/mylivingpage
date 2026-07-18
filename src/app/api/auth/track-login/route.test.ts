import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  profileIs: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
  createServiceRoleSupabaseClient: vi.fn(() => ({
    rpc: mocks.rpc,
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ is: mocks.profileIs })),
      })),
    })),
  })),
}));

import { POST } from "@/app/api/auth/track-login/route";

describe("POST /api/auth/track-login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.profileIs.mockResolvedValue({ error: null });
  });

  it("records the authenticated user's sign-in through the idempotent RPC", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("increment_sign_in_count", {
      uid: "user-1",
    });
  });

  it("requires authentication", async () => {
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not report success when persistence fails", async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { message: "database unavailable" } });
    expect((await POST()).status).toBe(503);

    mocks.rpc.mockResolvedValueOnce({ error: null });
    mocks.profileIs.mockResolvedValueOnce({ error: { message: "update failed" } });
    expect((await POST()).status).toBe(503);
  });
});
