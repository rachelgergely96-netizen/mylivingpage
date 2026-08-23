import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SemanticChapterRail, {
  resolveChapterTransition,
} from "@/components/navigation/SemanticChapterRail";

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

  it("seeds a restored chapter without emitting, then emits each later transition once", () => {
    const restored = resolveChapterTransition(
      "first-real-section",
      "second-real-section",
      0,
      false,
    );
    expect(restored).toEqual({
      activeId: "second-real-section",
      sequence: 0,
      event: null,
    });

    const userTransition = resolveChapterTransition(
      restored?.activeId ?? "",
      "first-real-section",
      restored?.sequence ?? 0,
      true,
    );
    expect(userTransition).toEqual({
      activeId: "first-real-section",
      sequence: 1,
      event: { sequence: 1, target: "first-real-section" },
    });
    expect(
      resolveChapterTransition(
        userTransition?.activeId ?? "",
        "first-real-section",
        userTransition?.sequence ?? 0,
        true,
      ),
    ).toBeNull();
  });
});
