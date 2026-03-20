import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  fallbackRenderPdf: vi.fn(),
  renderPdf: vi.fn(),
  serviceRoleFactory: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/pdf/ResumePDFDocument", () => ({
  countPdfPages: (buffer: Uint8Array | ArrayBuffer) =>
    new Uint8Array(buffer).length > 3 ? 2 : 1,
  getFriendlyResumePdfError: (
    exportCheck:
      | {
          renderFailureReason?: string | null;
          recommendedFixes?: string[];
          overflowReasons?: string[];
        }
      | null
      | undefined,
    fallback?: string,
  ) =>
    exportCheck?.renderFailureReason ??
    exportCheck?.recommendedFixes?.[0] ??
    exportCheck?.overflowReasons?.[0] ??
    fallback ??
    "Friendly Resume PDF error.",
  renderFallbackResumePdf: mocks.fallbackRenderPdf,
  renderResumePdf: mocks.renderPdf,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleSupabaseClient: vi.fn(() => mocks.serviceRoleFactory()),
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/resume/export/route";
import type { ResumeData } from "@/types/resume";

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

function buildResumeData(name: string): ResumeData {
  return {
    name,
    headline: "Product Manager",
    location: "Austin, TX",
    email: "taylor@example.com",
    linkedin: "linkedin.com/in/taylor",
    github: "github.com/taylor",
    website: "taylor.dev",
    avatar_url: null,
    summary: "Product manager shipping B2B software.",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    stats: [],
  };
}

function createPageResponse(options?: {
  visibility?: "public" | "private";
  status?: "live" | "draft";
  resumeData?: unknown;
}) {
  return {
    id: "page-1",
    visibility: options?.visibility ?? "public",
    status: options?.status ?? "live",
    resume_data: options?.resumeData ?? buildResumeData("Saved Resume"),
  };
}

describe("POST /api/resume/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockClear();
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      identifierHash: "hash",
      remaining: 11,
      resetAt: new Date("2026-03-17T16:00:00.000Z").toISOString(),
    });
    mocks.renderPdf.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer);
    mocks.fallbackRenderPdf.mockResolvedValue(Uint8Array.from([4, 5, 6, 7]).buffer);
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("requires a page-bound request", async () => {
    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "pageId is required.",
    });
  });

  it("rejects export when the page is not public and live", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({ visibility: "private" }),
              error: null,
            }),
          })),
        })),
      })),
    });

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Page not found.",
    });
    expect(mocks.renderPdf).not.toHaveBeenCalled();
  });

  it("renders the saved living-page resume and ignores any extra browser payload", async () => {
    const savedResumeData = buildResumeData("Saved Resume");
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({ resumeData: savedResumeData }),
              error: null,
            }),
          })),
        })),
      })),
    });

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pageId: "page-1",
          resumeData: buildResumeData("Untrusted Browser Payload"),
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("saved-resume-resume.pdf");
    expect(mocks.renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Saved Resume" }),
    );
  });

  it("coerces malformed stored data before rendering the Resume PDF", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({
                resumeData: {
                  name: 123,
                  summary: ["Legacy summary"],
                  experience: null,
                  skills: [{ category: "Core", items: "Strategy" }],
                },
              }),
              error: null,
            }),
          })),
        })),
      })),
    });

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "123",
        summary: "Legacy summary",
        experience: [],
        skills: [{ category: "Core", items: ["Strategy"] }],
      }),
    );
  });

  it("allows multi-page content to download without a blocking pre-check", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse(),
              error: null,
            }),
          })),
        })),
      })),
    });
    mocks.renderPdf.mockResolvedValue(Uint8Array.from([1, 2, 3, 4, 5]).buffer);

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "resume.export.downloaded",
      expect.objectContaining({
        page_count: 2,
        fits_on_one_page: false,
      }),
    );
  });

  it("returns a real 429 when the download rate limit is actually exceeded", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse(),
              error: null,
            }),
          })),
        })),
      })),
    });
    mocks.enforceRateLimit.mockResolvedValueOnce({
      limited: true,
      identifierHash: "hash",
      resetAt: new Date("2026-03-17T16:00:00.000Z").toISOString(),
      response: Response.json(
        {
          error: "Too many public resume download requests. Please try again later.",
          resetAt: new Date("2026-03-17T16:00:00.000Z").toISOString(),
        },
        { status: 429 },
      ),
    });

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many public resume download requests. Please try again later.",
      resetAt: new Date("2026-03-17T16:00:00.000Z").toISOString(),
    });
    expect(mocks.renderPdf).not.toHaveBeenCalled();
  });

  it("fails open when rate-limit persistence is unavailable and still downloads the PDF", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse(),
              error: null,
            }),
          })),
        })),
      })),
    });
    mocks.enforceRateLimit.mockRejectedValueOnce(new Error("events table unavailable"));

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.renderPdf).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "resume.export.rate_limit_unavailable",
      expect.objectContaining({
        page_id: "page-1",
        error: "events table unavailable",
      }),
    );
  });

  it("falls back to a simpler PDF when the primary render fails", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse(),
              error: null,
            }),
          })),
        })),
      })),
    });
    mocks.renderPdf.mockRejectedValueOnce(new Error("Primary render failed."));

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.fallbackRenderPdf).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Saved Resume" }),
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "resume.export.downloaded",
      expect.objectContaining({
        fallback_used: true,
      }),
    );
  });

  it("sanitizes unicode-heavy saved content before attempting the fallback PDF", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({
                resumeData: {
                  name: "Jos\u00e9 \ud83d\ude80",
                  summary: "Led growth \u2022 shipped tools \ud83c\udf1f",
                  experience: [
                    {
                      title: "Founder",
                      company: "Cr\u00e8me",
                      dates: "2022 \u2014 2024",
                      highlights: ["Built the platform \ud83d\udca1"],
                    },
                  ],
                },
              }),
              error: null,
            }),
          })),
        })),
      })),
    });
    mocks.renderPdf.mockRejectedValueOnce(new Error("Primary render failed."));

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.fallbackRenderPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jose",
        summary: "Led growth - shipped tools",
        experience: [
          expect.objectContaining({
            company: "Creme",
            dates: "2022 - 2024",
            highlights: ["Built the platform"],
          }),
        ],
      }),
    );
  });

  it("returns a friendly error only when both primary and fallback PDF renders fail", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse(),
              error: null,
            }),
          })),
        })),
      })),
    });
    mocks.renderPdf.mockRejectedValueOnce(new Error("Primary render failed."));
    mocks.fallbackRenderPdf.mockRejectedValueOnce(new Error("Fallback render failed."));

    const response = await POST(
      new Request("http://localhost/api/resume/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pageId: "page-1" }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to export the Resume PDF right now. Please try again.",
    });
    expect(mocks.fallbackRenderPdf).toHaveBeenCalled();
  });
});
