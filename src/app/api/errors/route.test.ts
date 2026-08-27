import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  reportServerError: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mocks.enforceRateLimit(...args),
}));

vi.mock("@/lib/observability", () => ({
  reportServerError: (...args: unknown[]) => mocks.reportServerError(...args),
}));

import { POST } from "@/app/api/errors/route";

function requestWithRawBody(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/errors", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

describe("POST /api/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      remaining: 9,
      resetAt: "2026-08-23T21:00:00.000Z",
    });
  });

  it("rejects malformed JSON without reporting a second error", async () => {
    const response = await POST(requestWithRawBody("{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid request." });
    expect(mocks.reportServerError).not.toHaveBeenCalled();
  });

  it.each([null, [], "client error", 42])(
    "rejects a non-object JSON payload: %j",
    async (body) => {
      const response = await POST(requestWithRawBody(JSON.stringify(body)));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid request." });
      expect(mocks.reportServerError).not.toHaveBeenCalled();
    },
  );

  it("sanitizes and records a valid client error report", async () => {
    const response = await POST(
      requestWithRawBody(
        JSON.stringify({
          message: "x".repeat(600),
          digest: "d".repeat(120),
          path: "/dashboard/settings",
        }),
        { "x-vercel-id": "iad1::request-1" },
      ),
    );

    expect(response.status).toBe(204);
    expect(mocks.reportServerError).toHaveBeenCalledWith(
      "client.global_error",
      expect.objectContaining({ message: "x".repeat(500) }),
      {
        digest: "d".repeat(100),
        path: "/dashboard/settings",
        requestId: "iad1::request-1",
      },
    );
  });

  it("fails closed when client-error rate limiting is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await POST(requestWithRawBody(JSON.stringify({ message: "boom" })));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Error reporting unavailable.",
    });
    expect(mocks.reportServerError).toHaveBeenCalledWith(
      "client_error.rate_limit_unavailable",
      expect.any(Error),
      { route: "/api/errors" },
    );
  });
});
