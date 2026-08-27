import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  recordLegalAcceptance: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
}));

vi.mock("@/lib/legal/acceptance", () => ({
  getClientIp: vi.fn(() => "203.0.113.5"),
  recordLegalAcceptance: (...args: unknown[]) => mocks.recordLegalAcceptance(...args),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/legal/accept/route";

function buildRequest(body?: unknown) {
  return new Request("http://localhost/api/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "vitest" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

function buildRawRequest(body: string) {
  return new Request("http://localhost/api/legal/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json", "user-agent": "vitest" },
    body,
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/legal/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.recordLegalAcceptance.mockResolvedValue(undefined);
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("requires authentication", async () => {
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(buildRequest({ source: "signup" }));

    expect(response.status).toBe(401);
    expect(mocks.recordLegalAcceptance).not.toHaveBeenCalled();
  });

  it("rejects sources outside the allowlist", async () => {
    const response = await POST(buildRequest({ source: "malicious" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid source" });
    expect(mocks.recordLegalAcceptance).not.toHaveBeenCalled();
  });

  it.each(["{", "null", "[]", '"signup"'])(
    "rejects an invalid request body: %s",
    async (body) => {
      const response = await POST(buildRawRequest(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "Invalid request." });
      expect(mocks.recordLegalAcceptance).not.toHaveBeenCalled();
    },
  );

  it("records a signup acceptance and emits the signup event", async () => {
    const response = await POST(buildRequest({ source: "signup" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.recordLegalAcceptance).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", source: "signup" }),
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith("user-1", "user.signup", {});
  });

  it("records a checkout acceptance without firing the signup event", async () => {
    const response = await POST(buildRequest({ source: "checkout" }));

    expect(response.status).toBe(200);
    expect(mocks.recordLegalAcceptance).toHaveBeenCalledWith(
      expect.objectContaining({ source: "checkout" }),
    );
    expect(mocks.trackEvent).not.toHaveBeenCalledWith(
      "user-1",
      "user.signup",
      expect.anything(),
    );
  });

  it("returns 500 and tracks the failure when persistence fails", async () => {
    mocks.recordLegalAcceptance.mockRejectedValueOnce(new Error("db down"));

    const response = await POST(buildRequest({ source: "signup" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to record legal acceptance.",
    });
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "legal.acceptance.failed",
      expect.objectContaining({ source: "signup", error: "db down" }),
    );
  });
});
