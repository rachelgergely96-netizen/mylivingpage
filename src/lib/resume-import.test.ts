import { describe, expect, it } from "vitest";
import { parseResumeText } from "@/lib/resume-import";

const SAMPLE_RESUME = `
Taylor Reed
Senior Product Manager
Brooklyn, NY | taylor@example.com | linkedin.com/in/taylorreed | github.com/taylorreed

SUMMARY
Product leader focused on making complex workflows easier for customers and internal teams.

EXPERIENCE
Senior Product Manager
Acme Systems
Jan 2021 – Present
• Led a cross-functional launch that increased activation by 24%.
• Built the roadmap and measurement plan for a new onboarding flow.

Product Manager | Beta Co | 2018 - 2020
• Shipped self-serve reporting for 4,000 customers.

EDUCATION
B.S. in Information Science
Cornell University
2018

SKILLS
Product: Roadmapping, Customer Research, Experimentation
Tools: SQL, Figma, Amplitude

PROJECTS
Hiring signal dashboard
• Built a lightweight dashboard for tracking candidate funnel health.

CERTIFICATIONS
Certified Scrum Product Owner | Scrum Alliance | 2023
`;

describe("parseResumeText", () => {
  it("autofills structured fields from common resume sections", () => {
    const result = parseResumeText(SAMPLE_RESUME);

    expect(result.data).toMatchObject({
      name: "Taylor Reed",
      headline: "Senior Product Manager",
      location: "Brooklyn, NY",
      email: "taylor@example.com",
      linkedin: "https://linkedin.com/in/taylorreed",
      github: "https://github.com/taylorreed",
      summary:
        "Product leader focused on making complex workflows easier for customers and internal teams.",
    });
    expect(result.data.experience).toHaveLength(2);
    expect(result.data.experience[0]).toMatchObject({
      title: "Senior Product Manager",
      company: "Acme Systems",
      dates: "Jan 2021 – Present",
      highlights: [
        "Led a cross-functional launch that increased activation by 24%.",
        "Built the roadmap and measurement plan for a new onboarding flow.",
      ],
    });
    expect(result.data.education[0]).toEqual({
      degree: "B.S. in Information Science",
      school: "Cornell University",
      year: "2018",
    });
    expect(result.data.skills).toEqual([
      {
        category: "Product",
        items: ["Roadmapping", "Customer Research", "Experimentation"],
      },
      { category: "Tools", items: ["SQL", "Figma", "Amplitude"] },
    ]);
    expect(result.data.projects[0]).toMatchObject({
      name: "Hiring signal dashboard",
      description: "Built a lightweight dashboard for tracking candidate funnel health.",
    });
    expect(result.data.certifications[0]).toEqual({
      name: "Certified Scrum Product Owner",
      issuer: "Scrum Alliance",
      date: "2023",
    });
    expect(result.detectedFields).toEqual(
      expect.arrayContaining([
        "name",
        "headline",
        "location",
        "contact",
        "summary",
        "experience",
        "education",
        "skills",
        "projects",
        "certifications",
      ]),
    );
    expect(result.warnings).toEqual([]);
  });

  it("returns editable empty fields and useful warnings for sparse text", () => {
    const result = parseResumeText("Independent consultant available for new opportunities.");

    expect(result.data.headline).toBe(
      "Independent consultant available for new opportunities.",
    );
    expect(result.data.experience).toEqual([]);
    expect(result.data.education).toEqual([]);
    expect(result.warnings).toContain(
      "We could not confidently identify your name. Add it in the first step.",
    );
    expect(result.warnings).toContain(
      "Only a few fields were detected. Review the imported text and fill any gaps.",
    );
  });

  it("does not treat a project link as the candidate's personal website", () => {
    const result = parseResumeText(`Taylor Reed
Senior Product Manager
taylor@example.com

PROJECTS
Hiring dashboard | https://example.com/projects/hiring-dashboard
• Built a candidate-funnel reporting tool.`);

    expect(result.data.website).toBeNull();
    expect(result.data.projects[0]?.url).toBe(
      "https://example.com/projects/hiring-dashboard",
    );
  });
});
