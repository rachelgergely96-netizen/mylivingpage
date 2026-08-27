import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  enforceRateLimit: vi.fn(),
  lookupProfile: vi.fn(),
  profileUpdate: vi.fn(),
  pageUpdate: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mocks.enforceRateLimit(...args),
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    mocks.requireAuthenticatedUser(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
  createServiceRoleSupabaseClient: vi.fn(() => ({
    from(table: string) {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mocks.lookupProfile }),
          }),
          update: (values: Record<string, unknown>) => ({
            eq: (field: string, value: string) =>
              mocks.profileUpdate(values, field, value),
          }),
        };
      }

      if (table === "pages") {
        return {
          update: (values: Record<string, unknown>) => ({
            or: (filter: string) => mocks.pageUpdate(values, filter),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

import { GET, PATCH } from "@/app/api/username/route";

function patchRequest(body: string) {
  return new Request("http://localhost/api/username", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("/api/username", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.authGetUser.mockResolvedValue({ data: { user: null } });
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: { user: { id: "user-1", email: "user@example.com" } },
    });
    mocks.lookupProfile.mockResolvedValue({ data: null, error: null });
    mocks.profileUpdate.mockResolvedValue({ error: null });
    mocks.pageUpdate.mockResolvedValue({ error: null });
  });

  it("does not claim a username is available when the lookup fails", async () => {
    mocks.lookupProfile.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable" },
    });

    const response = await GET(
      new Request("http://localhost/api/username?slug=rachel"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      available: false,
      slug: "rachel",
      reason: "Username checks are temporarily unavailable.",
    });
  });

  it.each(["{", "null", "[]", '{"slug":42}'])(
    "rejects an invalid username update body: %s",
    async (body) => {
      const response = await PATCH(patchRequest(body));

      expect(response.status).toBe(400);
      expect(mocks.profileUpdate).not.toHaveBeenCalled();
    },
  );

  it("fails closed when the update uniqueness lookup fails", async () => {
    mocks.lookupProfile.mockResolvedValueOnce({
      data: null,
      error: { message: "database unavailable" },
    });

    const response = await PATCH(
      patchRequest(JSON.stringify({ slug: "rachel-new" })),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Username updates are temporarily unavailable.",
    });
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it("updates the profile and legacy page slug for an available name", async () => {
    const response = await PATCH(
      patchRequest(JSON.stringify({ slug: "  Rachel New  " })),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      slug: "rachel-new",
    });
    expect(mocks.profileUpdate).toHaveBeenCalledWith(
      { username: "rachel-new" },
      "id",
      "user-1",
    );
    expect(mocks.pageUpdate).toHaveBeenCalledWith(
      { slug: "rachel-new" },
      "user_id.eq.user-1,owner_id.eq.user-1",
    );
  });

  it("does not report full success when the page slug mirror fails", async () => {
    mocks.pageUpdate.mockResolvedValueOnce({
      error: { message: "database unavailable" },
    });

    const response = await PATCH(
      patchRequest(JSON.stringify({ slug: "rachel-new" })),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "Your username was saved, but the page link could not be refreshed. Reload before trying again.",
    });
    expect(mocks.profileUpdate).toHaveBeenCalledOnce();
  });

  it("requires authentication before parsing an update", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await PATCH(patchRequest("{"));

    expect(response.status).toBe(401);
    expect(mocks.lookupProfile).not.toHaveBeenCalled();
  });
});
