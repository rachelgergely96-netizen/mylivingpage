import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

import { POST } from "@/app/api/generate/parse/route";

describe("POST /api/generate/parse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the caller is signed out", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await POST();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns a permanent 410 response for signed-in callers", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });

    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      error:
        "AI resume parsing is no longer available. Use the guided resume builder instead.",
      code: "parsing_disabled",
      retryable: false,
    });
  });
});
