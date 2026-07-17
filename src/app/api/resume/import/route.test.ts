import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import { POST } from "@/app/api/resume/import/route";

function pastedResumeRequest(text: string) {
  const formData = new FormData();
  formData.set("text", text);
  return new Request("http://localhost/api/resume/import", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/resume/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      identifierHash: "hash",
      remaining: 11,
      resetAt: new Date(Date.now() + 600_000).toISOString(),
    });
  });

  it("requires an authenticated user", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(pastedResumeRequest("Taylor Reed Senior Engineer resume text"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("returns the user-scoped rate-limit response before parsing", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
        authClient: {},
      },
    });
    mocks.enforceRateLimit.mockResolvedValue({
      limited: true,
      response: Response.json({ error: "Too many resume import requests." }, { status: 429 }),
    });

    const response = await POST(
      pastedResumeRequest("Taylor Reed Senior Engineer resume text"),
    );

    expect(response.status).toBe(429);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        policy: "resume_import",
        route: "/api/resume/import",
        userId: "user-1",
      }),
    );
  });

  it("parses pasted text into editable resume data", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
        authClient: {},
      },
    });
    const request = pastedResumeRequest(`Taylor Reed
Senior Engineer
taylor@example.com

EXPERIENCE
Senior Engineer
Acme Systems
2021 - Present
• Improved deployment reliability by 30%.`);

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.data).toMatchObject({
      name: "Taylor Reed",
      headline: "Senior Engineer",
      email: "taylor@example.com",
    });
    expect(result.data.experience[0]).toMatchObject({
      title: "Senior Engineer",
      company: "Acme Systems",
    });
    expect(result.sourceKind).toBe("pasted");
    expect(result.text).toContain("Improved deployment reliability");
  });

  it("rejects imports without enough meaningful text", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
        authClient: {},
      },
    });

    const response = await POST(pastedResumeRequest("Too short"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Add more resume text before autofilling your page.",
    });
  });
});
