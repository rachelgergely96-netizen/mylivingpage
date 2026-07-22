import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  getUser: vi.fn(),
  profileMaybeSingle: vi.fn(),
  profileUpdateEq: vi.fn(),
  pageUpdateEq: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/security/route-security", () => ({ requireAuthenticatedUser: mocks.requireAuthenticatedUser }));
vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser: mocks.getUser } }),
  createServiceRoleSupabaseClient: () => ({
    from: (table: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.profileMaybeSingle }) }),
      update: () => table === "profiles"
        ? { eq: mocks.profileUpdateEq }
        : { eq: mocks.pageUpdateEq },
    }),
  }),
}));

import { GET, PATCH } from "@/app/api/username/route";

describe("/api/username", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.requireAuthenticatedUser.mockResolvedValue({ value: { user: { id: "user-1" } } });
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.profileMaybeSingle.mockResolvedValue({ data: null });
    mocks.profileUpdateEq.mockResolvedValue({ error: null });
    mocks.pageUpdateEq.mockResolvedValue({ error: null });
  });

  it("rejects invalid and reserved availability checks without querying profiles", async () => {
    const invalid = await GET(new Request("http://localhost/api/username?slug=x"));
    expect((await invalid.json()).available).toBe(false);
    const reserved = await GET(new Request("http://localhost/api/username?slug=admin"));
    expect((await reserved.json()).reason).toBe("This name is reserved.");
    expect(mocks.profileMaybeSingle).not.toHaveBeenCalled();
  });

  it("reports an available username", async () => {
    const response = await GET(new Request("http://localhost/api/username?slug=rachel-page"));
    await expect(response.json()).resolves.toEqual({
      available: true,
      slug: "rachel-page",
      reason: null,
    });
  });

  it("fails closed when availability rate limiting is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new Error("down"));
    expect((await GET(new Request("http://localhost/api/username?slug=rachel-page"))).status).toBe(503);
  });

  it("requires authentication for updates", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ response: Response.json({ error: "Unauthorized" }, { status: 401 }) });
    expect((await PATCH(new Request("http://localhost/api/username", { method: "PATCH", body: "{}" }))).status).toBe(401);
  });

  it("rejects malformed JSON", async () => {
    expect((await PATCH(new Request("http://localhost/api/username", { method: "PATCH", body: "{" }))).status).toBe(400);
  });

  it("updates the profile and canonical owner page slug", async () => {
    const response = await PATCH(new Request("http://localhost/api/username", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug: "rachel-page" }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.profileUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(mocks.pageUpdateEq).toHaveBeenCalledWith("owner_id", "user-1");
  });
});
