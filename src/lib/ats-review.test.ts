import { describe, expect, it } from "vitest";
import {
  createRuleBasedAtsReview,
  extractJobKeywords,
  getDefaultAtsTargeting,
  normalizeAtsText,
  normalizeResumeDataForAts,
} from "@/lib/ats-review";
import type { ResumeData } from "@/types/resume";

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Jordan Smith",
    headline: "Builder",
    location: "New York, NY",
    email: "jordan@example.com",
    linkedin: "linkedin.com/in/jordan-smith",
    github: "jordansmith",
    website: "jordansmith.dev",
    avatar_url: null,
    summary: "Builder with PM instincts and product sense â€¢ shipped UX work.",
    experience: [
      {
        title: "Product Lead",
        company: "Northwind",
        dates: "2022 â€“ Present",
        highlights: ["Led roadmap â€¢ cross-functional planning", "Owned experiments and analytics"],
        url: null,
      },
    ],
    education: [
      { degree: "B.S. Computer Science", school: "State University", year: "2020" },
    ],
    projects: [],
    skills: [{ category: "Tools", items: ["SQL", "Figma", "Analytics"] }],
    certifications: [],
    stats: [{ value: "6+", label: "Years" }],
    ...overrides,
  };
}

describe("ATS review helpers", () => {
  it("normalizes ATS-hostile punctuation into plain ASCII", () => {
    expect(normalizeAtsText("Senior PM â€¢ UX/UI â€” growth")).toBe("Senior PM - UX/UI - growth");
  });

  it("derives default targeting from the current headline and roles", () => {
    const targeting = getDefaultAtsTargeting(buildResume({ headline: "Product Manager | Growth" }));
    expect(targeting.primaryTitle).toBe("Product Manager");
    expect(targeting.titleVariants[0]).toBe("Product Lead");
  });

  it("flags missing exact titles, missing full-form terms, and job keyword gaps", () => {
    const data = normalizeResumeDataForAts(buildResume());
    const exportCheck = {
      pageCount: 1,
      fitsOnOnePage: true,
      overflowReasons: [],
      recommendedFixes: [],
    };

    const review = createRuleBasedAtsReview({
      data,
      targeting: {
        primaryTitle: "Product Manager",
        titleVariants: ["Product Owner"],
        jobDescription: "Need Product Manager with Python SQL Agile experience",
        lastExtractedKeywords: extractJobKeywords("Need Product Manager with Python SQL Agile experience"),
      },
      exportCheck,
    });

    expect(review.issues.map((issue) => issue.id)).toContain("primary-title-not-explicit");
    expect(review.issues.map((issue) => issue.id)).toContain("job-keywords-missing");
    expect(review.issues.some((issue) => issue.id === "abbreviation-pm")).toBe(true);
  });

  it("adds one-page guidance and trim suggestions when export still overflows", () => {
    const data = buildResume({
      summary: "A".repeat(420),
      projects: [
        { name: "One", description: "Project", tech: ["TypeScript"], url: null },
        { name: "Two", description: "Project", tech: ["React"], url: null },
        { name: "Three", description: "Project", tech: ["SQL"], url: null },
      ],
    });

    const review = createRuleBasedAtsReview({
      data,
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The summary is still too long for a one-page ATS resume."],
        recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
      },
    });

    expect(review.issues.map((issue) => issue.id)).toContain("pdf-overflow");
    expect(review.suggestions.map((suggestion) => suggestion.id)).toContain("tighten-summary");
    expect(review.suggestions.map((suggestion) => suggestion.id)).toContain("trim-projects");
  });
});
