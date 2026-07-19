import { describe, expect, it } from "vitest";
import { getLivingPageSectionIds } from "@/lib/living-page-sections";
import type { ResumeData } from "@/types/resume";

function buildResumeData(): ResumeData {
  return {
    name: "Avery Morgan",
    headline: "Product leader",
    location: "New York, NY",
    email: null,
    linkedin: null,
    github: null,
    website: null,
    avatar_url: null,
    summary: "I build useful products.",
    experience: [
      {
        title: "Product Lead",
        company: "Northstar",
        dates: "2023–Present",
        highlights: ["Led the product team."],
        url: null,
      },
    ],
    education: [],
    projects: [],
    skills: [{ category: "Product", items: ["Strategy"] }],
    certifications: [],
    stats: [{ value: "42%", label: "Growth" }],
    proofs: [
      {
        id: "proof-1",
        type: "case_study",
        title: "Launch case study",
        summary: "",
        outcome: "",
        url: null,
        source_label: null,
      },
    ],
    testimonials: [
      {
        id: "testimonial-1",
        name: "Jordan Lee",
        role: "VP Product",
        company: "Northstar",
        relationship: null,
        quote: "A focused and thoughtful partner.",
        status: "approved",
        requested_at: null,
        approved_at: null,
      },
    ],
  };
}

describe("getLivingPageSectionIds", () => {
  it("returns only rendered public chapters in layout order", () => {
    expect(getLivingPageSectionIds(buildResumeData())).toEqual([
      "summary",
      "stats",
      "proof",
      "testimonials",
      "experience",
      "skills",
    ]);
  });

  it("excludes incomplete proof and unapproved testimonial records", () => {
    const data = buildResumeData();
    data.proofs = [{ ...data.proofs![0], title: "" }];
    data.testimonials = [{ ...data.testimonials![0], status: "draft" }];

    expect(getLivingPageSectionIds(data)).toEqual([
      "summary",
      "stats",
      "experience",
      "skills",
    ]);
  });
});
