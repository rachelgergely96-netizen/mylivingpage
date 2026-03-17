import { describe, expect, it } from "vitest";
import {
  approveCandidateAtsResume,
  applyProposalSelection,
  buildAutoOptimizedAtsCandidate,
  buildAtsRelevantFingerprint,
  createRuleBasedAtsReview,
  evaluateSuggestionOutcome,
  extractJobKeywords,
  finalizeApprovedAtsResume,
  getAtsApprovalStatus,
  getDefaultAtsTargeting,
  hasApprovedAtsResume,
  inheritApprovedAtsResume,
  isAtsOutOfSync,
  normalizeAtsText,
  normalizeResumeDataForAts,
  reconcileAtsApprovalStatus,
  resolveEditableAtsResumeData,
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

  it("builds an auto-optimized ATS candidate that reaches one page for common overflow cases", async () => {
    const data = buildResume({
      summary: "A".repeat(420),
      experience: [
        {
          title: "Founder",
          company: "Northwind",
          dates: "2022 - Present",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Product Lead",
          company: "Contoso",
          dates: "2020 - 2022",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Analyst",
          company: "Fabrikam",
          dates: "2019 - 2020",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Coordinator",
          company: "Tailspin",
          dates: "2018 - 2019",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Assistant",
          company: "Legacy Co",
          dates: "2017 - 2018",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
      ],
      projects: [
        { name: "One", description: "Project", tech: ["TypeScript"], url: null },
        { name: "Two", description: "Project", tech: ["React"], url: null },
        { name: "Three", description: "Project", tech: ["SQL"], url: null },
      ],
      certifications: [
        { name: "One", issuer: "Issuer", date: "2023" },
        { name: "Two", issuer: "Issuer", date: "2024" },
        { name: "Three", issuer: "Issuer", date: "2025" },
      ],
      skills: [{ category: "Tools", items: Array.from({ length: 20 }, (_, index) => `Skill ${index + 1}`) }],
    });

    const candidate = await buildAutoOptimizedAtsCandidate({
      data,
      targeting: getDefaultAtsTargeting(data),
      checkExport: async (resume) => {
        const totalHighlights = resume.experience.reduce((count, entry) => count + entry.highlights.length, 0);
        const totalSkills = resume.skills.reduce((count, group) => count + group.items.length, 0);
        const fits =
          resume.summary.length <= 220 &&
          resume.experience.length <= 4 &&
          totalHighlights <= 6 &&
          resume.projects.length <= 1 &&
          resume.certifications.length <= 1 &&
          totalSkills <= 10;

        return {
          pageCount: fits ? 1 : 2,
          fitsOnOnePage: fits,
          overflowReasons: fits ? [] : ["Still over one page."],
          recommendedFixes: fits ? [] : ["Trim more content."],
        };
      },
    });

    expect(candidate.status).toBe("ready");
    expect(candidate.candidateExportCheck.fitsOnOnePage).toBe(true);
    expect(candidate.candidateResumeData.summary.length).toBeLessThanOrEqual(220);
    expect(candidate.candidateResumeData.experience.length).toBeLessThanOrEqual(4);
    expect(candidate.changeSummary.length).toBeGreaterThan(0);
    expect(candidate.changeSummary.length).toBeLessThanOrEqual(3);
  });

  it("keeps a minimum ATS floor while trimming aggressively toward one-page fit", async () => {
    const data = buildResume({
      summary: "A".repeat(420),
      experience: [
        {
          title: "Founder",
          company: "Northwind",
          dates: "2022 - Present",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Product Lead",
          company: "Contoso",
          dates: "2020 - 2022",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Analyst",
          company: "Fabrikam",
          dates: "2019 - 2020",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
        {
          title: "Coordinator",
          company: "Tailspin",
          dates: "2018 - 2019",
          highlights: ["One", "Two", "Three"],
          url: null,
        },
      ],
      projects: [
        { name: "One", description: "Project", tech: ["TypeScript"], url: null },
      ],
      certifications: [
        { name: "One", issuer: "Issuer", date: "2023" },
      ],
      skills: [{ category: "Tools", items: Array.from({ length: 20 }, (_, index) => `Skill ${index + 1}`) }],
    });

    const candidate = await buildAutoOptimizedAtsCandidate({
      data,
      targeting: getDefaultAtsTargeting(data),
      checkExport: async (resume) => {
        const totalHighlights = resume.experience.reduce((count, entry) => count + entry.highlights.length, 0);
        const totalSkills = resume.skills.reduce((count, group) => count + group.items.length, 0);
        const fits =
          resume.summary.length <= 140 &&
          resume.experience.length <= 2 &&
          totalHighlights <= 2 &&
          resume.projects.length === 0 &&
          resume.certifications.length === 0 &&
          totalSkills <= 6;

        return {
          pageCount: fits ? 1 : 2,
          fitsOnOnePage: fits,
          overflowReasons: fits ? [] : ["Still over one page."],
          recommendedFixes: fits ? [] : ["Trim more content."],
        };
      },
    });

    expect(candidate.status).toBe("ready");
    expect(candidate.candidateExportCheck.fitsOnOnePage).toBe(true);
    expect(candidate.candidateResumeData.experience).toHaveLength(2);
    expect(candidate.candidateResumeData.experience.every((entry) => entry.highlights.length >= 1)).toBe(true);
    expect(candidate.candidateResumeData.education).toHaveLength(1);
    expect(candidate.candidateResumeData.skills.reduce((count, group) => count + group.items.length, 0)).toBeLessThanOrEqual(6);
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

  it("stores a separate approved ATS resume only when the export fits one page", () => {
    const fittingReview = createRuleBasedAtsReview({
      data: buildResume(),
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 1,
        fitsOnOnePage: true,
        overflowReasons: [],
        recommendedFixes: [],
      },
    });

    const approvedReview = finalizeApprovedAtsResume(fittingReview, buildResume());
    expect(hasApprovedAtsResume(approvedReview)).toBe(true);
    expect(approvedReview.approvedResumeData?.stats).toEqual([{ value: "6+", label: "Years" }]);
    expect(approvedReview.availabilityReason).toBeNull();

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

    const unavailableReview = finalizeApprovedAtsResume(overflowingReview, buildResume({ summary: "A".repeat(420) }));
    expect(hasApprovedAtsResume(unavailableReview)).toBe(false);
    expect(unavailableReview.approvedResumeData).toBeNull();
    expect(unavailableReview.approvedExportCheck).toBeNull();
    expect(unavailableReview.approvalStatus).toBe("pending");
    expect(unavailableReview.availabilityReason).toContain("Shorten the summary");
  });

  it("approves the generated ATS candidate separately from the public page content", () => {
    const review = createRuleBasedAtsReview({
      data: buildResume({ headline: "Builder", summary: "A".repeat(420) }),
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The current version is too long."],
        recommendedFixes: ["Tighten the summary."],
      },
      candidateResumeData: buildResume({ headline: "Product Manager", summary: "Product Manager with SQL, Figma, Analytics experience." }),
      candidateExportCheck: {
        pageCount: 1,
        fitsOnOnePage: true,
        overflowReasons: [],
        recommendedFixes: [],
      },
      changeSummary: [
        {
          id: "headline-searchable",
          title: "Made the headline easier to find",
          description: "Used a clearer title.",
          category: "recruiter_searchability",
        },
      ],
      status: "ready",
    });

    const approved = approveCandidateAtsResume(review);
    expect(approved.approvedResumeData?.headline).toBe("Product Manager");
    expect(approved.approvedExportCheck?.fitsOnOnePage).toBe(true);
    expect(approved.approvedResumeData?.headline).not.toBe("Builder");
  });

  it("preserves the saved approved ATS resume across transient review reruns", () => {
    const savedReview = finalizeApprovedAtsResume(
      createRuleBasedAtsReview({
        data: buildResume(),
        targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
        exportCheck: {
          pageCount: 1,
          fitsOnOnePage: true,
          overflowReasons: [],
          recommendedFixes: [],
        },
      }),
      buildResume(),
    );

    const transientReview = createRuleBasedAtsReview({
      data: buildResume({ summary: "A".repeat(420) }),
      targeting: { primaryTitle: "Product Manager", titleVariants: [], jobDescription: "", lastExtractedKeywords: [] },
      exportCheck: {
        pageCount: 2,
        fitsOnOnePage: false,
        overflowReasons: ["The summary is still too long for a one-page ATS resume."],
        recommendedFixes: ["Shorten the summary to two tight sentences with the exact role and top skills."],
      },
    });

    const mergedReview = inheritApprovedAtsResume(transientReview, savedReview);
    expect(hasApprovedAtsResume(mergedReview)).toBe(true);
    expect(getAtsApprovalStatus(mergedReview)).toBe("approved");
    expect(mergedReview.approvedContentHash).toBe(savedReview.approvedContentHash);
    expect(mergedReview.exportCheck.fitsOnOnePage).toBe(false);
  });

  it("resolves the editable ATS resume from the latest saved ATS draft before falling back to the approved copy", () => {
    const fallback = buildResume({ headline: "Living Page Headline" });
    const saved = approveCandidateAtsResume(
      createRuleBasedAtsReview({
        data: fallback,
        targeting: getDefaultAtsTargeting(fallback),
        exportCheck: {
          pageCount: 1,
          fitsOnOnePage: true,
          overflowReasons: [],
          recommendedFixes: [],
        },
        candidateResumeData: buildResume({ headline: "ATS Headline" }),
        candidateExportCheck: {
          pageCount: 1,
          fitsOnOnePage: true,
          overflowReasons: [],
          recommendedFixes: [],
        },
      }),
      buildAtsRelevantFingerprint(fallback),
    );
    const approvedOnly = { ...saved, candidateResumeData: null };

    const withDraft = {
      ...saved,
      candidateResumeData: buildResume({ headline: "Draft ATS Headline" }),
    };

    expect(resolveEditableAtsResumeData(withDraft, fallback).headline).toBe("Draft ATS Headline");
    expect(resolveEditableAtsResumeData(approvedOnly, fallback).headline).toBe("ATS Headline");
  });

  it("keeps an approved ATS resume active until the saved draft diverges", () => {
    const living = buildResume();
    const approved = finalizeApprovedAtsResume(
      createRuleBasedAtsReview({
        data: living,
        targeting: getDefaultAtsTargeting(living),
        exportCheck: {
          pageCount: 1,
          fitsOnOnePage: true,
          overflowReasons: [],
          recommendedFixes: [],
        },
      }),
      living,
      buildAtsRelevantFingerprint(living),
    );

    const rerun = inheritApprovedAtsResume(
      createRuleBasedAtsReview({
        data: buildResume({ summary: "Tightened summary for a new candidate." }),
        targeting: getDefaultAtsTargeting(living),
        exportCheck: {
          pageCount: 1,
          fitsOnOnePage: true,
          overflowReasons: [],
          recommendedFixes: [],
        },
      }),
      approved,
    );

    expect(hasApprovedAtsResume(rerun)).toBe(true);

    const pending = reconcileAtsApprovalStatus({
      review: rerun,
      draftData: buildResume({ headline: "Changed ATS Draft" }),
      sourceData: living,
    });

    expect(hasApprovedAtsResume(pending)).toBe(false);
    expect(getAtsApprovalStatus(pending, living)).toBe("pending");
  });

  it("tracks when the ATS resume falls out of sync with living-page source data", () => {
    const living = buildResume();
    const review = finalizeApprovedAtsResume(
      createRuleBasedAtsReview({
        data: living,
        targeting: getDefaultAtsTargeting(living),
        exportCheck: {
          pageCount: 1,
          fitsOnOnePage: true,
          overflowReasons: [],
          recommendedFixes: [],
        },
      }),
      living,
      buildAtsRelevantFingerprint(living),
    );

    expect(isAtsOutOfSync(review, living)).toBe(false);
    expect(isAtsOutOfSync(review, buildResume({ headline: "Changed Headline" }))).toBe(true);
  });
});
