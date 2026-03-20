import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkExport: vi.fn(),
  enforceRateLimit: vi.fn(),
  renderPdf: vi.fn(),
  serviceRoleFactory: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/pdf/ResumePDFDocument", () => ({
  checkResumeExport: mocks.checkExport,
  getFriendlyResumePdfError: (
    exportCheck: { renderFailureReason?: string | null; recommendedFixes?: string[]; overflowReasons?: string[] } | null | undefined,
    fallback?: string,
  ) => exportCheck?.renderFailureReason ?? exportCheck?.recommendedFixes?.[0] ?? exportCheck?.overflowReasons?.[0] ?? fallback ?? "Friendly Resume PDF error.",
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
  resumeData?: ResumeData;
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
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      identifierHash: "hash",
      remaining: 11,
      resetAt: new Date("2026-03-17T16:00:00.000Z").toISOString(),
    });
    mocks.checkExport.mockResolvedValue({
      renderable: true,
      renderFailureReason: null,
      pageCount: 1,
      fitsOnOnePage: true,
      overflowReasons: [],
      recommendedFixes: [],
    });
    mocks.renderPdf.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer);
    mocks.trackEvent.mockResolvedValue(undefined);
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
    expect(mocks.checkExport).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Saved Resume" }),
    );
    expect(mocks.renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Saved Resume" }),
    );
  });

  it("allows multi-page Resume PDFs when they still render cleanly", async () => {
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
    mocks.checkExport.mockResolvedValue({
      renderable: true,
      renderFailureReason: null,
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The exported resume still spans more than one page."],
      recommendedFixes: ["Trim lower-priority sections and shorten long bullets before exporting again."],
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
    expect(mocks.renderPdf).toHaveBeenCalled();
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "resume.export.downloaded",
      expect.objectContaining({
        page_count: 2,
        fits_on_one_page: false,
      }),
    );
  });

  it("returns a friendly error when the Resume PDF cannot render cleanly", async () => {
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
    mocks.checkExport.mockResolvedValue({
      renderable: false,
      renderFailureReason: "The Resume PDF could not render cleanly from the current content.",
      pageCount: null,
      fitsOnOnePage: null,
      overflowReasons: [],
      recommendedFixes: [],
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

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "The Resume PDF could not render cleanly from the current content.",
      renderable: false,
      renderFailureReason: "The Resume PDF could not render cleanly from the current content.",
      pageCount: null,
      fitsOnOnePage: null,
      overflowReasons: [],
      recommendedFixes: [],
    });
    expect(mocks.renderPdf).not.toHaveBeenCalled();
  });
});
