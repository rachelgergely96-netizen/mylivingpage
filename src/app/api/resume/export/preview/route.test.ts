import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkExport: vi.fn(),
  enforceRateLimit: vi.fn(),
  renderPdf: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/pdf/ResumePDFDocument", () => ({
  checkAtsResumeExport: mocks.checkExport,
  renderAtsResumePdf: mocks.renderPdf,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
}));

vi.mock("@/lib/security/route-security", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/resume/export/preview/route";
import type { ResumeData } from "@/types/resume";

function buildResumeData(): ResumeData {
  return {
    name: "Taylor Reed",
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

describe("POST /api/resume/export/preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      value: {
        user: { id: "user-1" },
      },
    });
    mocks.enforceRateLimit.mockResolvedValue({
      limited: false,
      identifierHash: "hash",
      remaining: 11,
      resetAt: new Date("2026-03-17T16:00:00.000Z").toISOString(),
    });
    mocks.trackEvent.mockResolvedValue(undefined);
  });

  it("requires an authenticated user", async () => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await POST(
      new Request("http://localhost/api/resume/export/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeData: buildResumeData() }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
    });
  });

  it("returns a PDF preview and page headers even when the export spans multiple pages", async () => {
    mocks.checkExport.mockResolvedValue({
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The export still spans more than one page."],
      recommendedFixes: ["Trim the summary and lower-priority bullets."],
    });
    mocks.renderPdf.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer);

    const response = await POST(
      new Request("http://localhost/api/resume/export/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeData: buildResumeData() }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("x-ats-page-count")).toBe("2");
    expect(response.headers.get("x-ats-fits-one-page")).toBe("false");
    await expect(response.arrayBuffer()).resolves.toEqual(Uint8Array.from([1, 2, 3]).buffer);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "resume.export.preview",
      expect.objectContaining({
        page_count: 2,
        fits_on_one_page: false,
      }),
    );
  });

  it("returns a clean JSON error when the PDF renderer fails", async () => {
    mocks.checkExport.mockResolvedValue({
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The export still spans more than one page."],
      recommendedFixes: ["Trim the summary and lower-priority bullets."],
    });
    mocks.renderPdf.mockRejectedValue(new Error("Minified React error #31"));

    const response = await POST(
      new Request("http://localhost/api/resume/export/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeData: buildResumeData() }),
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Trim the summary and lower-priority bullets.",
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The export still spans more than one page."],
      recommendedFixes: ["Trim the summary and lower-priority bullets."],
    });
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "resume.export.preview_failed",
      expect.objectContaining({
        page_count: 2,
        fits_on_one_page: false,
        error: "Minified React error #31",
      }),
    );
  });
});
