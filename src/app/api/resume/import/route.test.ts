import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  parseResumeText: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/lib/resume-import", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/resume-import")>();
  return {
    ...actual,
    parseResumeText: (...args: Parameters<typeof actual.parseResumeText>) => {
      mocks.parseResumeText(...args);
      return actual.parseResumeText(...args);
    },
  };
});

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

import { POST } from "@/app/api/resume/import/route";
import {
  MAX_RESUME_FILE_BYTES,
  MAX_RESUME_FILE_LABEL,
} from "@/lib/resume-file";
import { MAX_RESUME_TEXT_CHARACTERS } from "@/lib/resume-import";

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

  it("preserves valid multipart file imports after the bounded body read", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
        authClient: {},
      },
    });
    const formData = new FormData();
    formData.set(
      "file",
      new File(
        [
          `Taylor Reed
Senior Engineer
taylor@example.com

EXPERIENCE
Senior Engineer
Acme Systems
2021 - Present
Improved deployment reliability by 30%.`,
        ],
        "taylor-resume.txt",
        { type: "text/plain" },
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/resume/import", {
        method: "POST",
        body: formData,
      }),
    );
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result).toMatchObject({
      sourceKind: "text",
      sourceName: "taylor-resume.txt",
    });
    expect(result.data).toMatchObject({
      name: "Taylor Reed",
      headline: "Senior Engineer",
    });
  });

  it("rejects pasted text that would otherwise be silently truncated", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
        authClient: {},
      },
    });

    const response = await POST(
      pastedResumeRequest("R".repeat(MAX_RESUME_TEXT_CHARACTERS + 1)),
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Pasted résumé text must be 100,000 characters or fewer.",
    });
  });

  it("rejects a headerless padded multipart body before parsing resume text", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
        authClient: {},
      },
    });
    const formData = new FormData();
    formData.set(
      "text",
      "Taylor Reed Senior Engineer with enough meaningful resume text to parse.",
    );
    formData.set(
      "padding",
      "x".repeat(MAX_RESUME_FILE_BYTES + 256 * 1024),
    );
    const request = new Request("http://localhost/api/resume/import", {
      method: "POST",
      body: formData,
    });
    expect(request.headers.get("content-length")).toBeNull();

    const response = await POST(request);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: `Résumé files must be ${MAX_RESUME_FILE_LABEL} or smaller.`,
    });
    expect(mocks.parseResumeText).not.toHaveBeenCalled();
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
      error: "Add more résumé text before autofilling your page.",
    });
  });
});
