import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EditorSectionNav, { LIVING_PAGE_EDITOR_SECTIONS } from "./EditorSectionNav";

describe("EditorSectionNav", () => {
  it("links every editor stop in a sharp, accessible navigation region", () => {
    const markup = renderToStaticMarkup(
      <EditorSectionNav
        signalSectionIds={[
          "editor-section-setup",
          "editor-section-profile",
        ]}
      />,
    );

    expect(markup).toContain('aria-label="Editor sections"');
    expect(markup).toContain("data-editor-section-nav");
    expect(markup).toContain("Page map");
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain("Content present");
    expect(markup).toContain("No content yet");
    expect(markup).toContain("rounded-none");
    expect(markup).not.toContain("rounded-full");

    for (const section of LIVING_PAGE_EDITOR_SECTIONS) {
      expect(markup).toContain(`href="#${section.id}"`);
      expect(markup).toContain(section.label);
    }
  });
});
