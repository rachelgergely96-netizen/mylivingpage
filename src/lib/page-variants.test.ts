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
      {
        name: "Intake IQ",
        description: "Client intake automation for legal operations teams.",
        tech: ["Supabase"],
        url: "intakeiq.dev",
      },
    ],
    skills: [{ category: "Core", items: ["Strategy"] }],
    certifications: [],
    stats: [
      { value: "41%", label: "engagement growth" },
      { value: "2", label: "products launched" },
      { value: "12", label: "client launches" },
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

  it("does not build a recruiter skim model for the base page", () => {
    const base = buildResumeData();

    expect(buildRecruiterSkimModel(base, null)).toBeNull();
  });

  it("treats an untouched default variant as non-qualifying", () => {
    const base = buildResumeData();
    const variant = createPageVariant(base, "Recruiter version");

    expect(buildRecruiterSkimModel(base, variant)).toBeNull();
  });

  it("builds a recruiter skim model only from changed recruiter framing", () => {
    const base = buildResumeData();
    const variant = {
      ...createPageVariant(base, "Recruiter version"),
      roleTitle: base.headline,
      headline: "Staff Product Manager",
      summary: "Product leader building clear systems for legal and product teams.",
      ctaEmphasis: "Open to product leadership roles",
    };

    const skim = buildRecruiterSkimModel(base, variant);

    expect(skim).toMatchObject({
      variantLabel: "Recruiter version",
      roleHeading: "Staff Product Manager",
      summary: "Product leader building clear systems for legal and product teams.",
      ctaEmphasis: "Open to product leadership roles",
      featuredProject: null,
    });
    expect(skim?.collapsedChips).toEqual(["Staff Product Manager", "Open to product leadership roles"]);
  });

  it("builds recruiter skim proof chips from targeted proof and featured work changes", () => {
    const base = buildResumeData();
    const variant = {
      ...createPageVariant(base, "Referral version"),
      roleTitle: base.headline,
      headline: base.headline,
      summary: base.summary,
      featuredStatLabels: ["client launches"],
      featuredProjectNames: ["Intake IQ"],
    };

    const skim = buildRecruiterSkimModel(base, variant);

    expect(skim).toMatchObject({
      roleHeading: null,
      summary: null,
      ctaEmphasis: null,
      featuredProject: {
        name: "Intake IQ",
      },
    });
    expect(skim?.collapsedChips).toEqual(["12 client launches", "Featured work: Intake IQ"]);
  });
});
