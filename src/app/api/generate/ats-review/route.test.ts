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
    const payload = (await response.json()) as { mode: string; proposals: Array<{ id: string }> };

    expect(payload.mode).toBe("fast");
    expect(Array.isArray(payload.proposals)).toBe(true);
    expect(mocks.anthropicCreate).not.toHaveBeenCalled();
    expect(mocks.trackEvent).toHaveBeenCalledWith(
      "user-1",
      "ats.review.run",
      expect.objectContaining({
        mode: "fast",
      }),
    );
  });

  it("returns proposals alongside issues and scores during a full review", async () => {
    mocks.checkExport.mockResolvedValueOnce({
      pageCount: 2,
      fitsOnOnePage: false,
      overflowReasons: ["The summary is still too long for a one-page ATS resume."],
      recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
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
      proposals: Array<{ group: string; beforeText: string; afterText: string }>;
    };

    expect(payload.issues.map((issue) => issue.id)).toContain("pdf-overflow");
    expect(payload.proposals.length).toBeGreaterThan(0);
    expect(payload.proposals.some((proposal) => proposal.group === "summary")).toBe(true);
    expect(payload.proposals.every((proposal) => proposal.beforeText !== proposal.afterText)).toBe(true);
  });
});
