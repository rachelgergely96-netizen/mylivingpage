import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
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
  ownerProfile?: {
    plan?: string | null;
    billing_cohort?: string | null;
    hosting_trial_started_at?: string | null;
  } | null;
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
                    error: null,
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

      if (table === "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: vi.fn().mockResolvedValue({
                    data:
                      options?.ownerProfile ?? {
                        plan: "legacy_freemium",
                        billing_cohort: "legacy_freemium",
                        hosting_trial_started_at: null,
                      },
                    error: null,
                  }),
                };
              },
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
                        error: null,
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

  it("does not count views for pages whose free hosting has expired", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        ownerProfile: {
          plan: "spark",
          billing_cohort: "trial_hosting_v1",
          hosting_trial_started_at: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/pages/view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Page not found",
    });
    expect(mocks.pageUpdate).toHaveBeenCalledWith({
      status: "draft",
      visibility: "private",
    });
    expect(mocks.insertPageView).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
