import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enforceRateLimit: vi.fn(), reportServerError: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));
vi.mock("@/lib/observability", () => ({ reportServerError: mocks.reportServerError }));

import { POST } from "@/app/api/errors/route";

describe("POST /api/errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ limited: false });
  });

  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/errors", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("sanitizes and reports a client error", async () => {
    const response = await POST(new Request("http://localhost/api/errors", {
      method: "POST",
      headers: { "content-type": "application/json", "x-vercel-id": "iad1::request" },
      body: JSON.stringify({ message: "boom", digest: "abc", path: "/create" }),
    }));
    expect(response.status).toBe(204);
    expect(mocks.reportServerError).toHaveBeenCalledWith(
      "client.global_error",
      expect.any(Error),
      { digest: "abc", path: "/create", requestId: "iad1::request" },
    );
  });

  it("fails closed when rate limiting is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValue(new Error("down"));
    const response = await POST(new Request("http://localhost/api/errors", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
  });
});
