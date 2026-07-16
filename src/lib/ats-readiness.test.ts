import { describe, expect, it } from "vitest";
import {
  ATS_READINESS_DISCLAIMER,
  buildAtsReadinessFingerprint,
  evaluateAtsReadiness,
  extractAtsJobKeywords,
  type AtsReadinessCategory,
} from "@/lib/ats-readiness";
import type { AtsExportCheck, ResumeData } from "@/types/resume";

const passingExportCheck: AtsExportCheck = {
  renderable: true,
  renderFailureReason: null,
  pageCount: 1,
  fitsOnOnePage: true,
  overflowReasons: [],
  recommendedFixes: [],
};

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Jordan Smith",
    headline: "Product Manager | Growth and Analytics",
    location: "New York, NY",
    email: "jordan@example.com",
    linkedin: "linkedin.com/in/jordan-smith",
    github: null,
    website: "jordansmith.dev",
    avatar_url: null,
    summary:
      "Product manager who turns customer research and analytics into focused roadmaps and useful products.",
    experience: [
      {
        title: "Product Manager",
        company: "Northwind",
        dates: "2022 - Present",
        highlights: [
          "Led a 12-person product team that shipped a new onboarding flow.",
          "Launched SQL-based analytics dashboards that increased activation by 18%.",
          "Reduced delivery time by 30% through clearer roadmap planning.",
        ],
        url: null,
      },
    ],
    education: [
      {
        degree: "B.S. Business Administration",
        school: "State University",
        year: "2020",
      },
    ],
    projects: [],
    skills: [
      {
        category: "Product",
        items: ["Roadmapping", "Customer research", "Experimentation", "SQL", "Analytics", "Figma"],
      },
    ],
    certifications: [],
    stats: [],
    ...overrides,
  };
}

function findCheck(
  result: ReturnType<typeof evaluateAtsReadiness>,
  id: string,
) {
  return Object.values(result.checks).flat().find((check) => check.id === id);
}

