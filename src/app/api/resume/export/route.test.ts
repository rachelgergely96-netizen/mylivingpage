import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkExport: vi.fn(),
  enforceRateLimit: vi.fn(),
  renderPdf: vi.fn(),
  serviceRoleFactory: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/pdf/ResumePDFDocument", () => ({
  checkAtsResumeExport: mocks.checkExport,
  renderAtsResumePdf: mocks.renderPdf,
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

function buildApprovedResumeData(name: string): ResumeData {
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

function createPageResponse(options: {
  approvedResumeData?: ResumeData | null;
  approvalStatus?: "pending" | "approved" | "out_of_sync" | null;
  visibility?: "public" | "private";
  status?: "live" | "draft";
}) {
  return {
    id: "page-1",
    visibility: options.visibility ?? "public",
    status: options.status ?? "live",
    page_config: {
      ats: {
        approvedResumeData: options.approvedResumeData ?? null,
        approvedExportCheck: options.approvedResumeData
          ? {
              pageCount: 1,
              fitsOnOnePage: true,
              overflowReasons: [],
              recommendedFixes: [],
            }
          : null,
        approvalStatus: options.approvalStatus ?? (options.approvedResumeData ? "approved" : "pending"),
        availabilityReason: "Rerun ATS review and save to rebuild your ATS PDF.",
      },
    },
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

  it("rejects public export when no approved ATS resume exists", async () => {
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({ approvedResumeData: null }),
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

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Rerun ATS review and save to rebuild your ATS PDF.",
    });
    expect(mocks.renderPdf).not.toHaveBeenCalled();
  });

  it("renders the approved ATS resume instead of trusting browser resume data", async () => {
    const approvedResumeData = buildApprovedResumeData("Approved Resume");
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({ approvedResumeData }),
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
          resumeData: buildApprovedResumeData("Untrusted Browser Payload"),
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(mocks.checkExport).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Approved Resume" }),
    );
    expect(mocks.renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Approved Resume" }),
    );
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      null,
      "resume.export.downloaded",
      expect.objectContaining({
        page_id: "page-1",
      }),
    );
  });

  it("blocks download when approved artifacts exist but the ATS snapshot is no longer approved", async () => {
    const approvedResumeData = buildApprovedResumeData("Approved Resume");
    mocks.serviceRoleFactory.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: createPageResponse({ approvedResumeData, approvalStatus: "pending" }),
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

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Rerun ATS review and save to rebuild your ATS PDF.",
    });
    expect(mocks.renderPdf).not.toHaveBeenCalled();
  });
});
