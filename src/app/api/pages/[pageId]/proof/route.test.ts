import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  trackEvent: vi.fn(),
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

import { GET } from "@/app/api/pages/[pageId]/proof/route";

function createServiceRoleClient(options?: {
  page?: { id: string } | null;
  views?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
}) {
  return {
    from(table: string) {
      if (table === "pages") {
        return {
          select() {
            return {
              eq() {
                return {
                  or() {
                    return {
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: options?.page ?? { id: "page-1" },
                        error: null,
                      }),
                    };
                  },
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
                  order: vi.fn().mockResolvedValue({
                    data: options?.views ?? [],
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      if (table === "events") {
        return {
          select() {
            return {
              eq() {
                return {
                  in() {
                    return {
                      order: vi.fn().mockResolvedValue({
                        data: options?.events ?? [],
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

describe("GET /api/pages/[pageId]/proof", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T12:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    mocks.trackEvent.mockResolvedValue(undefined);
    mocks.createServiceRoleSupabaseClient.mockReturnValue(createServiceRoleClient());
  });

  it("returns unauthorized when no user is signed in", async () => {
    mocks.authGetUser.mockResolvedValue({
      data: {
        user: null,
      },
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Your session has expired. Sign in again to continue.",
    });
  });

  it("returns the repeat-share prompt before any share is recorded", async () => {
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      pageId: "page-1",
      loopState: "repeat_share_prompt",
      firstViewAfterLatestShareAt: null,
    });
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "page.activation.proof_checked",
      expect.objectContaining({
        page_id: "page-1",
        loop_state: "repeat_share_prompt",
      }),
    );
  });

  it("returns waiting state after a share with no outside view yet", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        events: [
          {
            event_name: "page.share.copy_link",
            created_at: "2026-03-23T14:00:00.000Z",
            metadata: {
              page_id: "page-1",
              scenario: "recruiter_reply",
            },
          },
        ],
      }),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      loopState: "waiting_for_first_view",
      lastShareScenario: "recruiter_reply",
      firstViewAfterLatestShareAt: null,
    });
  });

  it("returns first-view details when someone looked after the latest share", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        views: [
          {
            page_id: "page-1",
            viewed_at: "2026-03-23T14:05:00.000Z",
            user_agent: "Mozilla/5.0 (iPhone)",
            engaged_seconds: 28,
          },
        ],
        events: [
          {
            event_name: "page.share.copy_link",
            created_at: "2026-03-23T14:00:00.000Z",
            metadata: {
              page_id: "page-1",
              scenario: "application_follow_up",
            },
          },
        ],
      }),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      loopState: "first_view_detected",
      lastShareScenario: "application_follow_up",
      firstViewAfterLatestShareAt: "2026-03-23T14:05:00.000Z",
      firstViewAfterLatestShareDeviceLabel: "mobile",
      firstViewAfterLatestShareEngagedSeconds: 28,
    });
  });

  it("returns first-view state without read time when engagement has not been recorded yet", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({
        views: [
          {
            page_id: "page-1",
            viewed_at: "2026-03-23T14:05:00.000Z",
            user_agent: "Mozilla/5.0",
            engaged_seconds: null,
          },
        ],
        events: [
          {
            event_name: "page.share.copy_link",
            created_at: "2026-03-23T14:00:00.000Z",
            metadata: {
              page_id: "page-1",
              scenario: "connection",
            },
          },
        ],
      }),
    );

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ pageId: "page-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      loopState: "first_view_detected",
      firstViewAfterLatestShareDeviceLabel: "desktop",
      firstViewAfterLatestShareEngagedSeconds: null,
    });
  });
});
