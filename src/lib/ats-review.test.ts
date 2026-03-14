import { describe, expect, it } from "vitest";
import {
  applyProposalSelection,
  buildAtsRelevantFingerprint,
  createRuleBasedAtsReview,
  evaluateSuggestionOutcome,
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
    expect(review.proposals.map((proposal) => proposal.group)).toContain("summary");
    expect(review.proposals.map((proposal) => proposal.group)).toContain("projects");
    expect(review.suggestions.find((suggestion) => suggestion.id === "tighten-summary")?.expectedIssueIds).toContain("pdf-overflow");
    expect(review.suggestions.find((suggestion) => suggestion.id === "tighten-summary")?.expectedScoreDimensions).toContain("onePagePdf");
  });

  it("builds at most one proposal per section group with normalized before and after text", () => {
    const data = buildResume({
      summary: "Product builder Ã¢â‚¬Â¢ founder Ã¢â‚¬â€œ operator with UX instincts and SQL experience.".repeat(4),
      experience: [
        {
          title: "Founder",
          company: "Northwind",
          dates: "2020 - Present",
          highlights: [
            "Built the platform from scratch Ã¢â‚¬Â¢ launched payments",
            "Owned growth experiments",
            "Managed onboarding",
          ],
          url: null,
        },
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
      mode: "full",
    });

    const proposalGroups = review.proposals.map((proposal) => proposal.group);
    expect(new Set(proposalGroups).size).toBe(proposalGroups.length);
    expect(proposalGroups).toContain("summary");
    expect(review.proposals.every((proposal) => proposal.beforeText !== proposal.afterText)).toBe(true);
  });

  it("applies only the selected proposal sections to the working data", () => {
    const overflowingReview = createRuleBasedAtsReview({
      data: buildResume({
        summary: "A".repeat(420),
        projects: [
          { name: "One", description: "Project", tech: ["TypeScript"], url: null },
          { name: "Two", description: "Project", tech: ["React"], url: null },
          { name: "Three", description: "Project", tech: ["SQL"], url: null },
        ],
      }),
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The summary is still too long for a one-page ATS resume."],
        recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
      },
    });

    const summaryProposal = overflowingReview.proposals.find((proposal) => proposal.group === "summary");
    const projectProposal = overflowingReview.proposals.find((proposal) => proposal.group === "projects");
    if (!summaryProposal || !projectProposal) {
      throw new Error("Expected summary and project proposals.");
    }

    const nextData = applyProposalSelection(buildResume({
      summary: "A".repeat(420),
      projects: [
        { name: "One", description: "Project", tech: ["TypeScript"], url: null },
        { name: "Two", description: "Project", tech: ["React"], url: null },
        { name: "Three", description: "Project", tech: ["SQL"], url: null },
      ],
    }), overflowingReview.proposals, [summaryProposal.id]);

    expect(nextData.summary.length).toBeLessThan(420);
    expect(nextData.projects).toHaveLength(3);
  });

  it("tracks ATS-relevant field fingerprints independently from cosmetic fields", () => {
    const base = buildResume();
    const sameFingerprint = buildAtsRelevantFingerprint({
      ...base,
      avatar_url: "https://example.com/avatar.png",
      stats: [{ value: "10+", label: "Years" }],
    });
    const changedFingerprint = buildAtsRelevantFingerprint({
      ...base,
      summary: `${base.summary} Added more detail.`,
    });

    expect(sameFingerprint).toBe(buildAtsRelevantFingerprint(base));
    expect(changedFingerprint).not.toBe(buildAtsRelevantFingerprint(base));
  });

  it("marks suggestion outcomes as confirmed when the expected issue clears", () => {
    const overflowingReview = createRuleBasedAtsReview({
      data: buildResume({ summary: "A".repeat(420) }),
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The summary is still too long for a one-page ATS resume."],
        recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
      },
    });
    const suggestion = overflowingReview.suggestions.find((item) => item.id === "tighten-summary");
    if (!suggestion) {
      throw new Error("Expected tighten-summary suggestion.");
    }

    const confirmedOutcome = evaluateSuggestionOutcome({
      suggestion,
      nextIssues: [],
      previousScore: overflowingReview.score,
      nextScore: {
        machineReadability: overflowingReview.score.machineReadability,
        recruiterSearchability: overflowingReview.score.recruiterSearchability,
        onePagePdf: 100,
        overall: 100,
      },
    });

    expect(confirmedOutcome.status).toBe("confirmed");
    expect(confirmedOutcome.confirmedIssueIds).toContain("pdf-overflow");
    expect(confirmedOutcome.improvedScoreDimensions).toContain("onePagePdf");
  });

  it("marks suggestion outcomes as still needing work when the issue remains", () => {
    const overflowingReview = createRuleBasedAtsReview({
      data: buildResume({ summary: "A".repeat(420) }),
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The summary is still too long for a one-page ATS resume."],
        recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
      },
    });
    const suggestion = overflowingReview.suggestions.find((item) => item.id === "tighten-summary");
    if (!suggestion) {
      throw new Error("Expected tighten-summary suggestion.");
    }

    const outcome = evaluateSuggestionOutcome({
      suggestion,
      nextIssues: overflowingReview.issues,
      previousScore: overflowingReview.score,
      nextScore: overflowingReview.score,
    });

    expect(outcome.status).toBe("still_needs_work");
    expect(outcome.remainingIssueIds).toContain("pdf-overflow");
  });
});
