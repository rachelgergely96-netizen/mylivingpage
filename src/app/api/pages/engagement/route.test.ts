import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  normalizeEngagementPayload: vi.fn(),
  createServiceRoleSupabaseClient: vi.fn(),
  pageViewUpdate: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/analytics/publicTracking", () => ({
  normalizeEngagementPayload: (...args: unknown[]) =>
    mocks.normalizeEngagementPayload(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() =>
    mocks.createServiceRoleSupabaseClient(),
  ),
}));

import { POST } from "@/app/api/pages/engagement/route";

const consoleErrorSpy = vi
  .spyOn(console, "error")
  .mockImplementation(() => undefined);

function defaultPayload(overrides?: Record<string, unknown>) {
  return {
    pageId: "22222222-2222-4222-8222-222222222222",
    pageViewId: "11111111-1111-4111-8111-111111111111",
    engagedSeconds: 12,
    maxScrollDepthPct: 60,
    primarySection: "summary",
    clicks: [],
    ...overrides,
  };
}

function createServiceRoleClient(options?: {
  pageView?: Record<string, unknown> | null;
  pageViewError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  return {
    from(table: string) {
      if (table === "page_views") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data:
                    options?.pageView === undefined
                      ? {
                          id: "11111111-1111-4111-8111-111111111111",
                          page_id: "22222222-2222-4222-8222-222222222222",
                          engaged_seconds: 0,
                          max_scroll_depth_pct: 0,
                          primary_section: null,
                          had_outbound_click: false,
                        }
                      : options.pageView,
                  error: options?.pageViewError ?? null,
                }),
              }),
            }),
          }),
          update(values: Record<string, unknown>) {
            mocks.pageViewUpdate(values);
            return {
              eq: vi.fn().mockResolvedValue({
                error: options?.updateError ?? null,
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

function buildRequest(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/pages/engagement", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/pages/engagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
    mocks.normalizeEngagementPayload.mockReturnValue(defaultPayload());
    mocks.createServiceRoleSupabaseClient.mockReturnValue(createServiceRoleClient());
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("rejects an oversized payload before parsing", async () => {
    const response = await POST(
      buildRequest({ pageId: "x" }, { "content-length": String(64 * 1024) }),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Engagement payload is too large.",
    });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("rejects a payload that fails normalization", async () => {
    mocks.normalizeEngagementPayload.mockReturnValueOnce(null);

    const response = await POST(buildRequest({ bogus: true }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid engagement payload.",
    });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response when the limit is exceeded", async () => {
    mocks.enforceRateLimit.mockResolvedValueOnce({
      limited: true,
      response: Response.json({ error: "Too many requests." }, { status: 429 }),
    });

    const response = await POST(buildRequest(defaultPayload()));

    expect(response.status).toBe(429);
    expect(mocks.pageViewUpdate).not.toHaveBeenCalled();
  });

  it("fails closed when rate-limit persistence is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(buildRequest(defaultPayload()));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Engagement tracking is temporarily unavailable.",
    });
  });

  it("returns 404 when the referenced page view does not exist", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({ pageView: null }),
    );

    const response = await POST(buildRequest(defaultPayload()));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Page view not found.",
    });
    expect(mocks.pageViewUpdate).not.toHaveBeenCalled();
  });

  it("records engagement against the matching page view", async () => {
    const response = await POST(buildRequest(defaultPayload()));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.pageViewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        engaged_seconds: 12,
        max_scroll_depth_pct: 60,
        primary_section: "summary",
      }),
    );
  });

  it("returns 500 when the page-view lookup errors", async () => {
    mocks.createServiceRoleSupabaseClient.mockReturnValue(
      createServiceRoleClient({ pageViewError: { message: "lookup failed" } }),
    );

    const response = await POST(buildRequest(defaultPayload()));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to record page engagement.",
    });
    expect(mocks.pageViewUpdate).not.toHaveBeenCalled();
  });
});
