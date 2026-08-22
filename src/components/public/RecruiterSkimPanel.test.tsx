import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecruiterSkimPanel from "@/components/public/RecruiterSkimPanel";
import type { ResumeData } from "@/types/resume";

const resumeData: ResumeData = {
  name: "Rachel Example",
  headline: "Staff Product Manager",
  location: "Portland, OR",
  email: "rachel@example.com",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "Product leader.",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
  stats: [],
};

function renderPanel() {
  return renderToStaticMarkup(
    <RecruiterSkimPanel
      pageId="page-1"
      publicPath="/rachel"
      resumeData={resumeData}
      variantLabel="Recruiter reply version"
      variantId="variant-1"
      collapsedChips={["12 Builds Shipped"]}
      roleHeading="Staff Product Leader"
      summary="Ships complex launches."
      featuredProject={null}
      ctaEmphasis={null}
    />,
  );
}

describe("RecruiterSkimPanel", () => {
  it("starts collapsed with a plain-language toggle at a 44px target", () => {
    const markup = renderPanel();

    expect(markup).toContain("Show the highlights");
    expect(markup).toContain("Recruiter view · owner curated");
    expect(markup).toContain("did not rewrite it automatically for this visit");
    expect(markup).toContain('href="/rachel"');
    expect(markup).toContain("Open the full page");
    expect(markup).not.toContain("recruiter skim</span>");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("min-h-11");
    expect(markup).toContain("focus-visible:outline-2");
    expect(markup).toContain("focus-visible:outline-[var(--theme-accent-bright)]");
  });

  it("keeps eyebrow type at the 12px floor and stays sharp", () => {
    const markup = renderPanel();

    expect(markup).toContain("text-xs uppercase tracking-[0.18em]");
    expect(markup).not.toContain("text-[10px]");
    expect(markup).toContain("rounded-none");
  });

  it("never renders a heading ahead of the page h1", () => {
    // The role heading is styled text, not an <h2>: the panel sits above
    // ResumeLayout's h1, so a real heading would break the outline order.
    expect(renderPanel()).not.toMatch(/<h[1-6]/);
  });
});
