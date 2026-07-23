import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  recordEvent: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => mocks.enforceRateLimit(...args),
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    mocks.requireAuthenticatedUser(...args),
}));

vi.mock("@/lib/track-event", () => ({
  recordEvent: (...args: unknown[]) => mocks.recordEvent(...args),
}));

import { POST } from "@/app/api/feedback/route";

function buildRequest(
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: { user: { id: "user-1", email: "user@example.com" } },
    });
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      remaining: 9,
      resetAt: "2026-07-23T13:00:00.000Z",
    });
    mocks.recordEvent.mockResolvedValue(true);
  });

  it("requires authentication", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValueOnce({
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(buildRequest({ message: "hi", type: "bug" }));

    expect(response.status).toBe(401);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("records feedback with an allowlisted type", async () => {
    const response = await POST(
      buildRequest({ message: "  Love it  ", type: "feature", page: "/create" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith({
      request: expect.any(Request),
      policy: "feedback_submit",
      route: "/api/feedback",
      userId: "user-1",
    });
    expect(mocks.recordEvent).toHaveBeenCalledWith("user-1", "feedback.submitted", {
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
    expect(mocks.recordEvent).toHaveBeenCalledWith(
      "user-1",
      "feedback.submitted",
      expect.objectContaining({ type: "general" }),
    );
  });

  it("rejects an empty message after applying the authenticated-user limit", async () => {
    const response = await POST(buildRequest({ message: "   ", type: "bug" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Message is required" });
    expect(mocks.enforceRateLimit).toHaveBeenCalledOnce();
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("rejects a message longer than 2000 characters", async () => {
    const response = await POST(buildRequest({ message: "a".repeat(2001) }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Message too long (max 2000 characters)",
    });
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("rejects an oversized declared request", async () => {
    const response = await POST(
      buildRequest({ message: "hello" }, { "Content-Length": "9000" }),
    );

    expect(response.status).toBe(413);
    expect(mocks.requireAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("rejects an oversized actual body when no content length is declared", async () => {
    const response = await POST(
      buildRequest({ message: "hello", unused: "x".repeat(9000) }),
    );

    expect(response.status).toBe(413);
    expect(mocks.enforceRateLimit).toHaveBeenCalledOnce();
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("does not store an external or malformed reported page", async () => {
    const response = await POST(
      buildRequest({
        message: "Please look at this screen",
        page: "//attacker.example/phishing",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.recordEvent).toHaveBeenCalledWith(
      "user-1",
      "feedback.submitted",
      expect.objectContaining({ page: "" }),
    );
  });

  it("returns the limiter response when the user submits too often", async () => {
    mocks.enforceRateLimit.mockResolvedValueOnce({
      limited: true,
      response: NextResponse.json(
        { error: "Too many feedback submission requests.", resetAt: "later" },
        { status: 429 },
      ),
    });

    const response = await POST(buildRequest({ message: "Again" }));

    expect(response.status).toBe(429);
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("fails closed when feedback rate limiting is unavailable", async () => {
    mocks.enforceRateLimit.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await POST(buildRequest({ message: "Please save this" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Feedback is temporarily unavailable. Please try again.",
    });
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it("does not tell the user feedback was received when storage fails", async () => {
    mocks.recordEvent.mockResolvedValueOnce(false);

    const response = await POST(buildRequest({ message: "This must persist" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Feedback could not be saved. Please try again.",
    });
  });
});
