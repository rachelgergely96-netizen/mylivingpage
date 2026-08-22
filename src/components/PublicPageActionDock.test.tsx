import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import PublicPageActionDock from "@/components/PublicPageActionDock";
import { MotionPreferenceContext } from "@/components/motion/MotionPreferenceProvider";
import type { ResumeData } from "@/types/resume";

const resumeData: ResumeData = {
  name: "Avery Morgan",
  headline: "Product leader",
  location: "New York, NY",
  email: "avery@example.com",
  linkedin: null,
  github: null,
  website: null,
  avatar_url: null,
  summary: "I build useful products.",
  experience: [],
  education: [],
  projects: [],
  skills: [{ category: "Product", items: ["Strategy"] }],
  certifications: [],
  stats: [],
  proofs: [],
  testimonials: [],
};

function renderDock(isOwner: boolean) {
  return renderToStaticMarkup(
    <MotionPreferenceContext.Provider
      value={{
        mode: "still",
        preference: "still",
        systemReducedMotion: true,
        setPreference: vi.fn(),
      }}
    >
      <PublicPageActionDock
        pageId="page-1"
        isOwner={isOwner}
        slug="avery"
        themeId="cosmic"
        resumeData={resumeData}
      />
    </MotionPreferenceContext.Provider>,
  );
}

describe("PublicPageActionDock", () => {
  it("keeps Contact visible beside an accessible collapsed More control", () => {
    const markup = renderDock(false);

    expect(markup).toContain("data-public-action-bar");
    expect(markup).toContain(">Contact</a>");
    expect(markup).toContain(">More</button>");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("aria-controls=");
    expect(markup).toContain("Download Résumé PDF");
    expect(markup).toContain('aria-label="Motion preference"');
  });

  it("preserves owner download, share, and motion actions", () => {
    const markup = renderDock(true);

    expect(markup).toContain("Download Résumé PDF");
    expect(markup).toContain("Share Avery’s page");
    expect(markup).toContain('aria-label="Motion preference"');
    expect(markup).not.toContain(">Contact</a>");
  });
});
