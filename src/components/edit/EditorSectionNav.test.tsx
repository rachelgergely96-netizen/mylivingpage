import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EditorSectionNav, { LIVING_PAGE_EDITOR_SECTIONS } from "./EditorSectionNav";

describe("EditorSectionNav", () => {
  it("links every editor stop in a sharp, accessible navigation region", () => {
    const markup = renderToStaticMarkup(<EditorSectionNav />);

    expect(markup).toContain('aria-label="Editor sections"');
    expect(markup).toContain("data-editor-section-nav");
    expect(markup).toContain("rounded-none");
    expect(markup).not.toContain("rounded-full");

    for (const section of LIVING_PAGE_EDITOR_SECTIONS) {
      expect(markup).toContain(`href="#${section.id}"`);
      expect(markup).toContain(section.label);
    }
  });
});
