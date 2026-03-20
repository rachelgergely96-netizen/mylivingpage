import { describe, expect, it } from "vitest";
import { buildResumePdfData } from "@/lib/pdf/ats-export";
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
    summary: "Product Manager \u2022 shipping SaaS products with SQL and UX collaboration.",
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
    projects: [
      {
        name: "Launch Hub",
        description: "Internal launch tooling",
        tech: ["React", "SQL"],
        url: null,
      },
    ],
    skills: [{ category: "Tools", items: ["SQL", "Figma", "Amplitude"] }],
    certifications: [{ name: "CSPO", issuer: "Scrum Alliance", date: "2023" }],
    stats: [{ value: "5+", label: "Years" }],
    ...overrides,
  };
}

describe("Resume PDF export data shaping", () => {
  it("normalizes export data and removes public-page-only stats", () => {
    const exportData = buildResumePdfData(buildResume());

    expect(exportData.summary).toBe(
      "Product Manager - shipping SaaS products with SQL and UX collaboration.",
    );
    expect(exportData.linkedin).toBe("linkedin.com/in/taylor-reed");
    expect(exportData.github).toBe("github.com/taylorreed");
    expect(exportData.stats).toEqual([]);
  });

  it("coerces malformed saved data into a safe export shape", () => {
    const exportData = buildResumePdfData({
      name: 42,
      summary: ["Legacy summary"],
      experience: null,
      education: [{ degree: "B.A.", school: 2024, year: true }],
      projects: [{ name: "Launch", description: false, tech: "React", url: null }],
      skills: [{ category: "Core", items: "Strategy" }],
      certifications: [{ name: "Cert", issuer: 11, date: false }],
      stats: [{ value: 5, label: "Years" }],
    } as unknown);

    expect(exportData).toMatchObject({
      name: "42",
      summary: "Legacy summary",
      experience: [],
      education: [{ degree: "B.A.", school: "2024", year: "" }],
      projects: [{ name: "Launch", description: "", tech: ["React"], url: null }],
      skills: [{ category: "Core", items: ["Strategy"] }],
      certifications: [{ name: "Cert", issuer: "11", date: null }],
      stats: [],
    });
  });
});
