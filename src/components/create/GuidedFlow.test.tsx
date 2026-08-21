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
        motionSequence={7}
        autofilledFields={["name", "headline", "experience", "skills", "projects"]}
      />,
    );

    expect(markup).toContain("Autofill review");
    expect(markup).toContain("Review what we found");
    expect(markup).toContain("Tell me about your experience");
    expect(markup).toContain("Skills and projects");
    expect(markup).toContain("Continue to theme and preview");
    expect(markup).not.toContain("1 of 6");
    expect(markup).toContain('data-motion-event="resume.import.review.required"');
    expect(markup).toContain('data-motion-signal="review-gate"');
    expect(markup).toContain('data-motion-state="review-required"');
    expect(markup).toContain('data-motion-sequence="7"');
    expect(markup).toContain('data-motion-target="autofilled-fields"');
    expect(markup).toContain('data-motion-event="resume.import.fact.detected"');
    expect(markup).toContain('data-motion-state="autofilled"');
    expect(markup).toContain('data-motion-target="name,headline"');
    expect(markup).toContain('data-motion-target="skills,projects"');
  });
});
