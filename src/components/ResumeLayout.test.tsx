import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ResumeLayout from "@/components/ResumeLayout";
import type { ResumeData } from "@/types/resume";

const resume: ResumeData = {
  name: "Jane Smith",
  headline: "Product Counsel",
  location: "New York, NY",
  email: null,
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "Counsel focused on practical product guidance.",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  stats: [],
};

describe("ResumeLayout profile handle", () => {
  it("shows the real public slug when one is provided", () => {
    const markup = renderToStaticMarkup(
      <ResumeLayout data={resume} profileSlug="jane-law" compact />,
    );

    expect(markup).toContain("@jane-law");
    expect(markup).not.toContain("@janesmith");
  });

  it("keeps the name-derived fallback for fictional demos", () => {
    const markup = renderToStaticMarkup(<ResumeLayout data={resume} compact />);

    expect(markup).toContain("@janesmith");
  });
});
