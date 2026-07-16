import { describe, expect, it } from "vitest";
import { resolveAtsFixTarget } from "@/lib/ats-fix-target";
import type { AtsReadinessCheck } from "@/lib/ats-readiness";
import type { ResumeData } from "@/types/resume";

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Jordan Smith",
    headline: "Product Manager",
    location: "New York, NY",
    email: "jordan@example.com",
    linkedin: null,
    github: null,
    website: null,
    avatar_url: null,
    summary: "Product manager focused on useful products and measurable customer outcomes.",
    experience: [
      {
        title: "Product Manager",
        company: "Northwind",
        dates: "2022 - Present",
        highlights: ["Led a product launch that increased activation by 18%."],
        url: null,
      },
    ],
    education: [],
    projects: [],
    skills: [{ category: "Product", items: ["Roadmapping"] }],
    certifications: [],
    stats: [],
    ...overrides,
  };
}

function buildCheck(id: string, actionLabel?: string): AtsReadinessCheck {
  return {
    id,
    category: "content",
    title: "Test check",
    detail: "Test detail",
    severity: "warning",
    outcome: "recommended",
    passed: false,
    pointsDeducted: 10,
    ...(actionLabel ? { actionLabel } : {}),
  };
}

describe("ATS fix target resolver", () => {
  it("routes malformed contact details to the first field that needs attention", () => {
    const target = resolveAtsFixTarget(
      buildCheck("contact-values-valid"),
      buildResume({ email: "not-an-email", linkedin: "linkedin.com/in/jordan" }),
    );

    expect(target).toMatchObject({ section: "profile", field: "email" });
  });

  it("routes an incomplete role to its exact missing field", () => {
    const target = resolveAtsFixTarget(
      buildCheck("role-basics-complete"),
      buildResume({
        experience: [
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "",
            highlights: [],
            url: null,
          },
        ],
      }),
    );

    expect(target).toMatchObject({
      section: "experience",
      field: "experience-dates",
      entryIndex: 0,
    });
  });

  it("skips empty placeholders when routing an incomplete role", () => {
    const target = resolveAtsFixTarget(
      buildCheck("role-basics-complete"),
      buildResume({
        experience: [
          {
            title: "",
            company: "",
            dates: "",
            highlights: ["   "],
            url: null,
          },
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "",
            highlights: ["Led a product launch for a new customer segment."],
            url: null,
          },
        ],
      }),
    );

    expect(target).toMatchObject({
      field: "experience-dates",
      entryIndex: 1,
    });
  });

  it("routes missing collections to their add buttons", () => {
    expect(
      resolveAtsFixTarget(buildCheck("experience-present"), buildResume({ experience: [] })),
    ).toMatchObject({ section: "experience", field: "experience-add" });
    expect(
      resolveAtsFixTarget(buildCheck("skills-present"), buildResume({ skills: [] })),
    ).toMatchObject({ section: "skills", field: "skills-add" });
  });

  it("routes writing guidance to the relevant editable section", () => {
    expect(resolveAtsFixTarget(buildCheck("summary-focused"), buildResume())).toMatchObject({
      section: "summary",
      field: "summary",
    });
    expect(resolveAtsFixTarget(buildCheck("bullet-length"), buildResume())).toMatchObject({
      section: "experience",
      field: "experience-highlights",
    });
  });

  it("routes weak openings to the role that actually needs review", () => {
    const target = resolveAtsFixTarget(
      buildCheck("strong-action-openings"),
      buildResume({
        experience: [
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "2022 - Present",
            highlights: ["Led a product launch that increased activation by 18%."],
            url: null,
          },
          {
            title: "Product Analyst",
            company: "Contoso",
            dates: "2020 - 2022",
            highlights: ["Support for weekly product reporting and customer research."],
            url: null,
          },
        ],
      }),
    );

    expect(target).toMatchObject({
      field: "experience-highlights",
      entryIndex: 1,
    });
  });

  it("routes repeated openings to a role using the repeated word", () => {
    const target = resolveAtsFixTarget(
      buildCheck("varied-opening-verbs"),
      buildResume({
        experience: [
          {
            title: "Product Analyst",
            company: "Contoso",
            dates: "2020 - 2022",
            highlights: ["Built weekly reports for product leaders."],
            url: null,
          },
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "2022 - Present",
            highlights: [
              "Led a product launch for a new customer segment.",
              "Led customer interviews across three markets.",
              "Led planning for a cross-functional roadmap.",
            ],
            url: null,
          },
        ],
      }),
    );

    expect(target).toMatchObject({
      field: "experience-highlights",
      entryIndex: 1,
    });
  });

  it("treats whitespace-only highlights as missing instead of targeting another role", () => {
    const target = resolveAtsFixTarget(
      buildCheck("experience-highlights-present"),
      buildResume({
        experience: [
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "2022 - Present",
            highlights: ["Led a product launch for a new customer segment."],
            url: null,
          },
          {
            title: "Product Analyst",
            company: "Contoso",
            dates: "2020 - 2022",
            highlights: ["   "],
            url: null,
          },
        ],
      }),
    );

    expect(target).toMatchObject({
      field: "experience-highlights",
      entryIndex: 1,
    });
  });

  it("routes inconsistent dates to the role with the different or unrecognized style", () => {
    const target = resolveAtsFixTarget(
      buildCheck("date-format-consistency"),
      buildResume({
        experience: [
          {
            title: "Product Analyst",
            company: "Contoso",
            dates: "2020 - 2022",
            highlights: ["Built weekly reports for product leaders."],
            url: null,
          },
          {
            title: "Product Manager",
            company: "Northwind",
            dates: "Spring onward",
            highlights: ["Led a product launch for a new customer segment."],
            url: null,
          },
        ],
      }),
    );

    expect(target).toMatchObject({
      field: "experience-dates",
      entryIndex: 1,
    });
  });

  it("does not invent an edit destination for a PDF rendering failure", () => {
    expect(resolveAtsFixTarget(buildCheck("pdf-renderable"), buildResume())).toBeNull();
  });
});