describe("deterministic ATS readiness", () => {
  it("marks a complete, scannable resume ready with a perfect transparent score", () => {
    const result = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
    });

    expect(result.status).toBe("ready");
    expect(result.score).toBe(100);
    expect(result.categoryScores).toEqual({
      essentials: 100,
      content: 100,
      searchability: 100,
      pdf: 100,
    });
    expect(result.criticalFixes).toEqual([]);
    expect(result.improvements).toEqual([]);
    expect(result.passedChecks.length).toBeGreaterThan(0);
    expect(result.disclaimer).toBe(ATS_READINESS_DISCLAIMER);
  });

  it("uses not_ready only when a critical requirement fails", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        name: "",
        email: null,
        linkedin: null,
        github: null,
        website: null,
        experience: [],
      }),
      exportCheck: passingExportCheck,
    });

    expect(result.status).toBe("not_ready");
    expect(result.criticalFixes.map((check) => check.id)).toEqual(
      expect.arrayContaining(["name-present", "usable-contact", "experience-present"]),
    );
    expect(result.categoryScores.essentials).toBe(25);
  });

  it("flags malformed supplied contact details even when another contact method works", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        email: "not-an-email",
        linkedin: "linkedin.com/in/jordan-smith",
      }),
      exportCheck: passingExportCheck,
    });

    expect(findCheck(result, "usable-contact")?.passed).toBe(true);
    expect(findCheck(result, "contact-values-valid")).toMatchObject({
      passed: false,
      severity: "warning",
      pointsDeducted: 10,
    });
    expect(result.status).toBe("needs_attention");
  });

  it("treats incomplete role basics and missing highlights as critical fixes", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        experience: [
          {
            title: "",
            company: "Northwind",
            dates: "2022 - Present",
            highlights: [],
            url: null,
          },
        ],
      }),
      exportCheck: passingExportCheck,
    });

    expect(result.status).toBe("not_ready");
    expect(result.criticalFixes.map((check) => check.id)).toEqual(
      expect.arrayContaining(["role-basics-complete", "experience-highlights-present"]),
    );
  });

  it("treats a PDF render failure as critical and preserves the renderer's reason", () => {
    const result = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: {
        renderable: false,
        renderFailureReason: "Unsupported content prevented rendering.",
        pageCount: null,
        fitsOnOnePage: null,
        overflowReasons: [],
        recommendedFixes: ["Shorten the unsupported content."],
      },
    });

    expect(result.status).toBe("not_ready");
    expect(result.categoryScores.pdf).toBe(0);
    expect(findCheck(result, "pdf-renderable")?.detail).toBe(
      "Unsupported content prevented rendering.",
    );
    expect(result.pdf.renderFailureReason).toBe("Unsupported content prevented rendering.");
  });

  it("reports multiple PDF pages as information without lowering readiness", () => {
    const result = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: {
        ...passingExportCheck,
        pageCount: 3,
        fitsOnOnePage: false,
        overflowReasons: ["The resume is longer than one page."],
        recommendedFixes: ["Trim older details if a shorter resume suits the role."],
      },
    });

    expect(result.status).toBe("ready");
    expect(result.score).toBe(100);
    expect(result.categoryScores.pdf).toBe(100);
    expect(findCheck(result, "pdf-page-count")).toMatchObject({
      severity: "info",
      passed: true,
      pointsDeducted: 0,
    });
    expect(result.pdf).toMatchObject({
      renderable: true,
      pageCount: 3,
      fitsOnOnePage: false,
    });
  });

  it("marks writing-quality warnings needs_attention without calling them critical", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        summary: "Too short.",
        experience: [
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "2022 - Present",
            highlights: ["I was responsible for routine product work"],
            url: null,
          },
        ],
      }),
      exportCheck: passingExportCheck,
    });

    expect(result.status).toBe("needs_attention");
    expect(result.criticalFixes).toEqual([]);
    expect(result.improvements.map((check) => check.id)).toEqual(
      expect.arrayContaining([
        "summary-focused",
        "direct-bullet-language",
        "strong-action-openings",
        "quantified-evidence",
      ]),
    );
  });

  it("detects repeated opening verbs, difficult bullet lengths, and absent metrics", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        experience: [
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "2022 - Present",
            highlights: [
              "Led roadmap planning across product and engineering teams.",
              "Led customer discovery sessions across several business groups.",
              "Led launches.",
            ],
            url: null,
          },
        ],
      }),
      exportCheck: passingExportCheck,
    });

    expect(findCheck(result, "varied-opening-verbs")?.passed).toBe(false);
    expect(findCheck(result, "bullet-length")?.passed).toBe(false);
    expect(findCheck(result, "quantified-evidence")?.passed).toBe(false);
    expect(result.status).toBe("needs_attention");
  });

  it("recognizes strong legal and professional action verbs", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        experience: [
          {
            title: "Associate Attorney",
            company: "Northwind Legal",
            dates: "2022 - Present",
            highlights: [
              "Drafted 20 dispositive motions and appellate briefs for complex matters.",
              "Counseled clients on litigation strategy and procedural risk.",
              "Researched statutory and case-law issues across multiple jurisdictions.",
            ],
            url: null,
          },
        ],
      }),
      exportCheck: passingExportCheck,
    });

    expect(findCheck(result, "strong-action-openings")?.passed).toBe(true);
  });

  it("flags inconsistent date detail without inventing date-order claims", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        experience: [
          ...buildResume().experience,
          {
            title: "Associate Product Manager",
            company: "Contoso",
            dates: "Jan 2020 - Dec 2021",
            highlights: ["Improved weekly reporting speed by 25% through automation."],
            url: null,
          },
        ],
      }),
      exportCheck: passingExportCheck,
    });

    expect(findCheck(result, "date-format-consistency")).toMatchObject({
      passed: false,
      severity: "warning",
      pointsDeducted: 10,
    });
  });

  it("does not create a keyword score or penalty when no job description is supplied", () => {
    const withoutDescription = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
    });
    const withWhitespaceOnly = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
      jobDescription: "   ",
    });

    expect(withoutDescription.keywordCoverage).toBeUndefined();
    expect(findCheck(withoutDescription, "job-keyword-coverage")).toBeUndefined();
    expect(withWhitespaceOnly.keywordCoverage).toBeUndefined();
    expect(withWhitespaceOnly.score).toBe(withoutDescription.score);
  });

  it("keeps role-specific job terms advisory and separate from core readiness", () => {
    const baseline = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
    });
    const result = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
      jobDescription:
        "Product Manager responsible for SQL analytics roadmaps Python Kubernetes Terraform Rust and AWS.",
    });

    expect(result.keywordCoverage).toBeDefined();
    expect(result.keywordCoverage?.matchedKeywords).toEqual(
      expect.arrayContaining(["product", "manager", "sql", "analytics"]),
    );
    expect(result.keywordCoverage?.missingKeywords).toEqual(
      expect.arrayContaining(["python", "kubernetes", "terraform", "rust", "aws"]),
    );
    expect(findCheck(result, "job-keyword-coverage")?.passed).toBe(false);
    expect(findCheck(result, "job-keyword-coverage")?.outcome).toBe("info");
    expect(result.tailoringChecks.map((check) => check.id)).toContain("job-keyword-coverage");
    expect(result.status).toBe("ready");
    expect(result.score).toBe(baseline.score);
  });

  it("passes keyword coverage when the selected terms are truthfully represented", () => {
    const result = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
      jobDescription: "Product Manager using SQL analytics roadmapping and customer research.",
    });

    expect(result.keywordCoverage?.coveragePercent).toBeGreaterThanOrEqual(70);
    expect(findCheck(result, "job-keyword-coverage")).toMatchObject({
      passed: true,
      pointsDeducted: 0,
    });
    expect(result.status).toBe("ready");
  });

  it("checks an optional target title as an exact professional phrase", () => {
    const present = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
      targetTitle: "Product Manager",
    });
    const missing = evaluateAtsReadiness({
      data: buildResume(),
      exportCheck: passingExportCheck,
      targetTitle: "Growth Marketing Director",
    });

    expect(findCheck(present, "target-title-present")?.passed).toBe(true);
    expect(present.status).toBe("ready");
    expect(findCheck(missing, "target-title-present")?.passed).toBe(false);
    expect(findCheck(missing, "target-title-present")?.outcome).toBe("info");
    expect(missing.status).toBe("ready");
  });

  it("uses action-oriented failure titles and excludes non-applicable checks from progress", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        name: "",
        experience: [],
      }),
      exportCheck: passingExportCheck,
    });

    expect(findCheck(result, "name-present")?.title).toBe("Add your name");
    expect(findCheck(result, "direct-bullet-language")?.outcome).toBe("not_applicable");
    expect(result.passedChecks.map((check) => check.id)).not.toContain("direct-bullet-language");
    expect(result.summary.requiredFixCount).toBe(result.criticalFixes.length);
    expect(result.summary.applicableCheckCount).toBe(
      result.summary.requiredFixCount +
        result.summary.recommendationCount +
        result.summary.passedCount,
    );
  });

  it("is deterministic unless the caller explicitly supplies an evaluation time", () => {
    const input = { data: buildResume(), exportCheck: passingExportCheck };
    const first = evaluateAtsReadiness(input);
    const second = evaluateAtsReadiness(input);
    const stamped = evaluateAtsReadiness({
      ...input,
      evaluatedAt: "2026-07-15T12:00:00.000Z",
    });

    expect(first).toEqual(second);
    expect(first.evaluatedAt).toBeNull();
    expect(stamped.evaluatedAt).toBe("2026-07-15T12:00:00.000Z");
    expect(stamped.fingerprint).toBe(first.fingerprint);
    expect(buildAtsReadinessFingerprint(buildResume())).toBe(first.fingerprint);
    expect(buildAtsReadinessFingerprint(buildResume({ summary: "A different summary that is still long enough." }))).not.toBe(
      first.fingerprint,
    );
  });

  it("maps every score deduction to a failed check", () => {
    const result = evaluateAtsReadiness({
      data: buildResume({
        name: "",
        headline: "",
        email: null,
        linkedin: null,
        website: null,
        summary: "",
        skills: [],
        experience: [
          {
            title: "",
            company: "Northwind",
            dates: "Unknown",
            highlights: ["Helped with tasks"],
            url: null,
          },
        ],
      }),
      exportCheck: passingExportCheck,
    });
    const categories = Object.keys(result.checks) as AtsReadinessCategory[];

    for (const category of categories) {
      const deduction = result.checks[category].reduce(
        (total, check) => total + check.pointsDeducted,
        0,
      );
      expect(result.categoryScores[category]).toBe(Math.max(0, 100 - deduction));
    }

    for (const check of Object.values(result.checks).flat()) {
      if (check.pointsDeducted > 0) {
        expect(check.passed).toBe(false);
        expect(["warning", "critical"]).toContain(check.severity);
      }
      if (check.passed) {
        expect(check.pointsDeducted).toBe(0);
      }
    }

    const expectedOverall = Math.round(
      result.categoryScores.essentials * 0.35 +
        result.categoryScores.content * 0.3 +
        result.categoryScores.searchability * 0.2 +
        result.categoryScores.pdf * 0.15,
    );
    expect(result.score).toBe(expectedOverall);
  });

  it("extracts specific job terms deterministically and filters generic posting language", () => {
    const description =
      "The ideal candidate will have SQL and SQL analytics experience with Python. Equal opportunity employer.";

    expect(extractAtsJobKeywords(description)).toEqual(["sql", "analytics", "python"]);
    expect(extractAtsJobKeywords(description)).toEqual(extractAtsJobKeywords(description));
  });
});
