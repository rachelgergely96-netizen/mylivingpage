import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.authGetUser },
  })),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: (...args: unknown[]) => mocks.trackEvent(...args),
}));

import { POST } from "@/app/api/feedback/route";

function buildRequest(body: unknown) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("requires authentication", async () => {
    mocks.authGetUser.mockResolvedValueOnce({ data: { user: null } });

    const response = await POST(buildRequest({ message: "hi", type: "bug" }));

    expect(response.status).toBe(401);
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it("records feedback with an allowlisted type", async () => {
    const response = await POST(
      buildRequest({ message: "  Love it  ", type: "feature", page: "/create" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.trackEvent).toHaveBeenCalledWith("user-1", "feedback.submitted", {
      message: "Love it",
      type: "feature",
      page: "/create",
    });
  });

  it("falls back to the general type for values outside the allowlist", async () => {
    const response = await POST(
      buildRequest({ message: "Nice", type: "not-a-real-type" }),
    );

    expect(response.status).toBe(200);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "feedback.submitted",
      expect.objectContaining({ type: "general" }),
    );
  });

  it("rejects an empty message", async () => {
    const response = await POST(buildRequest({ message: "   ", type: "bug" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Message is required" });
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });

  it("rejects a message longer than 2000 characters", async () => {
    const response = await POST(buildRequest({ message: "a".repeat(2001) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Message too long (max 2000 characters)",
    });
    expect(mocks.trackEvent).not.toHaveBeenCalled();
  });
});
