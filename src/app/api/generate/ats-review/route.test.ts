import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  anthropicCreate: vi.fn(),
  getUser: vi.fn(),
  checkExport: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock("@/lib/anthropic", () => ({
  getAnthropicClient: vi.fn(() => ({
    messages: {
      create: mocks.anthropicCreate,
    },
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("@/lib/pdf/ResumePDFDocument", () => ({
  checkAtsResumeExport: mocks.checkExport,
}));

vi.mock("@/lib/track-event", () => ({
  trackEvent: mocks.trackEvent,
}));

import { POST } from "@/app/api/generate/ats-review/route";

const sampleResume = {
  name: "Taylor Reed",
  headline: "Product Manager",
  location: "Austin, TX",
  email: "taylor@example.com",
  linkedin: "linkedin.com/in/taylor-reed",
  github: "github.com/taylorreed",
  website: "taylorreed.dev",
  avatar_url: null,
  summary: "Product Manager shipping SaaS products with SQL and UX collaboration.",
  experience: [
    {
      title: "Product Manager",
      company: "Northwind",
      dates: "2022 - Present",
      highlights: ["Owned roadmap and analytics", "Partnered with engineering and design"],
      url: null,
    },
  ],
  education: [{ degree: "B.A. Economics", school: "University", year: "2019" }],
  projects: [],
  skills: [{ category: "Tools", items: ["SQL", "Figma", "Amplitude"] }],
  certifications: [],
  stats: [],
};

describe("POST /api/generate/ats-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
        },
      },
    });
    mocks.checkExport.mockResolvedValue({
      renderable: true,
      renderFailureReason: null,
      pageCount: 1,
      fitsOnOnePage: true,
      overflowReasons: [],
      recommendedFixes: [],
    });
    mocks.trackEvent.mockResolvedValue(undefined);
    mocks.anthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            suggestions: [
              {
                id: "ai-suggestion-1",
                category: "recruiter_searchability",
                title: "Use the exact title",
                description: "Make the target title visible.",
                applyLabel: "Use title",
                preview: "Product Manager",
                applyData: {
                  headline: "Product Manager",
                },
              },
            ],
          }),
        },
      ],
    });
  });

  it("skips Anthropic during fast ATS rechecks", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate/ats-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData: sampleResume,
          mode: "fast",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      mode: string;
      status: string;
      candidateResumeData: { headline: string } | null;
      candidateExportCheck: { fitsOnOnePage: boolean } | null;
    };

    expect(payload.mode).toBe("fast");
    expect(payload.candidateResumeData).not.toBeNull();
    expect(payload.candidateExportCheck).not.toBeNull();
    expect(mocks.anthropicCreate).not.toHaveBeenCalled();
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "ats.review.run",
      expect.objectContaining({
        mode: "fast",
      }),
    );
  });

  it("returns an auto-optimized ATS candidate and concise review summary during a full review", async () => {
    mocks.checkExport.mockResolvedValueOnce({
      renderable: true,
      renderFailureReason: null,
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The summary is still too long for a one-page ATS resume."],
      recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
    });
    mocks.checkExport.mockResolvedValueOnce({
      renderable: true,
      renderFailureReason: null,
      pageCount: 1,
      fitsOnOnePage: true,
      overflowReasons: [],
      recommendedFixes: [],
    });

    const response = await POST(
      new Request("http://localhost/api/generate/ats-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData: {
            ...sampleResume,
            summary: "A".repeat(420),
            projects: [
              { name: "One", description: "Project", tech: ["TypeScript"], url: null },
              { name: "Two", description: "Project", tech: ["React"], url: null },
              { name: "Three", description: "Project", tech: ["SQL"], url: null },
            ],
          },
          targeting: {
            primaryTitle: "Product Manager",
            titleVariants: [],
            jobDescription: "",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      issues: Array<{ id: string }>;
      changeSummary: Array<{ id: string }>;
      candidateResumeData: { summary: string } | null;
      candidateExportCheck: { fitsOnOnePage: boolean } | null;
      status: string;
    };

    expect(payload.status).toBe("ready");
    expect(payload.candidateExportCheck?.fitsOnOnePage).toBe(true);
    expect(payload.candidateResumeData?.summary.length).toBeLessThan(420);
    expect(payload.changeSummary.length).toBeGreaterThan(0);
    expect(payload.changeSummary.length).toBeLessThanOrEqual(3);
  });

  it("keeps a multi-page ATS draft ready when it still renders cleanly", async () => {
    mocks.checkExport.mockImplementation(async (resume: typeof sampleResume) => {
      return {
        renderable: true,
        renderFailureReason: null,
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The summary is still too long for a one-page ATS resume."],
        recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
      };
    });
    mocks.anthropicCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            suggestions: [],
          }),
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/generate/ats-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeData: {
            ...sampleResume,
            summary: "A".repeat(420),
            projects: [
              { name: "One", description: "Project", tech: ["TypeScript"], url: null },
              { name: "Two", description: "Project", tech: ["React"], url: null },
            ],
          },
          targeting: {
            primaryTitle: "Product Manager",
            titleVariants: [],
            jobDescription: "",
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      status: string;
      candidateResumeData: { summary: string } | null;
      candidateExportCheck: { fitsOnOnePage: boolean } | null;
      source: string;
    };

    expect(payload.status).toBe("ready");
    expect(payload.candidateResumeData?.summary.length).toBeLessThan(420);
    expect(payload.candidateExportCheck?.fitsOnOnePage).toBe(false);
    expect(mocks.anthropicCreate).toHaveBeenCalledTimes(1);
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "ats.review.run",
      expect.objectContaining({
        recommended_source: "rules",
        rules_fit_one_page: false,
      }),
    );
  });
});
