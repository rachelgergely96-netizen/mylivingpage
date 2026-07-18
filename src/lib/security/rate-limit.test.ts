import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({ rpc: mocks.rpc })),
}));

vi.mock("@/lib/security/request", () => ({
  getBestEffortRequestIdentifier: vi.fn(() => "203.0.113.9"),
  hashSecurityIdentifier: vi.fn(() => "a".repeat(64)),
}));

import {
  RATE_LIMIT_POLICIES,
  enforceRateLimit,
  getRateLimitResetAt,
  getRateLimitWindowStart,
  isRateLimitExceeded,
} from "@/lib/security/rate-limit";

describe("shared rate limit helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("computes a rolling window start for the selected policy", () => {
    const now = new Date("2026-03-17T15:42:27.000Z");
    expect(
      getRateLimitWindowStart("waitlist_submit", now).toISOString(),
    ).toBe("2026-03-17T14:42:27.000Z");
  });

  it("computes a reset time based on the selected policy window", () => {
    const now = new Date("2026-03-17T15:42:27.000Z");
    expect(getRateLimitResetAt("username_check", now).toISOString()).toBe(
      "2026-03-17T15:52:27.000Z",
    );
  });

  it("treats reaching the policy ceiling as blocked", () => {
    const maxRequests = RATE_LIMIT_POLICIES.ats_export_download.maxRequests;
    expect(isRateLimitExceeded(maxRequests - 1, maxRequests)).toBe(false);
    expect(isRateLimitExceeded(maxRequests, maxRequests)).toBe(true);
  });

  it("uses the atomic service-role RPC and returns its remaining budget", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          allowed: true,
          request_count: 1,
          remaining: 4,
          reset_at: "2026-07-18T16:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await enforceRateLimit({
      request: new Request("https://example.com/api/waitlist"),
      policy: "waitlist_submit",
      route: "/api/waitlist",
    });

    expect(result.limited).toBe(false);
    if (result.limited) {
      throw new Error("Expected the request to be allowed.");
    }
    expect(result.remaining).toBe(4);
    expect(mocks.rpc).toHaveBeenCalledWith("enforce_rate_limit", {
      p_policy: "waitlist_submit",
      p_identifier_hash: "a".repeat(64),
      p_scope: "ip",
      p_route: "/api/waitlist",
      p_user_id: null,
      p_max_requests: 5,
      p_window_ms: 3_600_000,
    });
  });

  it("returns a 429 response when the atomic RPC blocks the request", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: [
        {
          allowed: false,
          request_count: 5,
          remaining: 0,
          reset_at: "2026-07-18T16:00:00.000Z",
        },
      ],
      error: null,
    });

    const result = await enforceRateLimit({
      request: new Request("https://example.com/api/waitlist"),
      policy: "waitlist_submit",
    });

    expect(result.limited).toBe(true);
    if (result.limited) {
      expect(result.response.status).toBe(429);
    }
  });

  it("fails closed on RPC errors or malformed responses", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "RPC unavailable" } });
    await expect(
      enforceRateLimit({
        request: new Request("https://example.com/api/waitlist"),
        policy: "waitlist_submit",
      }),
    ).rejects.toThrow("Unable to enforce waitlist_submit rate limit: RPC unavailable");

    mocks.rpc.mockResolvedValueOnce({ data: [], error: null });
    await expect(
      enforceRateLimit({
        request: new Request("https://example.com/api/waitlist"),
        policy: "waitlist_submit",
      }),
    ).rejects.toThrow("invalid RPC response");
  });
});
