import { describe, expect, it } from "vitest";
import { buildAtsPdfData, checkAtsResumeExport } from "@/lib/pdf/ats-export";
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

describe("ATS PDF export", () => {
  it("normalizes ATS export data and removes public-page-only stats", () => {
    const exportData = buildAtsPdfData(buildResume());

    expect(exportData.summary).toBe("Product Manager - shipping SaaS products with SQL and UX collaboration.");
    expect(exportData.linkedin).toBe("linkedin.com/in/taylor-reed");
    expect(exportData.github).toBe("github.com/taylorreed");
    expect(exportData.stats).toEqual([]);
  });

  it("renders a compliant resume as a single ATS-safe page", async () => {
    const exportCheck = await checkAtsResumeExport(buildResume());

    expect(exportCheck.pageCount).toBe(1);
    expect(exportCheck.fitsOnOnePage).toBe(true);
    expect(exportCheck.overflowReasons).toEqual([]);
  });
});
