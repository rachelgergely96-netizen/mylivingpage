import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ResumeEditorFields from "@/components/resume/ResumeEditorFields";
import type { ResumeData } from "@/types/resume";

const SECTION_IDS = [
  "profile",
  "summary",
  "stats",
  "experience",
  "education",
  "skills",
  "projects",
  "proof",
  "testimonials",
  "certifications",
] as const;

function buildResumeData(): ResumeData {
  return {
    name: "Avery Morgan",
    headline: "Product leader",
    location: "New York, NY",
    email: "avery@example.com",
    linkedin: null,
    github: null,
    website: null,
    avatar_url: null,
    summary: "I build useful products.",
    stats: [{ value: "42%", label: "Growth" }],
    experience: [
      {
        title: "Product Lead",
        company: "Northstar",
        dates: "2023–Present",
        highlights: ["Led the product team."],
        url: null,
      },
    ],
    education: [{ degree: "BFA", school: "State University", year: "2018" }],
    skills: [{ category: "Product", items: ["Strategy"] }],
    projects: [
      {
        name: "Launch",
        description: "A focused launch.",
        tech: ["Research"],
        url: null,
      },
    ],
    proofs: [
      {
        id: "proof-1",
        type: "case_study",
        title: "Launch case study",
        summary: "The work.",
        outcome: "The outcome.",
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
    certifications: [{ name: "Product Strategy", issuer: "Institute", date: "2024" }],
  };
}

describe("ResumeEditorFields", () => {
  it("exposes stable, scroll-aware anchors for every Living Page editor section", () => {
    const markup = renderToStaticMarkup(
      <ResumeEditorFields data={buildResumeData()} onChange={vi.fn()} />,
    );

    let previousSectionIndex = -1;
    SECTION_IDS.forEach((sectionId) => {
      expect(markup).toContain(`id="editor-section-${sectionId}"`);
      expect(markup).toContain(`data-editor-section="${sectionId}"`);
      const sectionIndex = markup.indexOf(`id="editor-section-${sectionId}"`);
      expect(sectionIndex).toBeGreaterThan(previousSectionIndex);
      previousSectionIndex = sectionIndex;
    });
    expect(markup.match(/scroll-mt-24/g)).toHaveLength(SECTION_IDS.length);
    expect(markup.match(/xl:scroll-mt-72/g)).toHaveLength(SECTION_IDS.length);
  });

  it("labels repeated records and keeps compact rows mobile-first", () => {
    const markup = renderToStaticMarkup(
      <ResumeEditorFields data={buildResumeData()} onChange={vi.fn()} />,
    );

    [
      "Growth",
      "Product Lead · Northstar",
      "BFA",
      "Product",
      "Launch",
      "Launch case study",
      "Jordan Lee",
      "Product Strategy",
    ].forEach((label) => expect(markup).toContain(label));

    ["Intro", "Impact", "Voices", "Credentials"].forEach((label) =>
      expect(markup).toContain(label),
    );
    expect(markup).toContain("Headline · target role");
    expect(markup).toContain("Opening summary");
    // Testimonials offer a display switch, not an approval workflow.
    expect(markup).toContain("Show this quote on my page");
    expect(markup).not.toContain("Visibility &amp; request tracking");
    expect(markup).not.toContain("Requested · hidden");

    expect(markup).toContain("sm:grid-cols-[7rem_minmax(0,1fr)]");
    expect(
      markup.match(/sm:grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)_6rem\]/g),
    ).toHaveLength(2);
  });
});
