import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumeLayout from "@/components/ResumeLayout";
import type { ResumeData } from "@/types/resume";

const privateData: ResumeData = {
  name: "Private Person",
  headline: "Confidential Role",
  location: "Private City",
  email: "private@example.invalid",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "Private summary",
  experience: [
    {
      title: "Private Title",
      company: "Private Company",
      dates: "2024 - Present",
      highlights: ["Private result"],
      url: null,
    },
  ],
  education: [
    { degree: "Private Degree", school: "Private School", year: "2020" },
  ],
  projects: [
    { name: "Private Project", description: "Private work", tech: [], url: null },
  ],
  skills: [{ category: "General", items: ["Private Skill"] }],
  certifications: [{ name: "Private Certification", issuer: null, date: null }],
  stats: [{ value: "10", label: "Private Metric" }],
};

describe("ResumeLayout privacy-safe data attributes", () => {
  it("keeps authored content visible while using identifier-only motion attributes", () => {
    const markup = renderToStaticMarkup(
      <ResumeLayout
        data={privateData}
        disableExternalLinks
        privacySafeDataAttributes
      />,
    );

    expect(markup).toContain("Private Company");
    expect(markup).toContain('data-motion-item="experience-0"');
    expect(markup).toContain('data-motion-item="project-0"');
    expect(markup).toContain('data-motion-item="education-0"');
    expect(markup).toContain('data-motion-item="skill-0-0"');
    expect(markup).not.toContain('data-motion-item="experience-Private');
    expect(markup).not.toContain('data-motion-item="project-Private');
    expect(markup).not.toContain('data-analytics-target-label="private');
  });
});
