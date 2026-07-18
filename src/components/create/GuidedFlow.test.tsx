import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import GuidedFlow from "@/components/create/GuidedFlow";

describe("GuidedFlow", () => {
  it("shows imported data in one consolidated autofill review", () => {
    const markup = renderToStaticMarkup(
      <GuidedFlow
        consolidatedReview
        guidedData={{
          name: "Avery Morgan",
          headline: "Product leader",
          experience: [],
          education: [],
          projects: [],
          skills: [{ category: "General", items: ["Research", "Strategy"] }],
          certifications: [],
          stats: [],
        }}
        onUpdate={vi.fn()}
        onComplete={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(markup).toContain("Autofill review");
    expect(markup).toContain("Review what we found");
    expect(markup).toContain("Tell me about your experience");
    expect(markup).toContain("Skills and projects");
    expect(markup).toContain("Continue to theme and preview");
    expect(markup).not.toContain("1 of 6");
  });
});
