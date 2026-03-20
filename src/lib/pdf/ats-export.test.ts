import { describe, expect, it } from "vitest";
import { buildResumePdfData, checkResumeExport } from "@/lib/pdf/ats-export";
import type { ResumeData } from "@/types/resume";

function buildResume(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    name: "Taylor Reed",
    headline: "Product Manager",
    location: "Austin, TX",
    email: "taylor@example.com",
    linkedin: "https://linkedin.com/in/taylor-reed",
    github: "taylorreed",
    website: "taylorreed.dev",
    avatar_url: "https://cdn.example.com/avatar.png",
    summary: "Product Manager â€¢ shipping SaaS products with SQL and UX collaboration.",
    experience: [
      {
        title: "Product Manager",
        company: "Northwind",
        dates: "2022 - Present",
        highlights: ["Owned roadmap and analytics", "Partnered with engineering and design"],
        url: "northwind.example.com",
      },
    ],
    education: [{ degree: "B.A. Economics", school: "University", year: "2019" }],
    projects: [{ name: "Launch Hub", description: "Internal launch tooling", tech: ["React", "SQL"], url: null }],
    skills: [{ category: "Tools", items: ["SQL", "Figma", "Amplitude"] }],
    certifications: [{ name: "CSPO", issuer: "Scrum Alliance", date: "2023" }],
    stats: [{ value: "5+", label: "Years" }],
    ...overrides,
  };
}

function buildLongResume(): ResumeData {
  const longBullet =
    "Led a cross-functional initiative that consolidated fragmented workflows, improved keyword coverage, and documented measurable delivery outcomes across teams.";

  return buildResume({
    summary:
      "Product leader building recruiter-friendly resume systems, aligning content strategy to exact role language, and shipping structured operating improvements across product, design, and operations.",
    experience: Array.from({ length: 6 }, (_, index) => ({
      title: `Senior Product Manager ${index + 1}`,
      company: `Company ${index + 1}`,
      dates: `20${18 + index} - 20${19 + index}`,
      highlights: Array.from({ length: 4 }, (_, bulletIndex) => `${longBullet} Focus area ${bulletIndex + 1}.`),
      url: `company-${index + 1}.example.com`,
    })),
    projects: [
      {
        name: "Launch Hub",
        description: `${longBullet} Built launch tooling and reporting dashboards for multi-team planning.`,
        tech: ["React", "SQL", "TypeScript", "Analytics"],
        url: null,
      },
      {
        name: "Hiring Workflow",
        description: `${longBullet} Created a reusable hiring-ops system for candidate review and search signals.`,
        tech: ["Automation", "Docs", "Airtable", "Notion"],
        url: null,
      },
      {
        name: "Portfolio Analytics",
        description: `${longBullet} Modeled portfolio health, reporting, and keyword performance over time.`,
        tech: ["Python", "SQL", "Looker", "ETL"],
        url: null,
      },
    ],
    certifications: [
      { name: "CSPO", issuer: "Scrum Alliance", date: "2023" },
      { name: "PMC", issuer: "Product School", date: "2022" },
      { name: "Analytics", issuer: "General Assembly", date: "2021" },
    ],
  });
}

describe("Resume PDF export", () => {
  it("normalizes export data and removes public-page-only stats", () => {
    const exportData = buildResumePdfData(buildResume());

    expect(exportData.summary).toBe("Product Manager - shipping SaaS products with SQL and UX collaboration.");
    expect(exportData.linkedin).toBe("linkedin.com/in/taylor-reed");
    expect(exportData.github).toBe("github.com/taylorreed");
    expect(exportData.stats).toEqual([]);
  });

  it("renders a compliant resume as a single clean page", async () => {
    const exportCheck = await checkResumeExport(buildResume());

    expect(exportCheck.renderable).toBe(true);
    expect(exportCheck.renderFailureReason).toBeNull();
    expect(exportCheck.pageCount).toBe(1);
    expect(exportCheck.fitsOnOnePage).toBe(true);
    expect(exportCheck.overflowReasons).toEqual([]);
  });

  it("renders oversized resumes as a valid multi-page PDF instead of falling back to validation failure", async () => {
    const exportCheck = await checkResumeExport(buildLongResume());

    expect(exportCheck.renderable).toBe(true);
    expect(exportCheck.renderFailureReason).toBeNull();
    expect(exportCheck.pageCount).toBeGreaterThan(1);
    expect(exportCheck.fitsOnOnePage).toBe(false);
    expect(exportCheck.overflowReasons).not.toContain("The Resume PDF could not be validated with the current content shape.");
  });
});
