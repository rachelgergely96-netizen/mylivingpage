import { describe, expect, it } from "vitest";
import {
  buildResumePdfFileName,
  coerceResumeDataForExport,
} from "@/lib/resume-export";

describe("resume export helpers", () => {
  it("builds a stable Resume PDF filename", () => {
    expect(buildResumePdfFileName("Taylor Reed")).toBe("taylor-reed-resume.pdf");
    expect(buildResumePdfFileName("Jos\u00e9 \ud83d\ude80")).toBe("jose-resume.pdf");
    expect(buildResumePdfFileName("")).toBe("resume.pdf");
    expect(buildResumePdfFileName("Resume")).toBe("resume.pdf");
  });

  it("coerces malformed stored page data into a safe resume shape", () => {
    const data = coerceResumeDataForExport({
      name: null,
      summary: "Builder and operator",
      experience: [{ title: "Founder", company: false, dates: 2024, highlights: ["Shipped", 7] }],
      skills: [{ category: 88, items: "Strategy" }],
      stats: [{ value: 9, label: "Years" }],
    });

    expect(data).toEqual({
      name: "Resume",
      headline: "",
      location: "",
      email: null,
      linkedin: null,
      github: null,
      website: null,
      avatar_url: null,
      summary: "Builder and operator",
      experience: [
        {
          title: "Founder",
          company: "",
          dates: "2024",
          highlights: ["Shipped", "7"],
          url: null,
        },
      ],
      education: [],
      projects: [],
      skills: [{ category: "88", items: ["Strategy"] }],
      certifications: [],
      stats: [
        {
          value: "9",
          label: "Years",
        },
      ],
    });
  });

  it("strips unsupported unicode characters and omits empty sections", () => {
    const data = coerceResumeDataForExport({
      name: "Jos\u00e9 \ud83d\ude80",
      headline: "Product Lead \u2014 Platforms",
      linkedin: "@josereed",
      github: "josereed",
      website: "https://portfolio.example.com",
      summary: "Led growth \u2022 shipped tools \ud83c\udf1f",
      experience: [
        {
          title: "Founder",
          company: "Cr\u00e8me Labs",
          dates: "2022 \u2014 2024",
          highlights: ["Built the platform \ud83d\udca1"],
        },
        {
          title: null,
          company: null,
          dates: null,
          highlights: [],
        },
      ],
      skills: [{ category: "", items: ["Strategy", "\ud83d\ude80"] }],
      projects: [{ name: "", description: "", tech: [], url: null }],
    });

    expect(data).toEqual({
      name: "Jose",
      headline: "Product Lead - Platforms",
      location: "",
      email: null,
      linkedin: "linkedin.com/in/josereed",
      github: "github.com/josereed",
      website: "portfolio.example.com",
      avatar_url: null,
      summary: "Led growth - shipped tools",
      experience: [
        {
          title: "Founder",
          company: "Creme Labs",
          dates: "2022 - 2024",
          highlights: ["Built the platform"],
          url: null,
        },
      ],
      education: [],
      projects: [],
      skills: [{ category: "Skills", items: ["Strategy"] }],
      certifications: [],
      stats: [],
    });
  });
});
