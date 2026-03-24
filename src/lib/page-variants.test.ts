import { describe, expect, it } from "vitest";
import {
  applyPageVariant,
  buildRecruiterSkimModel,
  createPageVariant,
  getPageVariant,
} from "@/lib/page-variants";
import type { PageConfig, ResumeData } from "@/types/resume";

function buildResumeData(): ResumeData {
  return {
    name: "Rachel Gergely",
    headline: "Founder | Attorney | Product Architect",
    location: "New York, NY",
    email: "rachel@example.com",
    linkedin: "linkedin.com/in/rachel",
    github: null,
    website: "rachel.dev",
    avatar_url: null,
    summary: "Founder building clear systems for legal and product teams.",
    experience: [
      {
        title: "Founder",
        company: "MyLivingPage",
        dates: "2023-Present",
        highlights: ["Grew engagement by 41%", "Built the public product system"],
        url: null,
      },
    ],
    education: [],
    projects: [
      {
        name: "Caseflow",
        description: "Workflow system for legal teams.",
        tech: ["Next.js"],
        url: "caseflow.dev",
      },
    ],
    skills: [{ category: "Core", items: ["Strategy"] }],
    certifications: [],
    stats: [
      { value: "41%", label: "engagement growth" },
      { value: "2", label: "products launched" },
    ],
  };
}

describe("page variants", () => {
  it("applies targeted headline and prioritizes featured proof", () => {
    const base = buildResumeData();
    const variant = {
      ...createPageVariant(base, "Recruiter version"),
      headline: "Staff Product Manager",
      featuredStatLabels: ["2 products launched"],
      featuredProjectNames: ["Caseflow"],
    };

    const applied = applyPageVariant(base, variant);

    expect(applied.headline).toBe("Staff Product Manager");
    expect(applied.projects[0]?.name).toBe("Caseflow");
  });

  it("reads variants safely from page_config", () => {
    const base = buildResumeData();
    const variant = createPageVariant(base, "Referral version");
    const pageConfig: PageConfig = {
      variants: [variant],
    };

    expect(getPageVariant(pageConfig, variant.id)?.label).toBe("Referral version");
    expect(getPageVariant(pageConfig, "missing")).toBeNull();
  });

  it("builds a recruiter skim model from the targeted version", () => {
    const base = buildResumeData();
    const variant = {
      ...createPageVariant(base, "Recruiter version"),
      roleTitle: "Staff Product Manager",
      ctaEmphasis: "Open to product leadership roles",
    };

    const skim = buildRecruiterSkimModel(base, variant);

    expect(skim.fitHeading).toBe("Staff Product Manager");
    expect(skim.proofPoints.length).toBeGreaterThan(0);
    expect(skim.ctaEmphasis).toBe("Open to product leadership roles");
  });
});
