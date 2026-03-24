import { describe, expect, it } from "vitest";
import { buildDecisionReadinessState } from "@/lib/decision-readiness";
import type { ResumeData } from "@/types/resume";

function buildResumeData(overrides?: Partial<ResumeData>): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Staff Product Manager",
    location: "New York, NY",
    email: "rachel@example.com",
    linkedin: "linkedin.com/in/rachel",
    github: null,
    website: "rachel.dev",
    avatar_url: null,
    summary:
      "Product leader building systems that help teams move faster, prove outcomes, and make better decisions.",
    experience: [
      {
        title: "Founder",
        company: "MyLivingPage",
        dates: "2023-Present",
        highlights: ["Improved response rate by 32% across outbound follow-ups"],
        url: null,
      },
    ],
    education: [],
    projects: [],
    skills: [{ category: "Core", items: ["Strategy"] }],
    certifications: [],
    stats: [{ value: "32%", label: "response lift" }],
    ...overrides,
  };
}

describe("buildDecisionReadinessState", () => {
  it("marks a strong page as ready", () => {
    const readiness = buildDecisionReadinessState(buildResumeData());

    expect(readiness.overallStatus).toBe("ready");
    expect(readiness.readyCount).toBe(readiness.totalChecks);
  });

  it("returns upgrade suggestions when the page is thin", () => {
    const readiness = buildDecisionReadinessState(
      buildResumeData({
        headline: "",
        summary: "Short summary",
        email: null,
        linkedin: null,
        website: null,
        stats: [],
        experience: [
          {
            title: "Founder",
            company: "MyLivingPage",
            dates: "2023-Present",
            highlights: ["Built the product"],
            url: null,
          },
        ],
      }),
      [],
    );

    expect(readiness.overallStatus).toBe("needs_attention");
    expect(readiness.suggestions.length).toBeGreaterThan(0);
    expect(readiness.suggestions[0]?.title).toBeDefined();
  });
});
