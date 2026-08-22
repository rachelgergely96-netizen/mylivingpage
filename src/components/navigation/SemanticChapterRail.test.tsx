import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SemanticChapterRail from "@/components/navigation/SemanticChapterRail";

const chapters = [
  { id: "first-real-section", label: "First section" },
  { id: "second-real-section", label: "Second section" },
] as const;

describe("SemanticChapterRail", () => {
  it("links to real IDs and waits for an interaction before emitting an event", () => {
    const markup = renderToStaticMarkup(
      <SemanticChapterRail items={chapters} ariaLabel="Article chapters" />,
    );

    expect(markup).toContain('aria-label="Article chapters"');
    expect(markup).toContain('href="#first-real-section"');
    expect(markup).toContain('href="#second-real-section"');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('data-motion-signal="career-chapters"');
    expect(markup).not.toContain("data-motion-event=");
  });

  it("does not render navigation for a single chapter", () => {
    expect(
      renderToStaticMarkup(
        <SemanticChapterRail items={[chapters[0]]} ariaLabel="Article chapters" />,
      ),
    ).toBe("");
  });
});
