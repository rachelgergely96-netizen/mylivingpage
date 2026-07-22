import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  deletePageView: vi.fn(),
  enforceRateLimit: vi.fn(),
  headers: vi.fn(),
  insertPageView: vi.fn(),
  pageUpdate: vi.fn(),
  rpc: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/request", () => ({
  getClientIp: vi.fn(() => "203.0.113.1"),
  hashSecurityIdentifier: vi.fn(() => "hashed-ip"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.authGetUser,
    },
  })),
  createServiceRoleSupabaseClient: vi.fn(() =>
    mocks.createServiceRoleSupabaseClient(),
  ),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/pages/view/route";

function createServiceRoleClient(options?: {
  page?: {
    id: string;
    owner_id?: string | null;
    user_id?: string | null;
    status?: string | null;
    visibility?: string | null;
  } | null;
  pageError?: { message: string } | null;
  recentViewError?: { message: string } | null;
}) {
  return {
    from(table: string) {
      if (table === "pages") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data:
                      options?.page ?? {
                        id: "page-1",
                        owner_id: "owner-1",
                        user_id: "owner-1",
                        status: "live",
                        visibility: "public",
                      },
                    error: options?.pageError ?? null,
                  }),
                };
              },
            };
          },
          update(values: Record<string, unknown>) {
            mocks.pageUpdate(values);
            return {
              eq: vi.fn().mockResolvedValue({
                error: null,
              }),
            };
          },
        };
      }

      if (table === "page_views") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      gte: vi.fn().mockResolvedValue({
                        data: [],
                        error: options?.recentViewError ?? null,
                      }),
                    };
                  },
                };
              },
            };
          },
          insert(values: Record<string, unknown>) {
            mocks.insertPageView(values);
            return {
              select() {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: { id: "view-1" },
                    error: null,
                  }),
                };
              },
            };
          },
          delete() {
            return {
              eq: vi.fn((field: string, value: string) => {
                mocks.deletePageView(field, value);
                return Promise.resolve({ error: null });
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
    rpc: mocks.rpc,
  };
}

describe("POST /api/pages/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
    });
    mocks.headers.mockResolvedValue({
      get: () => null,
    });
    mocks.rpc.mockResolvedValue({ error: null });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("counts views for a public live page", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(createServiceRoleClient());

    const response = await POST(
      new Request("http://localhost/api/pages/view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      pageViewId: "view-1",
    });
    expect(mocks.pageUpdate).not.toHaveBeenCalled();
    expect(mocks.insertPageView).toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalled();
  });

  it("does not count known search and social crawlers", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(createServiceRoleClient());
    mocks.headers.mockResolvedValue({
      get: (name: string) => name === "user-agent" ? "Googlebot/2.1" : null,
    });
    const response = await POST(new Request("http://localhost/api/pages/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: "page-1" }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true });
    expect(mocks.insertPageView).not.toHaveBeenCalled();
  });

  it.each([
    ["a public draft", { status: "draft", visibility: "public" }],
    ["a private live page", { status: "live", visibility: "private" }],
  ])("does not record views for %s", async (_label, publicationState) => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        page: {
          id: "page-1",
          owner_id: "owner-1",
          user_id: "owner-1",
          ...publicationState,
        },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/pages/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(404);
    expect(mocks.insertPageView).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["page lookup", { pageError: { message: "page lookup failed" } }],
    [
      "view deduplication lookup",
      { recentViewError: { message: "dedupe lookup failed" } },
    ],
  ])("fails closed when the %s fails", async (_label, options) => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient(options),
    );

    const response = await POST(
      new Request("http://localhost/api/pages/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(mocks.insertPageView).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("removes the inserted view when the counter update fails", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient(),
    );
    mocks.rpc.mockResolvedValue({
      error: { message: "counter update failed" },
    });

    const response = await POST(
      new Request("http://localhost/api/pages/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(500);
    expect(mocks.deletePageView).toHaveBeenCalledWith("id", "view-1");
  });
});
